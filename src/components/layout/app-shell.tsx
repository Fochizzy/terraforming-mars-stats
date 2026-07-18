import Image from 'next/image';
import { resolveStaticSiteAsset } from '@/lib/assets';
import { AppNavigation } from '@/components/navigation/app-navigation';
import styles from './app-shell.module.css';

export function AppShell({
  title,
  children,
  headerActions,
  hasActiveGroup = false,
}: {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  hasActiveGroup?: boolean;
}) {
  const banner = resolveStaticSiteAsset('application-banner');

  return (
    <main className="tm-app-shell">
      <div className="flex min-h-screen w-full flex-col">
        <div className={styles.bannerFrame}>
          <Image
            alt={banner.alt}
            className={styles.bannerImage}
            height={banner.height}
            priority
            sizes="100vw"
            src={banner.url}
            width={banner.width}
          />
        </div>

        <AppNavigation hasActiveGroup={hasActiveGroup} />

        <header className="tm-app-header">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="tm-display-eyebrow text-[11px]">
                Terraforming Mars Stats
              </p>
              <h1 className="tm-display-title mt-2 text-2xl font-bold">{title}</h1>
            </div>
            {headerActions}
          </div>
        </header>
        <section className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          {children}
        </section>
      </div>
    </main>
  );
}
