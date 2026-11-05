import type { Middleware } from '../types';
import { bus, isAuthenticated, setRedirectAfterLogin } from '../state/store';

export const authGuard: Middleware = (ctx) => {
  if (!isAuthenticated) {
    setRedirectAfterLogin(ctx.pathname);
    bus.emit('toast', { message: 'Access denied: Please login first', type: 'error' });
    return '/login';
  }
  return true;
};
