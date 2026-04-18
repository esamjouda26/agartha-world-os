import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * generate-report — Thin orchestration Edge Function
 *
 * All SQL logic lives in PL/pgSQL sub-functions dispatched via
 * public.execute_report(p_report_type, p_params). This function handles:
 *   1. Auth (JWT or CRON_SECRET)
 *   2. Report config resolution (from `reports` table or inline)
 *   3. Execution record lifecycle (processing → completed/failed)
 *   4. CSV conversion + Storage upload
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 */

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

interface ReportRequest {
  report_id?: string;
  report_type?: string;
  parameters?: Record<string, unknown>;
}

interface ReportConfig {
  report_type: string;
  parameters: Record<string, unknown>;
  export_format: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Parse request ──────────────────────────────────────────────────────

  let body: ReportRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // ── Resolve report config ──────────────────────────────────────────────

  let config: ReportConfig;
  let reportId: string | undefined = body.report_id;

  if (body.report_id) {
    const { data: report, error: fetchErr } = await admin
      .from("reports")
      .select("report_type, parameters, export_format")
      .eq("id", body.report_id)
      .single();

    if (fetchErr || !report) {
      return jsonResponse({ error: "Report config not found" }, 404);
    }

    config = {
      report_type: report.report_type,
      parameters: { ...report.parameters, ...(body.parameters || {}) },
      export_format: report.export_format,
    };
  } else if (body.report_type) {
    config = {
      report_type: body.report_type,
      parameters: body.parameters || {},
      export_format: "csv",
    };
  } else {
    return jsonResponse(
      { error: "Either report_id or report_type is required" },
      400
    );
  }

  // ── Resolve caller ─────────────────────────────────────────────────────

  let callerId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (
    authHeader &&
    !authHeader.includes(Deno.env.get("CRON_SECRET") || "__none__")
  ) {
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await admin.auth.getUser(token);
    if (user) callerId = user.id;
  }

  // ── Ensure report config row exists (for traceability) ─────────────────

  if (!reportId) {
    const { data: newReport, error: createReportErr } = await admin
      .from("reports")
      .insert({
        report_type: config.report_type,
        parameters: config.parameters,
        export_format: config.export_format,
        created_by: callerId,
      })
      .select("id")
      .single();

    if (createReportErr || !newReport) {
      return jsonResponse({ error: "Failed to create report config" }, 500);
    }
    reportId = newReport.id;
  }

  // ── Create execution record ────────────────────────────────────────────

  const { data: execution, error: execErr } = await admin
    .from("report_executions")
    .insert({
      report_id: reportId,
      status: "processing",
      created_by: callerId,
    })
    .select("id")
    .single();

  if (execErr || !execution) {
    return jsonResponse({ error: "Failed to create execution record" }, 500);
  }

  const executionId = execution.id;

  // ── Execute via PL/pgSQL dispatcher ────────────────────────────────────

  try {
    const { data: resultRows, error: queryErr } = await admin.rpc(
      "execute_report",
      {
        p_report_type: config.report_type,
        p_params: config.parameters,
      }
    );

    if (queryErr) {
      throw new Error(`Query execution failed: ${queryErr.message}`);
    }

    const rows: Record<string, unknown>[] =
      typeof resultRows === "string"
        ? JSON.parse(resultRows)
        : resultRows || [];

    // ── Generate CSV ───────────────────────────────────────────────────

    const csv = toCsv(rows);
    const rowCount = rows.length;

    // ── Upload to Storage ──────────────────────────────────────────────

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${config.report_type}/${timestamp}.csv`;

    const { error: uploadErr } = await admin.storage
      .from("reports")
      .upload(fileName, csv, { contentType: "text/csv", upsert: false });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    const { data: urlData } = await admin.storage
      .from("reports")
      .createSignedUrl(fileName, 7 * 24 * 60 * 60);

    const fileUrl = urlData?.signedUrl || fileName;

    // ── Update execution: completed ──────────────────────────────────

    await admin
      .from("report_executions")
      .update({
        status: "completed",
        row_count: rowCount,
        file_url: fileUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    console.log(
      `[generate-report] ${config.report_type} completed — ${rowCount} rows`
    );

    // ── Email scheduled report recipients ─────────────────────────────
    // If this report has scheduled recipients, send them the download link.

    if (reportId) {
      const { data: reportMeta } = await admin
        .from("reports")
        .select("recipients, schedule_cron, is_active")
        .eq("id", reportId)
        .single();

      if (
        reportMeta?.recipients &&
        Array.isArray(reportMeta.recipients) &&
        reportMeta.recipients.length > 0 &&
        reportMeta.schedule_cron &&
        reportMeta.is_active
      ) {
        for (const recipientEmail of reportMeta.recipients) {
          try {
            await admin.functions.invoke("send-email", {
              body: {
                type: "report_ready",
                recipient_email: recipientEmail as string,
                report_type: config.report_type,
                row_count: rowCount,
                file_url: fileUrl,
              },
            });
          } catch (emailErr) {
            console.error(
              `[generate-report] Failed to email ${recipientEmail}:`,
              emailErr
            );
          }
        }
        console.log(
          `[generate-report] Emailed ${reportMeta.recipients.length} recipients`
        );
      }
    }

    return jsonResponse({
      execution_id: executionId,
      report_type: config.report_type,
      status: "completed",
      row_count: rowCount,
      file_url: fileUrl,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await admin
      .from("report_executions")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    console.error(
      `[generate-report] ${config.report_type} FAILED:`,
      errorMessage
    );

    return jsonResponse(
      {
        execution_id: executionId,
        report_type: config.report_type,
        status: "failed",
        error: errorMessage,
      },
      500
    );
  }
});
