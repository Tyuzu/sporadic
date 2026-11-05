import type { Middleware, Route, RouteContext, RouteHandler } from '../types';
import { createElement } from '../lib/dom';

export class Router {
  private routes: Route[] = [];
  private container: HTMLElement;
  private globalMiddlewares: Middleware[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    window.addEventListener('popstate', () => this.handleRoute());
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('a[data-link]');
      if (target) {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href) this.navigate(href);
      }
    });
  }

  use(middleware: Middleware): this {
    this.globalMiddlewares.push(middleware);
    return this;
  }

  add(path: string, handler: RouteHandler, middlewares: Middleware[] = []): this {
    const paramNames: string[] = [];
    const regexPath = path
      .replace(/\/+/g, '/')
      .replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      });

    const regex = new RegExp(`^${regexPath}$`);
    this.routes.push({ path, regex, paramNames, handler, middlewares });
    return this;
  }

  navigate(path: string): void {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    this.handleRoute();
  }

  async handleRoute(): Promise<void> {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const query: Record<string, string> = {};
    searchParams.forEach((v, k) => (query[k] = v));

    let matchedRoute: Route | null = null;
    let params: Record<string, string> = {};

    for (const route of this.routes) {
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
      this.container.innerHTML = '';
      this.container.appendChild(
        createElement('div', { className: 'p-4 text-red-500' },
          createElement('h1', {}, '404 - Page Not Found')
        )
      );
      return;
    }

    const ctx: RouteContext = { params, query, pathname };

    const allMiddlewares = [...this.globalMiddlewares, ...matchedRoute.middlewares];
    for (const mw of allMiddlewares) {
      const result = await mw(ctx);
      if (result === false) return;
      if (typeof result === 'string') {
        this.navigate(result);
        return;
      }
    }

    this.container.innerHTML = '';
    const component = await matchedRoute.handler(ctx);
    this.container.appendChild(component);
  }
}
