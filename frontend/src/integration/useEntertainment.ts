import { useMemo } from 'react';
import type { ChartEntry } from './entertainmentApi';

/** Charts follow the linked run's synchronized track snapshot, including updates. */
export function useLiveCharts(runId: string | null | undefined, tracks: readonly ChartEntry[]): ChartEntry[] {
  return useMemo(() => runId
    ? [...tracks].sort((a, b) => b.streams - a.streams || b.radioSpins - a.radioSpins).slice(0, 20)
    : [], [runId, tracks]);
}
