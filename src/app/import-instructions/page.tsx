import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './import-instructions.module.css';

export const metadata: Metadata = {
  title: 'Game Log Instructions | TM Stats',
  description:
    'How to save a finished game result PDF and copy its complete Terraforming Mars game log into TM Stats.',
};

type GuideImage = {
  alt: string;
  height: number;
  src: string;
  width: number;
};

type GuideStep = {
  body: string;
  images?: GuideImage[];
  title: string;
};

const steps: GuideStep[] = [
  {
    title: 'Finish the online game',
    body: 'Stay on the final results screen after the winner and scores are shown.',
    images: [
      {
        alt: 'A finished Terraforming Mars web game results screen.',
        height: 722,
        src: '/import-instructions/instructions/image2.jpg',
        width: 1291,
      },
    ],
  },
  {
    title: 'Save the result page as a PDF',
    body: 'Use the browser print command (Ctrl+P or Command+P), choose Save as PDF, keep landscape orientation and background graphics enabled, then save the complete result document. The PDF text layer provides the exact scores, generations, milestones, awards, and placements without OCR.',
  },
  {
    title: 'Download the game log',
    body: 'Use the "Download game log" control beside the finished game log. The complete log opens in a new browser tab.',
    images: [
      {
        alt: 'The Download game log control beside a finished game log.',
        height: 734,
        src: '/import-instructions/instructions/image7.jpg',
        width: 1788,
      },
      {
        alt: 'The complete exported game log opened in a browser tab.',
        height: 973,
        src: '/import-instructions/instructions/image8.jpg',
        width: 1457,
      },
    ],
  },
  {
    title: 'Copy the complete log',
    body: 'In the log tab, use Ctrl+A (or Command+A) to select everything, then Ctrl+C (or Command+C) to copy it.',
    images: [
      {
        alt: 'A complete exported game log selected for copying.',
        height: 979,
        src: '/import-instructions/instructions/image10.jpg',
        width: 1432,
      },
    ],
  },
  {
    title: 'Paste it into TM Stats',
    body: 'Open Import Game, upload the complete game result PDF, and paste the unedited text into Complete Exported Game Log. A screenshot remains supported when a PDF is unavailable, but the PDF is preferred.',
  },
  {
    title: 'Review before saving',
    body: 'Confirm player matches and correct every unresolved or ambiguous import value. The original source remains attached as private evidence.',
  },
];

export default function ImportInstructionsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="import-guide-title">
        <p className={styles.eyebrow}>Import guide</p>
        <h1 className={styles.title} id="import-guide-title">
          How to get your game log
        </h1>
        <p className={styles.intro}>
          TM Stats imports the complete game result PDF plus the complete
          exported log from a finished supported web game. Do not edit,
          shorten, or reformat either source.
        </p>

        <aside className={styles.alert} role="alert">
          <h2>Canonical maps only</h2>
          <p>
            Games with a randomized map, milestone set, or award set are
            incompatible with TM Stats imports. Use the canonical milestones
            and awards for one supported map.
          </p>
        </aside>

        <div className={styles.actions}>
          <Link className={styles.primaryLink} href="/log-game/import">
            Open Import Game
          </Link>
          <a className={styles.secondaryLink} href="#copy-steps">
            Read the steps
          </a>
        </div>
      </section>

      <section
        aria-label="Steps for copying a game log"
        className={styles.steps}
        id="copy-steps"
      >
        {steps.map((step, index) => (
          <article className={styles.step} key={step.title}>
            <span aria-hidden="true" className={styles.stepNumber}>
              {index + 1}
            </span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
              {step.images?.map((image) => (
                <figure className={styles.screenshot} key={image.src}>
                  <Image
                    alt={image.alt}
                    className={styles.screenshotImage}
                    height={image.height}
                    priority={image.src.endsWith('image2.jpg')}
                    sizes="(max-width: 1000px) 92vw, 860px"
                    src={image.src}
                    width={image.width}
                  />
                </figure>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
