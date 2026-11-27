import { useEffect, useState } from 'react';
import { getCharts, type ChartEntry } from './entertainmentApi';

/** Live authoritative charts for the linked run; empty when offline/unlinked. */
export function useLiveCharts(runId?: string | null): ChartEntry[] {
  const [charts, setCharts] = useState<ChartEntry[]>([]);
  useEffect(() => {
    if (!runId) {
      setCharts([]);
      return;
    }
    let active = true;
    getCharts(runId)
      .then(result => { if (active) setCharts(Array.isArray(result.charts) ? result.charts : []); })
      .catch(() => { if (active) setCharts([]); });
    return () => { active = false; };
  }, [runId]);
  return charts;
}