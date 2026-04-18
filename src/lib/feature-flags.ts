import { env } from "@/lib/env";

type FlagKey = `feature.${string}.${string}`;

export async function isFeatureEnabled(flag: FlagKey, distinctId: string): Promise<boolean> {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return false;
  }

  try {
    const { PostHog } = await import("posthog-node");
    const client = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    });
    const value = await client.isFeatureEnabled(flag, distinctId);
    await client.shutdown();
    return value === true;
  } catch (error) {
    console.error("[feature-flags] lookup failed, defaulting to false:", error);
    return false;
  }
}
