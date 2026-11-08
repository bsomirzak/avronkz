import { DocsShell } from "@/components/docs/DocsShell";
import { SettingsEditor } from "@/components/docs/SettingsEditor";
import { getSettings } from "@/lib/docs/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return (
    <DocsShell title="Ставки и тексты" current="/admin/docs/settings">
      <SettingsEditor initial={await getSettings()} />
    </DocsShell>
  );
}
