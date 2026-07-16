'use client';

import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { InsightsDashboard } from './insights-dashboard';

type InsightsDashboardWithScoreIconsProps = ComponentProps<typeof InsightsDashboard>;

const scoreIconFiles: Record<string, string> = {
  'Terraform Rating': 'Terraform_Rating.png',
  'Card Points': 'Card_Points.png',
  'Other Card': 'Other_Card.png',
  Greenery: 'Greenery.png',
  Milestones: 'Milestones.png',
  Awards: 'Awards.png',
  Jovian: 'Jovian.png',
  Microbe: 'Microbe.png',
  Animal: 'Animal.png',
};

function ScoreProfileIconEnhancer() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient({ detectSessionInUrl: false });
    const iconUrls = Object.fromEntries(
      Object.entries(scoreIconFiles).map(([label, filename]) => {
        const { data } = supabase.storage.from('tm-score-icons').getPublicUrl(filename);
        return [label, data.publicUrl];
      }),
    ) as Record<string, string>;

    const enhanceScoreProfileChart = () => {
      document.querySelectorAll<HTMLElement>('section.tm-panel').forEach((section) => {
        const title = section.querySelector('h2')?.textContent?.trim() ?? '';
        if (title !== 'Group Score Profile' && !title.startsWith('Score Profile for ')) {
          return;
        }

        const chart = section.querySelector<SVGSVGElement>('svg.recharts-surface');
        if (!chart) {
          return;
        }

        chart.style.overflow = 'visible';

        chart
          .querySelectorAll<SVGGElement>('.recharts-yAxis .recharts-cartesian-axis-tick')
          .forEach((tick) => {
            const text = tick.querySelector<SVGTextElement>('text');
            const label = text?.textContent?.trim() ?? '';
            const iconUrl = iconUrls[label];

            if (!text || !iconUrl || tick.querySelector(`[data-score-icon="${label}"]`)) {
              return;
            }

            const textX = Number(text.getAttribute('x') ?? 40);
            const textY = Number(text.getAttribute('y') ?? 0);
            const image = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'image',
            );

            image.setAttribute('href', iconUrl);
            image.setAttribute('x', String(Math.max(2, textX - 38)));
            image.setAttribute('y', String(textY - 13));
            image.setAttribute('width', '26');
            image.setAttribute('height', '26');
            image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            image.setAttribute('aria-label', `${label} scoring icon`);
            image.dataset.scoreIcon = label;

            tick.insertBefore(image, text);
          });
      });
    };

    enhanceScoreProfileChart();

    const observer = new MutationObserver(enhanceScoreProfileChart);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

export function InsightsDashboardWithScoreIcons(
  props: InsightsDashboardWithScoreIconsProps,
) {
  return (
    <>
      <ScoreProfileIconEnhancer />
      <InsightsDashboard {...props} />
    </>
  );
}
