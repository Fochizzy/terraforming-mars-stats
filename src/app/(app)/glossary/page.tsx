import { AppShell } from '@/components/layout/app-shell';
import { GlossaryContent } from '@/features/glossary/glossary-content';

export default function GlossaryPage() {
  return (
    <AppShell title="Glossary">
      <GlossaryContent />
    </AppShell>
  );
}
