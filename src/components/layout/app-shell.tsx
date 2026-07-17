import Image from 'next/image';
import bannerImage from '../../../assets/banner.png';
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
  return (
    <main className="tm-app-shell">
      <div className="flex min-h-screen w-full flex-col">
        <div className={styles.bannerFrame}>
          <Image
            alt="Terraforming Mars Statistics"
            className={styles.bannerImage}
            height={793}
            priority
            sizes="100vw"
            src={bannerImage}
            width={1983}
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
