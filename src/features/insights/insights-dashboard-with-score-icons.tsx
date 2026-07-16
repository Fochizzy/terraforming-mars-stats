'use client';

import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { InsightsDashboard } from './insights-dashboard';

type InsightsDashboardWithScoreIconsProps = ComponentProps<typeof InsightsDashboard>;

type Score