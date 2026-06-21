import { pool } from './db';

// Bug reports are a separate lane from the player-vs-player moderation reports
// in moderation_db.ts: this captures technical feedback (realm, position,
// screenshot, free-text) rather than reporting another player.

export const BUG_DESCRIPTION_MAX = 2000;
// A downscaled JPEG (1280px longest edge, q0.7) is ~150-300 KB as a base64 data
// URL; cap well under the endpoint's ~1 MB body limit so a single oversized
// frame is rejected as a screenshot rather than killing the whole request.
export const BUG_SCREENSHOT_MAX = 900 * 1024;
// Per-account submissions allowed in the trailing hour before a 429.
export const BUG_REPORT_RATE_LIMIT = 5;

export class BugReportRateLimitError extends Error {
  constructor() {
    super('too many bug reports, try again later');
    this.name = 'BugReportRateLimitError';
  }
}

export interface BugReportInput {
  accountId: number;
  characterId: number | null;
  characterName: string;
  realm: string;
  pos: { x: number; y: number; z: number };
  description: string;
  screenshot: string | null;
  meta: unknown;
}

export interface BugReportRow {
  id: number;
  account_id: number | null;
  character_id: number | null;
  character_name: string;
  realm: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  description: string;
  screenshot: string | null;
  meta: unknown;
  status: string;
  created_at: string;
}

function finiteOr0(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export async function createBugReport(input: BugReportInput): Promise<{ id: number }> {
  // Count this account's reports in the trailing hour. The TOCTOU gap between
  // this check and the insert lets a burst slip one or two extra through, which
  // is harmless for an abuse cap (unlike a uniqueness constraint).
  const recent = await pool.query(
    `SELECT count(*)::int AS n FROM bug_reports
     WHERE account_id = $1 AND created_at > now() - interval '1 hour'`,
    [input.accountId],
  );
  if ((recent.rows[0]?.n ?? 0) >= BUG_REPORT_RATE_LIMIT) throw new BugReportRateLimitError();

  const screenshot = typeof input.screenshot === 'string' && input.screenshot.length <= BUG_SCREENSHOT_MAX
    ? input.screenshot
    : null;

  const res = await pool.query(
    `INSERT INTO bug_reports (
       account_id, character_id, character_name, realm,
       pos_x, pos_y, pos_z, description, screenshot, meta
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      input.accountId,
      input.characterId,
      input.characterName.slice(0, 64),
      input.realm.slice(0, 64),
      finiteOr0(input.pos.x),
      finiteOr0(input.pos.y),
      finiteOr0(input.pos.z),
      input.description.slice(0, BUG_DESCRIPTION_MAX),
      screenshot,
      JSON.stringify(input.meta ?? {}),
    ],
  );
  return { id: Number(res.rows[0].id) };
}

export async function listBugReports(limit = 100, offset = 0): Promise<BugReportRow[]> {
  const capped = Math.max(1, Math.min(200, Math.floor(limit)));
  const off = Math.max(0, Math.floor(offset));
  const res = await pool.query(
    `SELECT id, account_id, character_id, character_name, realm,
            pos_x, pos_y, pos_z, description, screenshot, meta, status, created_at
     FROM bug_reports
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [capped, off],
  );
  return res.rows.map((r) => ({ ...r, id: Number(r.id) }));
}
