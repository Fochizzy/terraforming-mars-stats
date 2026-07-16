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

function ScoreProfileEnhancer() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient({ detectSessionInUrl: false });
    const iconUrls = Object.fromEntries(
      Object.entries(scoreIconFiles).map(([label, filename]) => {
        const { data } = supabase.storage.from('tm-score-icons').getPublicUrl(filename);
        return [label, data.publicUrl];
      }),
    ) as Record<string, string>;

    const enhance = () => {
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

        const rows: Array<{ label: string; value: number }> = [];
        chart
          .querySelectorAll<SVGGElement>('.recharts-yAxis .recharts-cartesian-axis-tick')
          .forEach((tick) => {
            const text = tick.querySelector<SVGTextElement>('text');
            const label = text?.textContent?.trim() ?? '';
            const iconUrl = iconUrls[label];

            if (!text || !label) {
              return;
            }

            const y = Number(text.getAttribute('y') ?? 0);
            const matchingBar = Array.from(
              chart.querySelectorAll<SVGRectElement>('.recharts-bar-rectangle path, .recharts-bar-rectangle rect'),
            ).find((bar) => {
              const barY = Number(bar.getAttribute('y') ?? 0);
              const barHeight = Number(bar.getAttribute('height') ?? 0);
              return y >= barY && y <= barY + barHeight + 4;
            });

            const value = matchingBar ? Number(matchingBar.getAttribute('width') ?? 0) : 0;
            rows.push({ label, value });

            if (!iconUrl || tick.querySelector(`[data-score-icon="${label}"]`)) {
              return;
            }

            const textX = Number(text.getAttribute('x') ?? 40);
            const textY = Number(text.getAttribute('y') ?? 0);
            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
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

        const content = section.querySelector<HTMLElement>(':scope > div.mt-4');
        const chartWrapper = content?.firstElementChild as HTMLElement | null;
        if (!content || !chartWrapper || content.querySelector('[data-score-summary]')) {
          return;
        }

        content.classList.add('grid', 'gap-6', 'lg:grid-cols-[minmax(420px,700px)_minmax(260px,1fr)]');
        chartWrapper.classList.add('min-w-0');

        const summary = document.createElement('aside');
        summary.dataset.scoreSummary = 'true';
        summary.className = 'rounded-2xl border border-orange-400/20 bg-stone-950/35 p-5';

        const sorted = rows.slice().sort((a, b) => b.value - a.value);
        const leader = sorted[0]?.label ?? 'No category';
        const runnerUp = sorted[1]?.label ?? 'No category';

        summary.innerHTML = `
          <p class="text-xs uppercase tracking-[0.2em] text-orange-300">Score summary</p>
          <h3 class="mt-3 text-lg font-semibold text-stone-100">Most points come from ${leader}</h3>
          <p class="mt-2 text-sm leading-6 text-stone-300">${runnerUp} is the next-largest contributor. The remaining categories make up a smaller share of the average final score.</p>
          <div class="mt-5 grid gap-3">
            ${sorted.slice(0, 3).map((row, index) => `
              <div class="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/70 px-3 py-2">
                <span class="text-sm text-stone-300">${index + 1}. ${row.label}</span>
                <span class="text-sm font-semibold text-cyan-200">Top ${index + 1}</span>
              </div>
            `).join('')}
          </div>
        `;

        content.appendChild(summary);
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
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
      <ScoreProfileEnhancer />
      <InsightsDashboard {...props} />
    </>
  );
}
