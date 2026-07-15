'use client';

import { useEffect } from 'react';
import styles from './play-analysis-enhancer.module.css';

const metricPattern =
  /\b\d+(?:\.\d+)?%\s+(?:win rate|of finalized games|of inferred-style games|of the stronger-table sample)|\b\d+(?:\.\d+)?%|[+−-]?\d+(?:\.\d+)?(?:-point|\s+(?:objective\s+)?points?|\s+pts)(?:\s+per generation)?|\b\d+(?:\.\d+)?\s+standard deviation|\b\d+(?:\.\d+)?\s+more than\s+non-wins|\b\d+\s+(?:wins?|non-wins?|finalized games?|games?|attributed removals?)|\b\d+-\d+-\d+\b/gi;

function wrapMetrics(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;

      if (
        !node.textContent?.trim() ||
        parent?.closest(`.${styles.metric}`) ||
        parent?.closest('a, button')
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      metricPattern.lastIndex = 0;
      return metricPattern.test(node.textContent)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    nodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  nodes.forEach((node) => {
    const text = node.textContent ?? '';
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    metricPattern.lastIndex = 0;
    for (const match of text.matchAll(metricPattern)) {
      const index = match.index ?? 0;

      if (index > lastIndex) {
        fragment.append(text.slice(lastIndex, index));
      }

      const metric = document.createElement('span');
      metric.className = styles.metric;
      metric.textContent = match[0];
      fragment.append(metric);
      lastIndex = index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.append(text.slice(lastIndex));
    }

    node.replaceWith(fragment);
  });
}

function enhancePlayAnalysis() {
  const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2')).find(
    (candidate) => candidate.textContent?.trim().toLowerCase() === 'play analysis',
  );
  const panel = heading?.closest<HTMLElement>('.tm-panel');
  const content = heading?.nextElementSibling as HTMLElement | null;
  const grid = content?.firstElementChild as HTMLElement | null;
  const cards = grid ? Array.from(grid.children) as HTMLElement[] : [];

  if (!heading || !panel || !content || !grid || cards.length < 2) {
    return;
  }

  panel.classList.add(styles.panel);
  heading.classList.add(styles.title);
  content.classList.add(styles.content);
  grid.classList.add(styles.grid);

  cards.slice(0, 2).forEach((card, index) => {
    card.classList.add(
      styles.card,
      index === 0 ? styles.strengthCard : styles.improvementCard,
    );

    const cardHeading = card.querySelector<HTMLElement>('h3');
    const list = card.querySelector<HTMLElement>('ul');

    cardHeading?.classList.add(
      styles.cardTitle,
      index === 0 ? styles.strengthTitle : styles.improvementTitle,
    );
    list?.classList.add(styles.list);
    list
      ?.querySelectorAll<HTMLElement>(':scope > li')
      .forEach((item) => item.classList.add(styles.listItem));

    wrapMetrics(card);
  });
}

export function PlayAnalysisEnhancer() {
  useEffect(() => {
    enhancePlayAnalysis();
  }, []);

  return null;
}
