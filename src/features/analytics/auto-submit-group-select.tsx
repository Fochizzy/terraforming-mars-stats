'use client';

import type { GroupPlayComparisonGroup } from './group-play-comparison';

export function AutoSubmitGroupSelect({
  groups,
  selectedGroupId,
}: {
  groups: GroupPlayComparisonGroup[];
  selectedGroupId: string;
}) {
  return (
    <form action="/profile/comparison" method="get">
      <label className="tm-data-label" htmlFor="compare-group">
        Group
      </label>
      <select
        aria-describedby="compare-group-help"
        className="tm-input mt-2 h-11 w-full max-w-sm"
        defaultValue={selected