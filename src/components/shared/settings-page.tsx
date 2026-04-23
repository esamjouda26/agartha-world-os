import { PageHeader } from "@/components/ui/page-header";

import { SettingsForm } from "@/features/settings/components/settings-form";

/**
 * Shared `SettingsPage` — Universal Pattern C
 * ([ADR-0007](../../../docs/adr/0007-universal-pattern-c.md)).
 *
 * Receives the resolved user context as an explicit prop. Never reads the
 * JWT or touches Supabase itself — every portal wrapper
 * (`/admin/settings`, `/management/settings`, `/crew/settings`) resolves
 * identity server-side via `resolveSettingsUser()` and injects it here.
 *
 * Spec anchor: frontend_spec.md §6 · SettingsPage / lines 3783-3807.
 * `display_name` is read-only per the project's permission policy — only
 * avatar (via `rpc_update_own_avatar`) and theme (client-side) are mutable.
 */

export interface SettingsPageProps {
  /** Resolved by the route wrapper — see `resolveSettingsUser()`. */
  user: Readonly<{
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    employeeId: string | null;
  }>;
}

export function SettingsPage({ user }: Readonly<SettingsPageProps>) {
  return (
    <div className="flex flex-col gap-6" data-testid="settings-page">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile and appearance preferences."
        data-testid="settings-page-header"
      />
      <SettingsForm user={user} />
    </div>
  );
}
