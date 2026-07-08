import Image from 'next/image';
import Link from 'next/link';
import bannerImage from '../../assets/banner.png';

const homepageSections = [
  {
    id: 'overview',
    title: 'Overview',
    description:
      "Track finished games, expansion mixes, maps, winners, and your group's shifting meta in one place.",
    highlights: ['Finished games', 'Player rosters', 'Meta snapshots'],
  },
  {
    id: 'corporations',
    title: 'Corporations',
    description:
      'Compare corporation results, favorite picks, and the matchups that keep showing up at your table.',
    highlights: ['Win rates', 'Favorite picks', 'Table trends'],
  },
  {
    id: 'cards',
    title: 'Cards',
    description:
      'Explore imported card evidence, pattern-heavy plays, and the engines that keep deciding close games.',
    highlights: ['Imported evidence', 'Key cards', 'Engine patterns'],
  },
  {
    id: 'projects',
    title: 'Projects',
    description:
      'Jump from clean game logging into saved drafts, reopened results, and shared group workflows.',
    highlights: ['Draft saves', 'Result edits', 'Group logging'],
  },
  {
    id: 'milestones',
    title: 'Milestones',
    description:
      'See who closes maps best with milestone timing, award pressure, and map-aware scoring swings.',
    highlights: ['Map-aware awards', 'Milestone timing', 'Scoring swings'],
  },
  {
    id: 'stats',
    title: 'Stats',
    description:
      'Read score trends, leaderboard movement, and long-term group patterns without leaving the theme.',
    highlights: ['Trend lines', 'Leaderboards', 'Group patterns'],
  },
  {
    id: 'tools',
    title: 'Tools',
    description:
      'Use imports, roster tools, and admin helpers that make the app practical for a recurring play group.',
    highlights: ['Imports', 'Roster tools', 'Group settings'],
  },
] as const;

export default function HomePage() {
  return (
    <main className="tm-app-shell tm-landing-page">
      <section className="tm-landing-hero-shell">
        <h1 className="sr-only">Terraforming Mars Stats</h1>
        <div className="tm-landing-hero-module">
          <div className="tm-landing-banner-frame">
            <Image
              alt="Terraforming Mars Statistics"
              className="tm-landing-banner-image"
              height={1080}
              priority
              src={bannerImage}
              unoptimized
              width={1920}
            />
          </div>
          <nav
            aria-label="Homepage sections"
            className="tm-landing-tab-strip"
          >
            {homepageSections.map((section) => (
              <a
                key={section.id}
                className="tm-landing-tab-link"
                href={`#${section.id}`}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
        <p className="tm-body-copy tm-landing-hero-copy">
          Log finished games, compare corporations and preludes, and see how your
          group&apos;s meta changes over time.
        </p>
        <Link
          className="tm-button-primary tm-landing-hero-cta"
          href="/login"
        >
          Sign in to your group
        </Link>
      </section>
      <section className="tm-landing-section-list">
        {homepageSections.map((section) => (
          <section
            id={section.id}
            key={section.id}
            className="tm-panel tm-landing-section-card"
          >
            <p className="tm-display-eyebrow">Mission Control</p>
            <h2 className="tm-display-title tm-landing-section-title">
              {section.title}
            </h2>
            <p className="tm-body-copy tm-landing-section-copy">
              {section.description}
            </p>
            <div className="tm-landing-highlight-row">
              {section.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="tm-landing-highlight-chip"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
