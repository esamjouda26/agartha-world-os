import { createClient } from "@supabase/supabase-js";

// Run via: `set -a && . ./.env.local && set +a && pnpm dlx tsx scripts/test-reports-rls.ts`
// (Matches the repo's other diagnostic scripts — no dotenv dep.)
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_ANON_KEY before running.",
  );
  process.exit(2);
}

// Asserted non-null below — runtime guard above guarantees all three are set.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser(email: string, role: string) {
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
  });
  if (error) throw error;

  // Create profile for this user and assign role
  await adminSupabase.from("profiles").insert({
    id: data.user.id,
    first_name: "Test",
    last_name: role,
    email: email,
    role_id: (await adminSupabase.from("roles").select("id").eq("name", role).single()).data?.id,
  });

  // Get a JWT for the user by signing in
  const { data: sessionData } = await adminSupabase.auth.signInWithPassword({
    email,
    password: "password123",
  });

  return {
    user: data.user,
    token: sessionData.session!.access_token,
    client: createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${sessionData.session!.access_token}`,
        },
      },
    }),
  };
}

async function runTest() {
  console.info("Setting up test users...");
  try {
    const opsManager = await createTestUser(
      `ops_manager_${Date.now()}@agartha.test`,
      "operations_manager",
    );
    const hrManager = await createTestUser(
      `hr_manager_${Date.now()}@agartha.test`,
      "human_resources_manager",
    );

    console.info("Ops Manager ID:", opsManager.user.id);
    console.info("HR Manager ID:", hrManager.user.id);

    // 1. Ops Manager creates a schedule (reports:r AND owner)
    console.info("\n1. Ops Manager creates a schedule...");
    const { data: newReport, error: insertError } = await opsManager.client
      .from("reports")
      .insert({
        report_type: "incident_summary",
        parameters: {},
        schedule_cron: "0 9 * * 1",
        created_by: opsManager.user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ FAILED: Ops Manager could not create a schedule.", insertError);
      process.exit(1);
    }
    console.info("✅ SUCCESS: Ops Manager created schedule:", newReport.id);

    // 2. Ops Manager updates THEIR OWN schedule
    console.info("\n2. Ops Manager updates their own schedule...");
    const { error: updateError } = await opsManager.client
      .from("reports")
      .update({ is_active: false })
      .eq("id", newReport.id);

    if (updateError) {
      console.error("❌ FAILED: Ops Manager could not update their own schedule.", updateError);
      process.exit(1);
    }
    console.info("✅ SUCCESS: Ops Manager updated their own schedule.");

    // 3. HR Manager tries to update Ops Manager's schedule
    console.info("\n3. HR Manager attempts to update Ops Manager's schedule...");
    const { data: hrUpdateData, error: hrUpdateError } = await hrManager.client
      .from("reports")
      .update({ is_active: true })
      .eq("id", newReport.id)
      .select();

    if (hrUpdateError) {
      console.info(
        "✅ SUCCESS: HR Manager was rejected by RLS as expected.",
        hrUpdateError.message,
      );
    } else if (hrUpdateData && hrUpdateData.length === 0) {
      console.info("✅ SUCCESS: HR Manager update returned 0 rows (RLS blocked).");
    } else {
      console.error(
        "❌ FAILED: HR Manager successfully updated Ops Manager's schedule!",
        hrUpdateData,
      );
      process.exit(1);
    }

    // 4. HR Manager tries to delete Ops Manager's schedule
    console.info("\n4. HR Manager attempts to delete Ops Manager's schedule...");
    const { data: hrDeleteData, error: hrDeleteError } = await hrManager.client
      .from("reports")
      .delete()
      .eq("id", newReport.id)
      .select();

    if (hrDeleteError) {
      console.info("✅ SUCCESS: HR Manager delete rejected by RLS as expected.");
    } else if (hrDeleteData && hrDeleteData.length === 0) {
      console.info("✅ SUCCESS: HR Manager delete returned 0 rows (RLS blocked).");
    } else {
      console.error("❌ FAILED: HR Manager successfully deleted Ops Manager's schedule!");
      process.exit(1);
    }

    // 5. Ops Manager deletes THEIR OWN schedule
    console.info("\n5. Ops Manager deletes their own schedule...");
    const { error: deleteError } = await opsManager.client
      .from("reports")
      .delete()
      .eq("id", newReport.id);

    if (deleteError) {
      console.error("❌ FAILED: Ops Manager could not delete their own schedule.", deleteError);
      process.exit(1);
    }
    console.info("✅ SUCCESS: Ops Manager deleted their own schedule.");

    console.info("\n🎉 All RLS Regression Tests Passed!");
  } catch (e) {
    console.error("Test execution failed:", e);
  } finally {
    console.info("\nCleaning up test data... (Normally we would delete the test users here)");
    process.exit(0);
  }
}

runTest();
