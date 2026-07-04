import { redirect } from 'next/navigation';
import {
  getCurrentGroupContext,
  type CurrentGroupContext,
} from '@/lib/db/group-context-repo';

export async function requireGroupContextOrRedirect(): Promise<CurrentGroupContext> {
  const context = await getCurrentGroupContext();

  if (!context) {
    redirect('/log-game/import');
  }

  return context;
}
