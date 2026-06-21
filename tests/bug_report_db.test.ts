import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/db', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}));

import { pool } from '../server/db';
import {
  createBugReport, listBugReports, BugReportRateLimitError, BUG_REPORT_RATE_LIMIT, BUG_SCREENSHOT_MAX,
} from '../server/bug_report_db';

const query = vi.mocked(pool.query);

beforeEach(() => {
  query.mockReset();
});

const base = {
  accountId: 7,
  characterId: 3,
  characterName: 'Borin',
  realm: 'Eastbrook',
  pos: { x: 10, y: 5, z: -20 },
  description: 'fell through the floor',
  screenshot: 'data:image/jpeg;base64,AAAA',
  meta: { build: 'v1' },
};

describe('createBugReport', () => {
  it('inserts with parameterized SQL when under the rate limit', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ n: 0 }] } as any) // rate-limit count
      .mockResolvedValueOnce({ rows: [{ id: 42 }] } as any); // insert
    const res = await createBugReport(base);
    expect(res).toEqual({ id: 42 });
    const insert = query.mock.calls[1];
    expect(insert[0]).toContain('INSERT INTO bug_reports');
    expect(insert[1]?.[0]).toBe(7); // account_id bound, not interpolated
    expect(insert[1]?.[8]).toBe(base.screenshot); // screenshot retained
  });

  it('throws a rate-limit error at the cap', async () => {
    query.mockResolvedValueOnce({ rows: [{ n: BUG_REPORT_RATE_LIMIT }] } as any);
    await expect(createBugReport(base)).rejects.toBeInstanceOf(BugReportRateLimitError);
    expect(query).toHaveBeenCalledTimes(1); // no insert attempted
  });

  it('drops an oversized screenshot to null rather than storing it', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ n: 0 }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any);
    await createBugReport({ ...base, screenshot: 'x'.repeat(BUG_SCREENSHOT_MAX + 1) });
    expect(query.mock.calls[1][1]?.[8]).toBeNull();
  });

  it('coerces non-finite coordinates to 0', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ n: 0 }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any);
    await createBugReport({ ...base, pos: { x: NaN, y: 5, z: Infinity } });
    const params = query.mock.calls[1][1]!;
    expect(params[4]).toBe(0); // pos_x
    expect(params[5]).toBe(5); // pos_y
    expect(params[6]).toBe(0); // pos_z
  });
});

describe('listBugReports', () => {
  it('orders newest first and caps the limit', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 2 }, { id: 1 }] } as any);
    const rows = await listBugReports(9999, 0);
    expect(rows.map((r) => r.id)).toEqual([2, 1]);
    expect(query.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
    expect(query.mock.calls[0][1]?.[0]).toBe(200); // clamped to max
  });
});
