import { AppShell } from '@/components/layout/app-shell';
import { GlossaryContent } from '@/features/glossary/glossary-content';

export default function GlossaryPage() {
  return (
    <AppShell showReviewSavedGamesLink title="Glossary" wide>
      <GlossaryContent />
    </AppShell>
  );
}
