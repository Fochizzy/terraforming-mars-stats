'use client';

import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { InsightsDashboard } from './insights-dashboard';

type InsightsDashboardWithScoreIconsProps = ComponentProps<typeof InsightsDashboard>;

type ScoreProfileRow = {
  label: string;
  value: number;
};

const scoreIconFiles: Record<string, string> = {
  'Terraform Rating': 'Terraform_Rating.png',