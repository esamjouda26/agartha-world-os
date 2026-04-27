import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFeedbackLocationName } from "@/features/marketing/queries/get-feedback-location";
import { getRecentFeedback } from "@/features/marketing/queries/get-recent-feedback";
import { FeedbackView } from "@/features/marketing/components/feedback-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Guest Feedback", description: "Capture guest feedback heard in passing." };
}

export default async function CrewFeedbackPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const [recentFeedback, autoLocationName] = await Promise.all([
    getRecentFeedback(supabase, user.id),
    getFeedbackLocationName(supabase, user.id),
  ]);

  return <FeedbackView initialFeedback={recentFeedback} autoLocationName={autoLocationName} />;
}
