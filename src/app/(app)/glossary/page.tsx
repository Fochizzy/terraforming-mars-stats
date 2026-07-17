import { AppShell } from '@/components/layout/app-shell';
import { GlossaryContent } from '@/features/glossary/glossary-content';

export default function GlossaryPage() {
  return (
    <AppShell hasActiveGroup={false} title="Glossary">
      <GlossaryContent />
    </AppShell>
  );
}
