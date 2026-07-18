import type { CSSProperties, ReactNode } from 'react';
import { resolveLogGameBackgroundAsset } from '@/lib/assets';
import styles from './layout.module.css';

const localBackgroundPath =
  '/site-assets/log-game-mars-horizon-f78061b5.png';

export default function LogGameLayout({ children }: { children: ReactNode }) {
  const background = resolveLogGameBackgroundAsset();
  const backgroundLayers = [
    'linear-gradient(180deg, rgba(5, 6, 8, 0.3), rgba(5, 6, 8, 0.6))',
    background.status === 'available' ? `url("${background.url}")` : null,
    `url("${localBackgroundPath}")`,
  ]
    .filter((layer): layer is string => layer !== null)
    .join(', ');

  return (
    <div className={styles.root}>
      <div
        aria-hidden="true"
        className={styles.background}
        data-testid="log-game-background"
        style={{ backgroundImage: backgroundLayers } satisfies CSSProperties}
      />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
