'use client';

import styles from './score-profile-panel.module.css';

type ScoreSourceEntry = {
  label: string;
  value: number;
};

type ScoreProfilePanelProps = {
  entries: ScoreSourceEntry[];
  subjectName?: string | null;
};

type ScoreSourceDefinition = {
  accent: string;
  filename: string;
  label: string;
};

const STORAGE_BASE_URL =
  'https://qjtwgrjjwnqafbvkkfex.supabase.co/storage/v1/object/public/tm-score-icons';

const scoreSource