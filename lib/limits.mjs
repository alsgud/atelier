// Plan rate-limit snapshot. The foreman's status line writes it; runners read it to pace themselves.
import { paths, readJson, writeJson, config } from './home.mjs';

export function saveFromStatusline(input) {
  if (!input?.rate_limits) return;
  writeJson(paths.limits, { ...input.rate_limits, saved_at: Math.floor(Date.now() / 1000) });
}

// Headless runs report usage as `rate_limit_event` lines: utilization is 0-1, resetsAt epoch seconds.
export function saveFromStream(info) {
  const w = info?.unifiedWindows;
  if (!w) return;
  const conv = x => x && { used_percentage: x.utilization * 100, resets_at: x.resetsAt };
  writeJson(paths.limits, {
    ...snapshot(),
    ...(w.five_hour && { five_hour: conv(w.five_hour) }),
    ...(w.seven_day && { seven_day: conv(w.seven_day) }),
    saved_at: Math.floor(Date.now() / 1000),
  });
}

export function snapshot() {
  return readJson(paths.limits, null);
}

// Returns epoch seconds to wait until, or 0 if runners may go ahead.
export function waitUntil() {
  const s = snapshot();
  if (!s) return 0;
  const now = Date.now() / 1000;
  const { pace } = config();
  const windows = [
    [s.five_hour, pace.fiveHour],
    [s.seven_day, pace.sevenDay],
  ];
  let until = 0;
  for (const [w, max] of windows) {
    if (w && w.resets_at > now && w.used_percentage >= max) until = Math.max(until, w.resets_at + 60);
  }
  // Even weekly pace: by any point in the week, stay under the cap times the share of the week gone,
  // plus a little slack. Ahead of pace, hold until the line catches up.
  const wk = s.seven_day;
  if (pace.spread && wk && wk.resets_at > now) {
    const WEEK = 7 * 24 * 3600, SLACK = 8;
    const start = wk.resets_at - WEEK;
    const allowed = pace.sevenDay * Math.min(1, (now - start) / WEEK) + SLACK;
    if (wk.used_percentage > allowed) {
      const catchUp = start + Math.min(1, (wk.used_percentage - SLACK) / pace.sevenDay) * WEEK;
      until = Math.max(until, Math.min(catchUp, wk.resets_at) + 60);
    }
  }
  return until;
}

export function describe() {
  const s = snapshot();
  if (!s) return 'limits: unknown until the first agent iteration or foreman turn';
  const when = sec => new Date(sec * 1000).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  const fmt = (name, w) => w ? `${name} ${Math.round(w.used_percentage)}% (resets ${when(w.resets_at)})` : null;
  const age = Math.round((Date.now() / 1000 - s.saved_at) / 60);
  const { pace } = config();
  const held = waitUntil();
  return [fmt('5h', s.five_hour), fmt('7d', s.seven_day)].filter(Boolean).join(' · ') + ` · read ${age}m ago · Atelier stops at ${pace.fiveHour}% (5h) / ${pace.sevenDay}% (week)${pace.spread ? ', paced evenly over the week' : ''}${held ? ` · HOLDING until ${when(held)}` : ''}`;
}
