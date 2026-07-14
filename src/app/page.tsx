import Image from 'next/image';
import Link from 'next/link';
import { LandingSectionList } from './landing-section-list';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import {
  emptyPublicLandingStats,
  getPublicLandingStats,
  type PublicLandingStats,
} from '@/lib/db/public-landing-stats-repo';

async function loadLandingStatsOrDefault(): Promise<PublicLandingStats> {
  try {
    return await getPublicLandingStats();
  } catch (error) {
    console.error('[landing] Failed to load public landing stats', error);
    return emptyPublicLandingStats;
  }
}

export default async function HomePage() {
  const stats = await loadLandingStatsOrDefault();

  return (
    <main className="tm-app-shell tm-landing-page">
      <section className="tm-landing-hero-shell">
        <h1 className="sr-only">Terraforming Mars Stats</h1>
        <div className="tm-landing-hero-block">
          <div className="tm-landing-hero-module">
            <div className="tm-landing-banner-frame tm-landing-banner-frame--cropped">
              <Image
                alt="Terraforming Mars Statistics"
                className="tm-landing-banner-image"
                height={793}
                priority
                src="/banner.png"
                unoptimized
                width={1983}
              />
            </div>
          </div>
        </div>
        <p className="tm-body-copy tm-landing-hero-copy">
          <GlossaryRichText>
            {"Log finished games, compare corporations and preludes, and see how your group's meta changes over time."}
          </GlossaryRichText>
        </p>
        <Link
          className="tm-button-primary tm-landing-hero-cta"
          href="/login"
        >
          Sign in to your group
        </Link>
      </section>
      <LandingSectionList stats={stats} />
    </main>
  );
}
