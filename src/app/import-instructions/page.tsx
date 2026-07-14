/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './import-instructions.module.css';

export const metadata: Metadata = {
  title: 'Upload Instructions | Terraforming Mars Stats',
  description:
    'Step-by-step public instructions for uploading a Terraforming Mars game to Terraforming Mars Stats.',
};

type CalloutKind = 'note' | 'tip' | 'feature' | 'alert';

type Step = {
  detail?: string;
  images?: {
    alt: string;
    src: string;
  }[];
  number: number;
  shortcut?: string[];
  title: string;
};

type Callout = {
  body: string;
  kind: CalloutKind;
  title: string;
};

const steps: Step[] = [
  {
    number: 1,
    title: 'Finish the game and stay on the victory screen.',
    images: [
      {
        src: '/import-instructions/instructions/image2.jpg',
        alt: 'Terraforming Mars victory screen.',
      },
    ],
  },
  {
    number: 2,
    title: 'Open the print dialog.',
    shortcut: ['Ctrl', 'P'],
  },
  {
    number: 3,
    title: 'Set Destination to PDF and Layout to Landscape.',
    detail: 'Then expand More settings.',
    images: [
      {
        src: '/import-instructions/instructions/image5.jpg',
        alt: 'Print dialog with PDF destination and landscape layout selected.',
      },
    ],
  },
  {
    number: 4,
    title: 'Check Background graphics.',
    images: [
      {
        src: '/import-instructions/instructions/image6.jpg',
        alt: 'Print dialog showing Background graphics checked.',
      },
    ],
  },
  {
    number: 5,
    title: 'Click "Download game log."',
    images: [
      {
        src: '/import-instructions/instructions/image7.jpg',
        alt: 'Download game log button.',
      },
    ],
  },
  {
    number: 6,
    title: 'Go to the tab that opened.',
    images: [
      {
        src: '/import-instructions/instructions/image8.jpg',
        alt: 'Opened game log tab.',
      },
    ],
  },
  {
    number: 7,
    title: 'Select the full game log.',
    shortcut: ['Ctrl', 'A'],
    images: [
      {
        src: '/import-instructions/instructions/image10.jpg',
        alt: 'Game log text selected in the browser.',
      },
    ],
  },
  {
    number: 8,
    title: 'Copy the selected game log.',
    shortcut: ['Ctrl', 'C'],
  },
  {
    number: 9,
    title: 'Open Terraforming Mars Stats.',
    detail: 'Go to www.tm-stats.com, then log in or create an account.',
  },
  {
    number: 10,
    title: 'Paste into the Game Log field.',
    shortcut: ['Ctrl', 'V'],
    images: [
      {
        src: '/import-instructions/instructions/image13.jpg',
        alt: 'Game Log field on Terraforming Mars Stats.',
      },
    ],
  },
  {
    number: 11,
    title: 'Upload the result evidence.',
    detail:
      'Scroll to Game Result Screenshot or PDF, then click "Choose File" to upload the screenshot or PDF.',
    images: [
      {
        src: '/import-instructions/instructions/image14.jpg',
        alt: 'Game Result Screenshot or PDF upload field.',
      },
    ],
  },
  {
    number: 12,
    title: 'Click "Analyze Import Evidence."',
    images: [
      {
        src: '/import-instructions/instructions/image15.jpg',
        alt: 'Analyze Import Evidence button.',
      },
    ],
  },
  {
    number: 13,
    title: 'Review the import information.',
    detail:
      'Make sure the extracted data is correct and resolve any error messages.',
  },
  {
    number: 14,
    title: 'Review the players.',
    detail:
      'Pick the appropriate player from each dropdown. If someone has not played before, or the needed name does not appear, create a player.',
    images: [
      {
        src: '/import-instructions/instructions/image16.jpg',
        alt: 'Player review section with dropdowns.',
      },
    ],
  },
  {
    number: 15,
    title: 'Click "Confirm Import Draft."',
    images: [
      {
        src: '/import-instructions/instructions/image17.jpg',
        alt: 'Confirm Import Draft button.',
      },
    ],
  },
  {
    number: 16,
    title: 'Review the generated data.',
    detail: 'Correct any remaining error messages before finalizing.',
  },
  {
    number: 17,
    title: 'Click "Finalize Game."',
    images: [
      {
        src: '/import-instructions/instructions/image18.jpg',
        alt: 'Finalize Game button.',
      },
    ],
  },
];

const callouts: Record<number, Callout[]> = {
  0: [
    {
      kind: 'note',
      title: 'Compatibility note',
      body: 'This workflow is only compatible with games played on terraforming-mars.herokuapp.com.',
    },
    {
      kind: 'alert',
      title: 'Important',
      body: 'This reader cannot use randomized milestones, awards, or tiles.',
    },
  ],
  10: [
    {
      kind: 'tip',
      title: 'Tip',
      body: 'You can also save the game log as a txt file and drag and drop it if preferred.',
    },
  ],
  13: [
    {
      kind: 'tip',
      title: 'Tip',
      body: 'An error usually means something did not import. You can enter it manually after checking the error message text.',
    },
  ],
  14: [
    {
      kind: 'feature',
      title: 'Feature',
      body: 'Players can claim their profile later. When they sign in, they will have the opportunity to claim profiles from played games.',
    },
  ],
  15: [
    {
      kind: 'alert',
      title: 'Alert',
      body: 'You cannot save the same game twice.',
    },
  ],
};

function calloutClass(kind: CalloutKind) {
  return `${styles.callout} ${styles[kind]}`;
}

function Shortcut({ keys }: { keys: string[] }) {
  return (
    <span className={styles.shortcut} aria-label={keys.join(' plus ')}>
      {keys.map((key, index) => (
        <span className={styles.shortcutPart} key={key}>
          <kbd className={styles.key}>{key}</kbd>
          {index < keys.length - 1 ? (
            <span className={styles.plus}>+</span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

function CalloutBubble({ callout }: { callout: Callout }) {
  return (
    <aside className={calloutClass(callout.kind)}>
      <span className={styles.calloutLabel}>{callout.title}</span>
      <p className={styles.calloutBody}>{callout.body}</p>
    </aside>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <article className={styles.stepCard} id={`step-${step.number}`}>
      <div className={styles.stepHeading}>
        <span className={styles.stepNumber}>
          {String(step.number).padStart(2, '0')}
        </span>
        <div>
          <h2 className={styles.stepTitle}>{step.title}</h2>
          {step.detail ? (
            <p className={styles.stepDetail}>{step.detail}</p>
          ) : null}
          {step.shortcut ? <Shortcut keys={step.shortcut} /> : null}
        </div>
      </div>

      {step.images?.map((image) => (
        <figure className={styles.screenshot} key={image.src}>
          <img className={styles.screenshotImage} src={image.src} alt={image.alt} />
        </figure>
      ))}

      {callouts[step.number]?.map((callout) => (
        <CalloutBubble callout={callout} key={callout.title} />
      ))}
    </article>
  );
}

export default function ImportInstructionsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="page-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Continuous guide</p>
            <h1 className={styles.title} id="page-title">
              Upload and finalize a game
            </h1>
            <p className={styles.body}>
              Work through the steps in order: export the game log, upload
              evidence, review the draft, and finalize the game.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.primaryLink} href="/log-game">
              Start upload
            </Link>
            <a className={styles.secondaryLink} href="#step-1">
              Read steps
            </a>
          </div>
          {callouts[0].map((callout) => (
            <CalloutBubble callout={callout} key={callout.title} />
          ))}
        </section>

        <section className={styles.steps} aria-label="Import steps">
          {steps.map((step) => (
            <StepCard step={step} key={step.number} />
          ))}
        </section>
      </div>
    </main>
  );
}
