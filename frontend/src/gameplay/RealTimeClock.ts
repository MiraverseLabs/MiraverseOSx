export interface RealTimeClock {
  anchorUnixMs: number;
  anchorMinutes: number;
  elapsedMinutes: number;
  runId?: string;
}

export const MINUTE_MS = 60_000;

export function clockMinutes(clock: RealTimeClock, now = Date.now()): number {
  return Math.max(clock.elapsedMinutes, clock.anchorMinutes + Math.max(0, Math.floor((now - clock.anchorUnixMs) / MINUTE_MS)));
}

/** Legacy work segments start at 06:00: morning, afternoon, evening, night. */
export function clockSegments(minutes: number) {
  const segments = Math.max(0, Math.floor((minutes - 360) / 360));
  return { timeCycleCount: Math.floor(segments / 4), timeSegmentIndex: segments % 4 };
}

export function initialClock(gameplay: any, now = Date.now()): RealTimeClock {
  const date = new Date(now);
  const cycle = Math.max(0, Math.floor(gameplay.timeCycleCount ?? 28));
  // Preserve the saved cycle, aligning its clock face to local civil time once.
  const minutes = cycle * 1440 + date.getHours() * 60 + date.getMinutes();
  return { anchorUnixMs: Math.floor(now / MINUTE_MS) * MINUTE_MS, anchorMinutes: minutes, elapsedMinutes: minutes };
}

export function validClock(value: any): value is RealTimeClock {
  return value && Number.isSafeInteger(value.anchorUnixMs) && value.anchorUnixMs > 0
    && Number.isSafeInteger(value.anchorMinutes) && value.anchorMinutes >= 0
    && Number.isSafeInteger(value.elapsedMinutes) && value.elapsedMinutes >= value.anchorMinutes;
}

/** Local clock face anchored to game minutes; dates advance with that same clock. */
export function clockDate(clock: RealTimeClock, now = Date.now()): Date {
  const date = new Date(clock.anchorUnixMs);
  const elapsed = clockMinutes(clock, now) - clock.anchorMinutes;
  return new Date(date.getTime() + elapsed * MINUTE_MS);
}

export function gameDate(gameplay: any, fallback = new Date()): Date {
  const clock = gameplay?.realTimeClock;
  return validClock(clock) ? clockDate(clock, clock.anchorUnixMs) : fallback;
}
