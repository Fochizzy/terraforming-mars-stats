'use client';

import { useEffect } from 'react';

const CORPORATION_LOGO_BASE_URL =
  'https://qjtwgrjjwnqafbvkkfex.supabase.co/storage/v1/object/public/tm-corporation-logos';
const CORPORATION_LOGO_VERSION = '20260716-transparent-normalized';

const filenameOverrides: Record<string, string> = {
  'Ambient Terraforming Solutions':
    'Ambient_Terraforming_Solutions_For_a_Breathable_Future.png',
  AstroDrill: 'AstroDrill.png',
  'Arborist Collective': 'Arborist_collective.png',
  'Anubis Securities': 'Anubis_securities.png',
  CrediCor: 'Creditcor.png',
  'Gagarin Mobile Base': 'Gagarian_Mobile_Base.png',
  'Interplanetary Cinematics': 'Interplanetary _Cinematics.png',
  'Martian Insurance Group': 'Martian_Insurance_Group.png',
  Polaris:
    "Polaris_Terraforming_Solutions_Guiding_Humanity's_Next_Frontier.png",
  'Polaris Terraforming Solutions':
    "Polaris_Terraforming_Solutions_Guiding_Humanity's_Next_Frontier.png",
  'Ringcom Terraforming Solutions':
    'Ringcom_Terraforming_Solutions_Connecting_a_New_World.png',
  'Robin Haulings': 'Robin_Hauling.png',
  Steelaris:
    'Steelaris_Forging_a_Future_in_Steel_Building_Tomorrow_On_Mars.png',
  ThorGate: 'Thorgate.png',
  'Tharsis Republic': 'Tharsis_Republic.png',
  'United Nations Mars Initiative': 'United_Nations_Mars_Initiative.png',
  'Utopia Invest': 'Utopia_Invevst.png',
};

function candidateFilenames(name: string) {
  const candidates = [
    filenameOverrides[name],
    `${name}.png`,
    `${name.replaceAll(' ', '_')}.png`,
    `${name.replaceAll(' ', '_').replaceAll('-', '_')}.png`,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}

function getLogoUrl(filename: string) {
  return `${CORPORATION_LOGO_BASE_URL}/${encodeURIComponent(
    filename,
  )}?v=${CORPORATION_LOGO_VERSION}`;
}

function createLogo(name: string) {
  const candidates = candidateFilenames(name);
  const image = document.createElement('img');
  let candidateIndex = 0;

  image.alt = `${name} logo`;
  image.className = 'tm-corporation-table-logo';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.style.width = '48px';
  image.style.height = '48px';
  image.style.flex = '0 0 48px';
  image.style.objectFit = 'contain';
  image.style.background = 'transparent';
  image.style.border = '0';
  image.style.borderRadius = '0';
  image.src = getLogoUrl(candidates[0] ?? '');

  image.addEventListener('error', () => {
    candidateIndex += 1;

    if (candidateIndex < candidates.length) {
      image.src = getLogoUrl(candidates[candidateIndex] ?? '');
      return;
    }

    image.remove();
  });

  return image;
}

function decorateCorporationTable() {
  const sectionHeadings = [...document.querySelectorAll('h3')].filter(
    (heading) => heading.textContent?.trim() === 'Corporations',
  );

  for (const heading of sectionHeadings) {
    const section = heading.closest('section');

    if (!section) {
      continue;
    }

    for (const rowHeader of section.querySelectorAll('tbody th[scope="row"]')) {
      if (rowHeader.querySelector('.tm-corporation-table-logo')) {
        continue;
      }

      const nameElement = rowHeader.querySelector('span');
      const name = nameElement?.textContent?.trim();

      if (!name || !nameElement) {
        continue;
      }

      const content = document.createElement('div');
      content.className = 'tm-corporation-table-identity';
      content.style.display = 'flex';
      content.style.alignItems = 'center';
      content.style.gap = '12px';
      content.style.minWidth = '0';
      rowHeader.insertBefore(content, nameElement);
      content.append(createLogo(name), nameElement);
    }
  }

  for (const card of document.querySelectorAll('[data-testid="weighted-corporation-row"]')) {
    if (card.querySelector('.tm-corporation-table-logo')) {
      continue;
    }

    const nameElement = card.querySelector('h4');
    const name = nameElement?.textContent?.trim();

    if (!name || !nameElement || !nameElement.parentElement) {
      continue;
    }

    const identity = document.createElement('div');
    identity.className = 'tm-corporation-card-identity';
    identity.style.display = 'flex';
    identity.style.alignItems = 'center';
    identity.style.gap = '12px';
    nameElement.parentElement.insertBefore(identity, nameElement);
    identity.append(createLogo(name), nameElement);
  }
}

export function CorporationLogoDecorator() {
  useEffect(() => {
    decorateCorporationTable();

    const observer = new MutationObserver(() => decorateCorporationTable());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
