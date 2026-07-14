import {
  buildScoreSourceEntries,
  type StyleEffectivenessData,
} from '@/lib/db/analytics-repo';
import type {
  StyleEffectivenessScopeInput,
  StyleSubject,
} from './style-effectiveness';

// Shared subjects for the non-personal scopes, so the sentence voice is
// consistent wherever the panel is used.
export const FIELD_SUBJECT: StyleSubject = {
  possessive: 'the field',
  subject: 'the field',
};

export const GROUP_SUBJECT: StyleSubject = {
  possessive: "this group's",
  subject: 'this group',
};

export const SELF_SUBJECT: StyleSubject = {
  possessive: 'your',
  subject: 'you',
};

// Turn a loaded style-effectiveness payload into a panel scope, deriving the
// where-points-come-from entries from its score averages.
export function buildStyleScope(input: {
  data: StyleEffectivenessData;
  key: string;
  label: string;
  subject: StyleSubject;
}): StyleEffectivenessScopeInput {
  return {
    key: input.key,
    label: input.label,
    scoreEntries: input.data.scoreAverages
      ? buildScoreSourceEntries(input.data.scoreAverages)
      : [],
    styleRows: input.data.styleRows,
    subject: input.subject,
  };
}
