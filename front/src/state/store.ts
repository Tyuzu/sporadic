import { PubSub } from '../lib/dom';

export type AppEvents = {
  'user:authenticated': { username: string };
  'cart:updated': { itemCount: number };
  toast: { message: string; type: 'info' | 'error' };
};

export const bus = new PubSub<AppEvents>();

const AUTH_KEY = 'simpo:is-authenticated';
const REDIRECT_KEY = 'simpo:redirect-after-login';

function readAuthState(): boolean {
  if (typeof window === 'undefined') return false;

  const raw = window.localStorage.getItem(AUTH_KEY);
  return raw === 'true';
}

export let isAuthenticated = readAuthState();

export function setAuthenticated(value: boolean): void {
  isAuthenticated = value;

  if (typeof window !== 'undefined') {
    if (value) {
      window.localStorage.setItem(AUTH_KEY, 'true');
    } else {
      window.localStorage.removeItem(AUTH_KEY);
    }
  }
}

export function getRedirectAfterLogin(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(REDIRECT_KEY);
}

export function setRedirectAfterLogin(path: string | null): void {
  if (typeof window === 'undefined') return;

  if (!path) {
    window.sessionStorage.removeItem(REDIRECT_KEY);
    return;
  }

  window.sessionStorage.setItem(REDIRECT_KEY, path);
}
