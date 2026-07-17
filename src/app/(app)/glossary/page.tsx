import { AppShell } from '@/components/layout/app-shell';
import { GlossaryContent } from '@/features/glossary/glossary-content';
import { pageMetadata } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/glossary');

export default function GlossaryPage() {
  return (
    <AppShell hasActiveGroup={false} title="Glossary">
      <GlossaryContent />
    </AppShell>
  );
}
