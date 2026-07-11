/**
 * Local-first, append-only analytics event log. LOCAL ONLY — offline-first
 * guardrail: this never touches the network and pulls in no third-party SDK.
 * It exists purely so the app can reason about its own retention/funnel (see
 * retention.ts) and surface honest metrics to the learner, never to phone home.
 *
 * Events land in a bounded in-memory ring buffer (oldest dropped past the cap)
 * so an infinite session can't grow memory without limit. Persistence is
 * OPT-IN via an injected sink: the store owns the real device write-through, so
 * we accept a persist/read callback rather than reaching for storage ourselves.
 * With no sink wired the buffer is a pure in-memory session log.
 */

/** The closed set of things worth logging — keep this union honest and small. */
export type EventName =
  | 'session_start'
  | 'review_graded'
  | 'tone_answered'
  | 'goal_complete'
  | 'streak_advanced'
  | 'feed_word_glossed'
  | 'onboarding_step'
  | 'cloud_synced'
  | 'sign_in'
  | 'sign_out';

/** A single append-only record. `ts` is an ISO timestamp; props are flat scalars. */
export interface AnalyticsEvent {
  name: EventName;
  ts: string;
  props?: Record<string, number | string | boolean>;
}

/** How the log reaches durable storage — supplied by the store, never assumed. */
export interface AnalyticsSink {
  /** Read the persisted events (returns [] / null when nothing stored yet). */
  read(): AnalyticsEvent[] | null;
  /** Persist the current buffer. Called on every append; keep it cheap/debounced. */
  persist(events: AnalyticsEvent[]): void;
}

/** Ring-buffer cap: enough history for D1/D7 funnels without unbounded growth. */
export const EVENT_CAP = 2000;

// Module-level buffer: the analytics log is a single per-app-instance stream.
let buffer: AnalyticsEvent[] = [];
let sink: AnalyticsSink | null = null;
let now: () => string = () => new Date().toISOString();

/**
 * Wire the log to a persistence sink (and optionally a deterministic clock for
 * tests). Hydrates the buffer from the sink so events survive a reload. Safe to
 * call once at store init; passing no sink resets to a pure in-memory log.
 */
export function configureAnalytics(opts: {
  sink?: AnalyticsSink | null;
  clock?: () => string;
}): void {
  sink = opts.sink ?? null;
  if (opts.clock) now = opts.clock;
  const restored = sink?.read();
  buffer = restored ? restored.slice(-EVENT_CAP) : [];
}

/**
 * Append an event. Drops the oldest record once past EVENT_CAP (append-only from
 * the caller's view; the ring bound is an internal memory guard). Flushes to the
 * sink when one is configured — offline write-through, never a network call.
 */
export function track(
  event: EventName,
  props?: Record<string, number | string | boolean>,
): void {
  buffer.push({ name: event, ts: now(), ...(props ? { props } : {}) });
  if (buffer.length > EVENT_CAP) buffer = buffer.slice(-EVENT_CAP);
  sink?.persist(buffer);
}

/** Snapshot of the current log, oldest-first. Returns a copy — callers can't mutate it. */
export function getEvents(): AnalyticsEvent[] {
  return buffer.slice();
}

/** Test/reset helper: clear the in-memory buffer without touching the sink. */
export function _resetAnalytics(): void {
  buffer = [];
}
