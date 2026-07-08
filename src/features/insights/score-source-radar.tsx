'use client';

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  chartAxisTick,
  chartGridStroke,
  chartSeriesColors,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import type { ScoreSourceAverages } from '@/lib/db/analytics-repo';

const RADAR_AXES = [
  { key: 'averageTrPoints', label: 'TR' },
  { key: 'averageCardPoints', label: 'Cards' },
  { key: 'averageGreeneryPoints', label: 'Greenery' },
  { key: 'averageCitiesPoints', label: 'Cities' },
  { key: 'averageMilestonePoints', label: 'Milestones' },
  { key: 'averageAwardPoints', label: 'Awards' },
  { key: 'averageJovianPoints', label: 'Jovian' },
  { key: 'averageMicrobePoints', label: 'Microbes' },
  { key: 'averageAnimalPoints', label: 'Animals' },
] as const;

export type RadarDatum = {
  group: number;
  player: number | null;
  source: string;
};

export function buildRadarData(
  groupAverages: ScoreSourceAverages,
  playerAverages: ScoreSourceAverages | null,
): RadarDatum[] {
  return RADAR_AXES.map((axis) => ({
    group: Number(groupAverages[axis.key].toFixed(1)),
    player: playerAverages
      ? Number(playerAverages[axis.key].toFixed(1))
      : null,
    source: axis.label,
  }));
}

export function ScoreSourceRadar(props: {
  focusPlayerName: string | null;
  groupAverages: ScoreSourceAverages | null;
  playerAverages: ScoreSourceAverages | null;
}) {
  return (
    <ChartFrame title="Score Source Radar">
      {!props.groupAverages ? (
        <p className="tm-muted-copy text-sm">
          The score-source radar will appear after finalized games exist.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <ResponsiveContainer height={340} width="100%">
            <RadarChart
              data={buildRadarData(props.groupAverages, props.playerAverages)}
              margin={{ bottom: 12, left: 12, right: 12, top: 12 }}
            >
              <PolarGrid stroke={chartGridStroke} />
              <PolarAngleAxis dataKey="source" tick={chartAxisTick} />
              <PolarRadiusAxis tick={chartAxisTick} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Radar
                dataKey="group"
                fill={chartSeriesColors.default}
                fillOpacity={0.25}
                name="Group average"
                stroke={chartSeriesColors.default}
                strokeWidth={2}
              />
              {props.playerAverages && props.focusPlayerName ? (
                <Radar
                  dataKey="player"
                  fill={chartSeriesColors.accent}
                  fillOpacity={0.3}
                  name={props.focusPlayerName}
                  stroke={chartSeriesColors.accent}
                  strokeWidth={2}
                />
              ) : null}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
          <p className="tm-muted-copy text-xs">
            Average victory points per finalized game, by source.
            {props.focusPlayerName
              ? ` ${props.focusPlayerName} overlaid on the group profile.`
              : ' Focus a player to overlay their build identity.'}
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
