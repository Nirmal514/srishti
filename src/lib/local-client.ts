export const SESSION_COOKIE_NAME = 'shrishti_session';

export function createSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=86400; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getClientSessionEmail(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem('shrishti_user_email');
  return stored && stored.trim() ? stored.trim() : null;
}

export function setClientSessionEmail(email: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem('shrishti_user_email', email);
}

export function clearClientSessionEmail(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem('shrishti_user_email');
}
