import { describe, expect, it } from 'vitest';
import {
  getUserSeedHistory,
  issueLocalSession,
  saveSeedForUser,
  upsertLocalUser,
} from '@/lib/local-backend';

describe('local backend', () => {
  it('creates a session and persists seed history', async () => {
    const user = await upsertLocalUser('demo@example.com');
    const token = await issueLocalSession(user.id);

    expect(token).toMatch(/^local_/);

    const record = await saveSeedForUser(user.id, 'gravity', {
      seed: 'gravity',
      summary: 'A simple test record.',
      branches: [],
      problems: [],
      reasoning: [],
      limitations: 'test',
    });

    expect(record.topic).toBe('gravity');
    const history = await getUserSeedHistory(user.id);
    expect(history.some((entry) => entry.id === record.id)).toBe(true);
  });
});
