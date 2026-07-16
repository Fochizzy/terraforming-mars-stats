import { redirect } from 'next/navigation';

export default function LegacyGroupInsightsPage() {
  redirect('/insights?scope=group');
}
