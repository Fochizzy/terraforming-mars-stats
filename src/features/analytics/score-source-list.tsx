'use client';

import { useMemo, useState } from 'react';
import type { ScoreSourceAverages } from '@/lib/db/analytics-repo';
import type { CorporationScoreSourceRow } from '@/lib/db/corporation-score-source-repo';

const SUPABASE_STORAGE_URL =
  'https://qjtwgrjjwnqafbvkkfex.supabase.co/storage/v1/object/public';

const