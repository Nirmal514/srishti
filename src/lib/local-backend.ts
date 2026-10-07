import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type LocalUser = {
  id: string;
  email: string;
  provider: 'google';
  createdAt: string;
};

export type LocalSession = {
  userId: string;
  email: string;
  token: string;
  expiresAt: number;
};

export type LocalSeedRecord = {
  id: string;
  userId: string;
  topic: string;
  research: unknown;
  created_at: string;
};

type LocalStore = {
  users: Record<string, LocalUser>;
  sessions: Record<string, LocalSession>;
  seeds: LocalSeedRecord[];
};

export const DEFAULT_GOOGLE_EMAIL = 'google-user@local.dev';
const DATA_PATH = join(process.cwd(), 'data', 'local-backend.json');

export const SESSION_COOKIE_NAME = 'shrishti_session';

async function readStore(): Promise<LocalStore> {
  try {
    const raw = await readFile(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    return {
      users: parsed.users ?? {},
      sessions: parsed.sessions ?? {},
      seeds: parsed.seeds ?? [],
    };
  } catch {
    const initialStore: LocalStore = {
      users: {},
      sessions: {},
      seeds: [],
    };
    await mkdir(dirname(DATA_PATH), { recursive: true });
    await writeFile(DATA_PATH, JSON.stringify(initialStore, null, 2), 'utf8');
    return initialStore;
  }
}

async function saveStore(store: LocalStore): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function upsertLocalUser(email?: string): Promise<LocalUser> {
  const normalized = (email ?? DEFAULT_GOOGLE_EMAIL).trim().toLowerCase() || DEFAULT_GOOGLE_EMAIL;
  const store = await readStore();

  const existing = Object.values(store.users).find((user) => user.email === normalized);
  if (existing) {
    return existing;
  }

  const user: LocalUser = {
    id: randomUUID(),
    email: normalized,
    provider: 'google',
    createdAt: new Date().toISOString(),
  };

  store.users[user.id] = user;
  await saveStore(store);
  return user;
}

export async function issueLocalSession(userId: string): Promise<string> {
  const store = await readStore();
  const user = store.users[userId];
  if (!user) {
    throw new Error('Unknown user for local session creation.');
  }

  const token = `local_${randomUUID()}`;
  const session: LocalSession = {
    userId: user.id,
    email: user.email,
    token,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24,
  };

  store.sessions[token] = session;
  await saveStore(store);
  return token;
}

export async function getSessionFromToken(token: string): Promise<{ userId: string; email: string; user: LocalUser } | null> {
  if (!token) {
    return null;
  }

  const store = await readStore();
  const session = store.sessions[token];
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    delete store.sessions[token];
    await saveStore(store);
    return null;
  }

  const user = store.users[session.userId];
  if (!user) {
    delete store.sessions[token];
    await saveStore(store);
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    user,
  };
}

export async function getSessionFromRequest(request: Request): Promise<{
  userId: string;
  email: string;
  user: LocalUser;
} | null> {
  const header = request.headers.get('cookie') ?? '';
  const match = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  const token = decodeURIComponent(match.split('=')[1] ?? '').trim();
  return getSessionFromToken(token);
}

export async function getUserSeedHistory(userId: string): Promise<LocalSeedRecord[]> {
  const store = await readStore();
  return store.seeds.filter((seed) => seed.userId === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function saveSeedForUser(userId: string, topic: string, research: unknown): Promise<LocalSeedRecord> {
  const store = await readStore();
  const record: LocalSeedRecord = {
    id: randomUUID(),
    userId,
    topic: topic.trim() || 'Untitled seed',
    research,
    created_at: new Date().toISOString(),
  };

  store.seeds.unshift(record);
  await saveStore(store);
  return record;
}

export async function deleteSeedForUser(userId: string, id: string): Promise<void> {
  const store = await readStore();
  store.seeds = store.seeds.filter((seed) => !(seed.id === id && seed.userId === userId));
  await saveStore(store);
}
