import { createPubSub } from '../lib/dom';

export type AppEvents = {
  'user:authenticated': { username: string };
  'cart:updated': { itemCount: number };
  toast: { message: string; type: 'info' | 'error' };
};

export const bus = createPubSub<AppEvents>();

const AUTH_KEY = 'simpo:is-authenticated';
const REDIRECT_KEY = 'simpo:redirect-after-login';
const REMEMBER_KEY = 'simpo:remember-me';

function readAuthState(): boolean {
  if (typeof window === 'undefined') return false;

  const localValue = window.localStorage.getItem(AUTH_KEY);
  if (localValue === 'true') return true;

  const sessionValue = window.sessionStorage.getItem(AUTH_KEY);
  return sessionValue === 'true';
}

export let isAuthenticated = readAuthState();

export function setAuthenticated(value: boolean, shouldPersist = true): void {
  isAuthenticated = value;
  bus.emit('user:authenticated', { username: value ? 'demo-user' : '' });

  if (typeof window === 'undefined') return;

  if (value) {
    const storage = shouldPersist ? window.localStorage : window.sessionStorage;
    storage.setItem(AUTH_KEY, 'true');

    if (shouldPersist) {
      window.sessionStorage.removeItem(AUTH_KEY);
    } else {
      window.localStorage.removeItem(AUTH_KEY);
    }
  } else {
    window.localStorage.removeItem(AUTH_KEY);
    window.sessionStorage.removeItem(AUTH_KEY);
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

export function getRememberMe(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(REMEMBER_KEY) === 'true';
}

export function setRememberMe(value: boolean): void {
  if (typeof window === 'undefined') return;

  if (value) {
    window.localStorage.setItem(REMEMBER_KEY, 'true');
  } else {
    window.localStorage.removeItem(REMEMBER_KEY);
  }
}
