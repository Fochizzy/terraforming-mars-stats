'use client';

import { useEffect } from 'react';
import styles from './group-insights-lab-enhancer.module.css';

const interactiveSelector = 'input, button, label, a, select, textarea';

function normalizedText(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function findPanel() {
  const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2')).find(
    (candidate) => normalizedText(candidate).toLowerCase() === 'group insights lab',
  );

  return {
    heading: heading ?? null,
    panel: heading?.closest<HTMLElement>('.tm-panel') ?? null,
  };
}

function getDirectContent(panel: HTMLElement) {
  return (
    Array.from(panel.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.tagName === 'DIV',
    ) ?? null
  );
}

function findStepLabel(panel: HTMLElement, labels: string[]) {
  return Array.from(panel.querySelectorAll<HTMLElement>('.tm-data-label')).find((label) =>
    labels.includes(normalizedText(label).toLowerCase()),
  );
}

function formatGameCount(value: string) {
  const match = value.match(/^(\d+)(?:\s+games?)?$/i);

  return match ? `${match[1]} games` : value;
}

function enhancePlayerRows(form: HTMLFormElement) {
  const firstCheckbox = form.querySelector<HTMLInputElement>('input[type="checkbox"]');
  const firstRow = firstCheckbox?.closest<HTMLElement>('div');
  const grid = firstRow?.parentElement;

  if (!grid) {
    return { checkboxes: [] as HTMLInputElement[], grid: null };
  }

  grid.classList.add(styles.playerGrid);

  const rows = Array.from(grid.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
  const checkboxes: HTMLInputElement[] = [];

  rows.forEach((row) => {
    const checkbox = row.querySelector<HTMLInputElement>('input[type="checkbox"]');

    if (!checkbox) {
      return;
    }

    checkboxes.push(checkbox);
    row.classList.add(styles.playerRow);
    row.classList.toggle(styles.playerRowSelected, checkbox.checked);
    row.dataset.selected = checkbox.checked ? 'true' : 'false';

    const count = Array.from(row.querySelectorAll<HTMLElement>('span')).find((span) =>
      /^\d+(?:\s+games?)?$/i.test(normalizedText(span)),
    );

    if (count) {
      const formattedCount = formatGameCount(normalizedText(count));
      if (normalizedText(count) !== formattedCount) count.textContent = formattedCount;
      count.classList.add(styles.gameCount);
    }

    const visibilityButton = row.querySelector<HTMLButtonElement>('button');
    if (visibilityButton) {
      visibilityButton.classList.add(styles.visibilityButton);
      visibilityButton.title = 'Hide player';
    }

    if (row.dataset.groupInsightsClickable !== 'true') {
      row.dataset.groupInsightsClickable = 'true';
      row.addEventListener('click', (event) => {
        const target = event.target;

        if (!(target instanceof Element) || target.closest(interactiveSelector)) {
          return;
        }

        checkbox.click();
      });
    }
  });

  return { checkboxes, grid };
}

function enhanceSummaryBadge(panel: HTMLElement) {
  const badge = panel.querySelector<HTMLElement>('.tm-coverage-badge');

  if (!badge) {
    return;
  }

  const currentText = normalizedText(badge);
  if (currentText.includes('|')) {
    badge.dataset.groupInsightsSummary = currentText;
  }

  const source = badge.dataset.groupInsightsSummary ?? currentText;
  const [primary, secondary] = source.split('|').map((part) => part.trim());

  if (!primary || !secondary) {
    return;
  }

  const secondaryLabel = secondary.replace(
    /^(\d+)\s+player results?$/i,
    '$1 total player results',
  );
  const currentPrimary = normalizedText(badge.querySelector('strong'));
  const currentSecondary = normalizedText(badge.querySelector('span'));

  badge.classList.add(styles.summaryBadge);
  badge.parentElement?.classList.add(styles.summaryWrapper);

  if (currentPrimary === primary && currentSecondary === secondaryLabel) {
    return;
  }

  const primaryNode = document.createElement('strong');
  const secondaryNode = document.createElement('span');
  primaryNode.textContent = primary;
  secondaryNode.textContent = secondaryLabel;
  badge.replaceChildren(primaryNode, secondaryNode);
  badge.setAttribute('aria-label', `${primary}. ${secondaryLabel}.`);
}

function enhanceFooter(panel: HTMLElement, inner: HTMLElement) {
  const originalFooter = Array.from(inner.children).find(
    (child): child is HTMLParagraphElement =>
      child instanceof HTMLParagraphElement &&
      normalizedText(child).toLowerCase().startsWith('compare weighted'),
  );

  if (!originalFooter) {
    return;
  }

  originalFooter.classList.add(styles.originalFooter);

  let replacement = inner.querySelector<HTMLElement>('[data-group-insights-footer]');
  if (replacement) {
    return;
  }

  replacement = document.createElement('p');
  replacement.dataset.groupInsightsFooter = 'true';
  replacement.className = styles.footer;
  replacement.append(
    document.createTextNode(
      'Compare player form, scoring patterns, style fit, matchups, lineup effects, interactions, and data coverage from finalized games. ',
    ),
  );

  const glossaryLink = originalFooter.querySelector<HTMLAnchorElement>('a:last-of-type');
  const link = glossaryLink?.cloneNode(true) as HTMLAnchorElement | undefined;
  const fallbackLink = document.createElement('a');
  const activeLink = link ?? fallbackLink;

  if (!link) fallbackLink.href = '/glossary';
  activeLink.textContent = 'View methodology and glossary →';
  activeLink.classList.add(styles.footerLink);
  replacement.append(activeLink);
  originalFooter.after(replacement);
}

function enhanceGroupInsightsLab() {
  const { heading, panel } = findPanel();

  if (!heading || !panel) {
    return null;
  }

  const caption = heading.nextElementSibling as HTMLElement | null;
  const content = getDirectContent(panel);
  const inner = content?.firstElementChild as HTMLElement | null;
  const layout = inner?.firstElementChild as HTMLElement | null;
  const playerForm = layout?.querySelector<HTMLFormElement>('form');

  if (!caption || !content || !inner || !layout || !playerForm) {
    return panel;
  }

  panel.classList.add(styles.panel);
  heading.classList.add(styles.title);
  caption.classList.add(styles.caption);
  content.classList.add(styles.content);
  inner.classList.add(styles.inner);
  layout.classList.add(styles.layout);
  playerForm.classList.add(styles.playerForm);

  const playersLabel = findStepLabel(panel, ['players', '1 select players']);
  const playersHeader = playersLabel?.parentElement;
  const originalAnalyze = playerForm.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );
  const { checkboxes } = enhancePlayerRows(playerForm);
  const selectedCount = checkboxes.filter((checkbox) => checkbox.checked).length;

  if (playersLabel) playersLabel.textContent = '1 Select players';
  playersHeader?.classList.add(styles.stepHeader);
  originalAnalyze?.classList.add(styles.originalAnalyze);

  if (playersHeader) {
    let counter = playersHeader.querySelector<HTMLElement>(
      '[data-group-insights-selection-count]',
    );

    if (!counter) {
      counter = document.createElement('span');
      counter.dataset.groupInsightsSelectionCount = 'true';
      playersHeader.append(counter);
    }

    counter.className = styles.selectionCount;
    counter.textContent = `${selectedCount} of ${checkboxes.length} selected`;
  }

  if (originalAnalyze) {
    const disabled = selectedCount === 0;
    originalAnalyze.disabled = disabled;

    let headerAction = panel.querySelector<HTMLButtonElement>(
      '[data-group-insights-analyze]',
    );

    if (!headerAction) {
      headerAction = document.createElement('button');
      headerAction.type = 'button';
      headerAction.dataset.groupInsightsAnalyze = 'true';
      headerAction.textContent = 'Analyze';
      headerAction.addEventListener('click', () => originalAnalyze.click());
      caption.after(headerAction);
    }

    headerAction.className = styles.headerAction;
    headerAction.disabled = disabled;
    headerAction.title = disabled
      ? 'Select at least one player to analyze'
      : 'Analyze selected players';
  }

  const selectedGroupLabel = findStepLabel(panel, [
    'selected group',
    '2 choose group configuration',
  ]);
  const selectedGroupWrapper = selectedGroupLabel?.parentElement;
  const selectedGroupForm = selectedGroupWrapper?.querySelector<HTMLFormElement>('form');

  if (selectedGroupLabel) {
    selectedGroupLabel.textContent = '2 Choose group configuration';
  }
  selectedGroupWrapper?.classList.add(styles.groupWrapper);
  selectedGroupForm?.classList.add(styles.groupForm);
  selectedGroupForm
    ?.querySelector<HTMLSelectElement>('select')
    ?.classList.add(styles.groupSelect);
  selectedGroupForm
    ?.querySelector<HTMLButtonElement>('button')
    ?.classList.add(styles.groupButton);

  enhanceSummaryBadge(panel);
  enhanceFooter(panel, inner);

  return panel;
}

export function GroupInsightsLabEnhancer() {
  useEffect(() => {
    const panel = enhanceGroupInsightsLab();

    if (!panel) {
      return;
    }

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) {
        return;
      }

      scheduled = true;
      window.setTimeout(() => {
        scheduled = false;
        enhanceGroupInsightsLab();
      }, 0);
    });

    observer.observe(panel, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
