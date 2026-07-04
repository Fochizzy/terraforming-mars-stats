import type { ParsedEndgameScoreScreenshot } from '@/lib/imports/parse-endgame-score-screenshot';

type ImportScoreCandidatesPanelProps = {
  scoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
};

export function ImportScoreCandidatesPanel({
  scoreCandidates,
}: ImportScoreCandidatesPanelProps) {
  if (scoreCandidates.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="tm-data-label text-xs">Screenshot Score Candidates</h3>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {scoreCandidates.map((candidate) => (
          <li
            className="rounded-xl bg-white/[0.03] px-3 py-2 text-stone-100"
            key={candidate.playerName}
          >
            {candidate.playerName}: {candidate.totalPoints ?? 'unknown'} total
            {candidate.trPoints == null ? null : `, ${candidate.trPoints} TR`}
          </li>
        ))}
      </ul>
    </div>
  );
}
