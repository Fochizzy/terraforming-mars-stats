'use client';

import { useEffect } from 'react';
import styles from './insight-formatting-enhancer.module.css';

const confidenceThresholds = {
  high: 6,
  medium: 3,
} as const;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function confidenceForSample(sampleSize: number) {
  if (sampleSize >= confidenceThresholds.high) {
    return 'high';
  }

  if (sampleSize >= confidenceThresholds.medium) {
    return 'medium';
  }

  return 'low';
}

function confidenceClass(confidence: string) {
  if (confidence === 'high') {
    return styles.confidenceHigh;
  }

  if (confidence === 'medium') {
    return styles.confidenceMedium;
  }

  return styles.confidenceLow;
}

function findPanel(title: string) {
  const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2')).find(
    (candidate) => candidate.textContent?.trim().toLowerCase() === title.toLowerCase(),
  );

  return {
    heading: heading ?? null,
    panel: heading?.closest<HTMLElement>('.tm-panel') ?? null,
  };
}

function getPanelContent(panel: HTMLElement) {
  return (
    Array.from(panel.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'DIV',
    ) ?? null
  );
}

function buildInsightHighlight(body: string) {
  const normalized = body.replace(/\s+/g, ' ').trim();
  const winsInGames = normalized.match(
    /\b(\d+) wins? in (\d+) games? \((\d+)%\)/i,
  );

  if (winsInGames) {
    return `${winsInGames[1]} wins · ${winsInGames[3]}% win rate`;
  }

  const recordOverGames = normalized.match(
    /(?:is|:)\s+(\d+-\d+-\d+)\s+(?:across|over)\s+(\d+)\s+(?:finalized\s+)?games?/i,
  );

  if (recordOverGames) {
    return `${recordOverGames[1]} · ${recordOverGames[2]} games`;
  }

  const gamesThenRecord = normalized.match(
    /(?:at|over)\s+(\d+)\s+(?:finalized\s+)?games?,\s+with a\s+(\d+-\d+-\d+)\s+record/i,
  );

  if (gamesThenRecord) {
    return `${gamesThenRecord[2]} · ${gamesThenRecord[1]} games`;
  }

  const sample = normalized.match(
    /\b(\d+) finalized player results across (\d+) games?\b/i,
  );

  if (sample) {
    return `${sample[1]} results · ${sample[2]} games`;
  }

  const winRateAndGames = normalized.match(
    /\b(?:winning|wins?|with|has|at)\s+(?:a\s+)?(\d+)%[^.]*?\b(?:of|across|over)\s+(\d+)\s+(?:finalized\s+)?games?\b/i,
  );

  if (winRateAndGames) {
    return `${winRateAndGames[1]}% win rate · ${winRateAndGames[2]} games`;
  }

  const winRate = normalized.match(/\b(\d+)% win rate\b/i);

  if (winRate) {
    return `${winRate[1]}% win rate`;
  }

  const gameCount = normalized.match(/\b(\d+) (?:finalized |shared )?games?\b/i);

  return gameCount ? `${gameCount[1]} games analyzed` : null;
}

function addConfidenceBadge(
  container: HTMLElement,
  confidence: string,
  marker: string,
) {
  let badge = container.querySelector<HTMLElement>(`[data-${marker}-confidence]`);

  if (!badge) {
    badge = document.createElement('span');
    badge.dataset[`${marker}Confidence`] = 'true';
    container.prepend(badge);
  }

  badge.className = `${styles.badge} ${confidenceClass(confidence)}`;
  badge.textContent = `${capitalize(confidence)} confidence`;
}

function enhanceInsightCards() {
  const { heading, panel } = findPanel('Insight Cards');

  if (!heading || !panel) {
    return;
  }

  const caption = heading.nextElementSibling as HTMLElement | null;
  const content = getPanelContent(panel);
  const grid = content?.firstElementChild as HTMLElement | null;
  const cards = grid ? (Array.from(grid.children) as HTMLElement[]) : [];

  panel.classList.add(styles.panel);
  heading.classList.add(styles.title);
  caption?.classList.add(styles.caption);
  content?.classList.add(styles.content);
  grid?.classList.add(styles.grid);

  cards.forEach((card) => {
    const header = card.firstElementChild as HTMLElement | null;
    const title = header?.querySelector<HTMLElement>('h3') ?? null;
    const confidenceNode = header?.querySelector<HTMLElement>('p') ?? null;
    const directParagraphs = Array.from(card.children).filter(
      (child): child is HTMLParagraphElement => child instanceof HTMLParagraphElement,
    );
    const body =
      directParagraphs.find((paragraph) => paragraph.classList.contains('tm-muted-copy')) ??
      directParagraphs[0] ??
      null;
    const sampleNode =
      [...directParagraphs]
        .reverse()
        .find((paragraph) => /sample size/i.test(paragraph.textContent ?? '')) ?? null;

    card.classList.add(styles.card, styles.insightCard);
    header?.classList.add(styles.cardHeader);
    title?.classList.add(styles.cardTitle);
    body?.classList.add(styles.summary);

    if (header && confidenceNode) {
      let meta = header.querySelector<HTMLElement>('[data-insight-meta]');

      if (!meta) {
        meta = document.createElement('div');
        meta.dataset.insightMeta = 'true';
        header.append(meta);
      }

      meta.className = styles.meta;
      const confidence = confidenceNode.textContent?.trim().toLowerCase() ?? 'low';
      confidenceNode.className = `${styles.badge} ${confidenceClass(confidence)}`;
      confidenceNode.textContent = `${capitalize(confidence)} confidence`;
      meta.append(confidenceNode);

      if (sampleNode) {
        const sampleSize = Number(sampleNode.textContent?.match(/\d+/)?.[0] ?? 0);
        sampleNode.className = styles.badge;
        sampleNode.textContent = `n = ${sampleSize}`;
        meta.append(sampleNode);
      }
    }

    if (body && !card.querySelector('[data-insight-key-metric]')) {
      const highlight = buildInsightHighlight(body.textContent ?? '');

      if (highlight) {
        const keyMetric = document.createElement('p');
        keyMetric.className = styles.keyMetric;
        keyMetric.dataset.insightKeyMetric = 'true';
        keyMetric.textContent = highlight;
        body.before(keyMetric);
      }
    }
  });
}

function enhanceExpandedMetrics() {
  const { heading, panel } = findPanel('Expanded Individual Metrics');

  if (!heading || !panel) {
    return;
  }

  const caption = heading.nextElementSibling as HTMLElement | null;
  const content = getPanelContent(panel);
  const grid = content?.firstElementChild as HTMLElement | null;
  const cards = grid ? (Array.from(grid.children) as HTMLElement[]) : [];

  panel.classList.add(styles.panel);
  heading.classList.add(styles.title);
  caption?.classList.add(styles.caption);
  content?.classList.add(styles.content);
  grid?.classList.add(styles.grid);

  cards.forEach((card) => {
    const header = card.firstElementChild as HTMLElement | null;
    const title = header?.querySelector<HTMLElement>('h3') ?? null;
    const sampleNode = header?.querySelector<HTMLElement>('p') ?? null;
    const metricGrid = card.querySelector<HTMLElement>('dl');
    const directParagraphs = Array.from(card.children).filter(
      (child): child is HTMLParagraphElement => child instanceof HTMLParagraphElement,
    );
    const summary = directParagraphs[0] ?? null;
    const note = directParagraphs.at(-1) ?? null;
    const sampleSize = Number(sampleNode?.textContent?.match(/\d+/)?.[0] ?? 0);
    const confidence = confidenceForSample(sampleSize);

    card.classList.add(styles.card, styles.expandedCard);
    header?.classList.add(styles.cardHeader);
    title?.classList.add(styles.cardTitle);
    summary?.classList.add(styles.summary);
    note?.classList.add(styles.note);
    metricGrid?.classList.add(styles.metricGrid);

    if (header && sampleNode) {
      let meta = header.querySelector<HTMLElement>('[data-expanded-meta]');

      if (!meta) {
        meta = document.createElement('div');
        meta.dataset.expandedMeta = 'true';
        header.append(meta);
      }

      meta.className = styles.meta;
      sampleNode.className = styles.badge;
      sampleNode.textContent = `n = ${sampleSize}`;
      meta.append(sampleNode);
      addConfidenceBadge(meta, confidence, 'expanded');
    }

    metricGrid
      ?.querySelectorAll<HTMLElement>(':scope > div')
      .forEach((metricTile) => {
        const label = metricTile.querySelector<HTMLElement>('dt');
        const values = metricTile.querySelectorAll<HTMLElement>('dd');
        const value = values[0] ?? null;
        const detail = values[1] ?? null;

        metricTile.classList.add(styles.metricTile);
        label?.classList.add(styles.metricLabel);
        value?.classList.add(styles.metricValue);
        detail?.classList.add(styles.metricDetail);
      });
  });
}

function enhanceInsightFormatting() {
  enhanceInsightCards();
  enhanceExpandedMetrics();
}

export function InsightFormattingEnhancer() {
  useEffect(() => {
    enhanceInsightFormatting();
  }, []);

  return null;
}
