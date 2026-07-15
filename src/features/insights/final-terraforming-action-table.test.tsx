import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FinalTerraformingActionStat } from '@/lib/db/selection-stats-repo';
import { FinalTerraformingActionTable } from './final-terraforming-action-table';

const rows: FinalTerraformingActionStat[] = [
  {
    final_action_games: 2,
    final_action_rate: 0