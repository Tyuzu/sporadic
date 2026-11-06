import type { Middleware, Route, RouteContext, RouteHandler } from '../types';
import { createElement } from '../lib/dom';

export type RouterInstance = {
  use: (middleware: Middleware) => RouterInstance;
  add: (path: string, handler: RouteHandler, middlewares?: Middleware[]) => RouterInstance;
  navigate: (path: string) => void;
  handleRoute: () => Promise<void>;
};

export function createRouter(container: HTMLElement): RouterInstance {
  const routes: Route[] = [];
  const globalMiddlewares: Middleware[] = [];

  const handleRoute = async (): Promise<void> => {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const query: Record<string, string> = {};
    searchParams.forEach((v, k) => (query[k] = v));

    let matchedRoute: Route | null = null;
    let params: Record<string, string> = {};

    for (const route of routes) {
      const match = pathname.match(route.regex);
      if (match) {
        matchedRoute = route;
        route.paramNames.forEach((name, idx) => {
          params[name] = decodeURIComponent(match[idx + 1]);
        });
        break;
      }
    }

    if (!matchedRoute) {
      container.innerHTML = '';
      container.appendChild(
        createElement('div', { className: 'p-4 text-red-500' },
          createElement('h1', {}, '404 - Page Not Found')
        )
      );
      return;
    }

    const ctx: RouteContext = { params, query, pathname };
    const allMiddlewares = [...globalMiddlewares, ...matchedRoute.middlewares];

    for (const mw of allMiddlewares) {
      const result = await mw(ctx);
      if (result === false) return;
      if (typeof result === 'string') {
        navigate(result);
        return;
      }
    }

    container.innerHTML = '';
    const component = await matchedRoute.handler(ctx);
    container.appendChild(component);
  };

  const navigate = (path: string): void => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    void handleRoute();
  };

  const use = (middleware: Middleware): RouterInstance => {
    globalMiddlewares.push(middleware);
    return api;
  };

  const add = (path: string, handler: RouteHandler, middlewares: Middleware[] = []): RouterInstance => {
    const paramNames: string[] = [];
    const regexPath = path
      .replace(/\/+/g, '/')
      .replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      });

    const regex = new RegExp(`^${regexPath}$`);
    routes.push({ path, regex, paramNames, handler, middlewares });
    return api;
  };

  const api: RouterInstance = {
    use,
    add,
    navigate,
    handleRoute
  };

  window.addEventListener('popstate', () => {
    void handleRoute();
  });

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('a[data-link]');
    if (target) {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) navigate(href);
    }
  });

  return api;
}
