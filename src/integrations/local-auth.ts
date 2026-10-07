import { createMiddleware, createServerFn } from '@tanstack/react-start';
import {
  deleteSeedForUser,
  getSessionFromRequest,
  getUserSeedHistory,
  issueLocalSession,
  upsertLocalUser,
} from '@/lib/local-backend';

export const attachLocalAuth = createMiddleware({ type: 'function' }).server(async ({ next, request, context }) => {
  const session = request ? await getSessionFromRequest(request) : null;
  if (!session) {
    return next({ context: { ...context, userId: undefined, user: undefined, session: undefined } });
  }

  return next({
    context: {
      ...context,
      userId: session.userId,
      user: session.user,
      session,
    },
  });
});

export const requireLocalAuth = createMiddleware({ type: 'function' }).server(async ({ next, request, context }) => {
  const session = context.session ?? (request ? await getSessionFromRequest(request) : null);
  if (!session) {
    throw new Error('Please sign in to continue with SHRISHTI.');
  }

  return next({
    context: {
      ...context,
      userId: session.userId,
      user: session.user,
      session,
    },
  });
});

export const signInWithGoogle = createServerFn({ method: 'POST' })
  .validator((d: { email?: string }) => {
    const email = String(d?.email ?? '').trim().toLowerCase() || 'google-user@local.dev';
    return { email };
  })
  .handler(async ({ data }) => {
    const user = await upsertLocalUser(data.email);
    const token = await issueLocalSession(user.id);
    return {
      token,
      user,
    };
  });

export const getMyHistory = createServerFn({ method: 'POST' })
  .middleware([requireLocalAuth])
  .handler(async ({ context }) => {
    const userId = String(context.userId ?? '');
    return getUserSeedHistory(userId);
  });

export const deleteMySeed = createServerFn({ method: 'POST' })
  .middleware([requireLocalAuth])
  .validator((d: { id?: string }) => {
    const id = String(d?.id ?? '').trim();
    if (!id) {
      throw new Error('Seed id is required.');
    }
    return { id };
  })
  .handler(async ({ data, context }) => {
    const userId = String(context.userId ?? '');
    await deleteSeedForUser(userId, data.id);
    return { ok: true };
  });
