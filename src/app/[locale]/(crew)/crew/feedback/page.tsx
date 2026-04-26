import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrewPageHeader } from "@/components/shared/crew-page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const recentFeedback = await getRecentFeedback(supabase, user.id);

  return (
    <div className="flex h-full flex-col" data-testid="feedback-page">
      <CrewPageHeader title="Guest Feedback" subtitle="Capture what guests are saying in passing" />
      <div className="flex-1 overflow-y-auto">
        <FeedbackView initialFeedback={recentFeedback} />
      </div>
    </div>
  );
}
