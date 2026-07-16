import { redirect } from 'next/navigation';

export default function LegacyIndividualInsightsPage() {
  redirect('/insights?scope=individual');
}
