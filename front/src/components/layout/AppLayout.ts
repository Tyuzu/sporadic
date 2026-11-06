import { createElement } from '../../lib/dom';
import { bus, isAuthenticated, setAuthenticated, setRedirectAfterLogin } from '../../state/store';
import type { RouterInstance } from '../../router/router';
import { Navigation as UiNavigation } from '../ui';

const STYLE_ID = 'simpo-app-layout-styles';

function ensureLayoutStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      color: #0f172a;
    }

    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1.25rem;
      background: rgba(15, 23, 42, 0.96);
      color: white;
      position: sticky;
      top: 0;
      z-index: 30;
      box-shadow: 0 8px 16px rgba(15, 23, 42, 0.12);
    }

    .app-brand {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.04rem;
    }

    .app-header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-left: auto;
    }

    .app-primary-nav {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    .app-link {
      color: #e2e8f0;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      opacity: 0.9;
    }

    .app-link:hover {
      opacity: 1;
    }

    .app-primary-action {
      border: none;
      border-radius: 999px;
      padding: 0.6rem 1rem;
      background: #22c55e;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }

    .app-secondary-nav {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      padding: 0.85rem 1.25rem;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }

    .app-secondary-item {
      padding: 0.5rem 0.85rem;
      border-radius: 999px;
      background: #e2e8f0;
      color: #0f172a;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .app-body {
      display: flex;
      flex: 1;
      min-height: 0;
      gap: 1rem;
      padding: 1rem 1.25rem 1.5rem;
    }

    .app-sidebar {
      width: 260px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 1rem;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .app-sidebar-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.9rem;
    }

    .app-main {
      flex: 1;
      min-width: 0;
      background: transparent;
    }

    .app-main-view {
      min-height: 420px;
      width: 100%;
    }

    .app-footer {
      padding: 1rem 1.25rem 6rem;
      background: #0f172a;
      color: #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      font-size: 0.85rem;
    }

    .app-bottom-nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.35rem;
      padding: 0.6rem 0.75rem calc(0.6rem + env(safe-area-inset-bottom));
      background: rgba(15, 23, 42, 0.96);
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: 0 -12px 30px rgba(15, 23, 42, 0.18);
    }

    .app-bottom-nav button {
      appearance: none;
      border: none;
      background: transparent;
      color: #e2e8f0;
      padding: 0.55rem 0.35rem;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.66rem;
      font-weight: 700;
      cursor: pointer;
    }

    .app-bottom-nav button.active {
      background: rgba(59, 130, 246, 0.2);
      color: #bfdbfe;
    }

    @media (max-width: 900px) {
      .app-sidebar {
        display: none;
      }
    }

    @media (orientation: landscape) {
      .app-bottom-nav {
        position: static;
        grid-template-columns: repeat(5, auto);
        background: transparent;
        border-top: none;
        box-shadow: none;
        padding: 0;
        margin-left: auto;
      }

      .app-bottom-nav button {
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
      }

      .app-footer {
        padding-bottom: 1rem;
      }
    }
  `;
  document.head.appendChild(style);
}

export function Nav(router: RouterInstance): HTMLElement {
  return UiNavigation(router);
}

export function SecondaryNav(): HTMLElement {
  const nav = createElement('nav', { className: 'app-secondary-nav' });

  ['Overview', 'Tasks', 'Inventory', 'Reports', 'Settings'].forEach((label) => {
    nav.appendChild(createElement('div', { className: 'app-secondary-item' }, label));
  });

  return nav;
}

export function Sidebar(): HTMLElement {
  const aside = createElement('aside', { className: 'app-sidebar' });

  aside.appendChild(
    createElement('div', { className: 'app-sidebar-card' },
      createElement('strong', {}, 'Farm Pulse'),
      createElement('p', { style: { margin: '0.6rem 0 0', color: '#475569' } }, 'Healthy crops • 18 active tasks')
    )
  );

  aside.appendChild(
    createElement('div', { className: 'app-sidebar-card' },
      createElement('strong', {}, 'Quick Stats'),
      createElement('p', { style: { margin: '0.6rem 0 0', color: '#475569' } }, '96% field retention')
    )
  );

  aside.appendChild(
    createElement('div', { className: 'app-sidebar-card' },
      createElement('strong', {}, 'Alerts'),
      createElement('p', { style: { margin: '0.6rem 0 0', color: '#475569' } }, '2 high-priority updates')
    )
  );

  return aside;
}

export function Header(router: RouterInstance): HTMLElement {
  const header = createElement('header', { className: 'app-header' });
  const brand = createElement('div', { className: 'app-brand' }, 'Simpo');
  const nav = Nav(router);
  header.appendChild(brand);
  header.appendChild(nav);
  return header;
}

export function Footer(): HTMLElement {
  return createElement(
    'footer',
    { className: 'app-footer' },
    createElement('span', {}, '© 2026 Simpo'),
    createElement('span', {}, 'Operational overview')
  );
}

export function BottomNav(router: RouterInstance): HTMLElement {
  const nav = createElement('nav', { className: 'app-bottom-nav' });

  const items = [
    { label: 'Home', href: '/', active: true },
    { label: 'Users', href: '/user/42' },
    { label: 'Add', href: '/drag-demo' },
    { label: 'Stats', href: '/dashboard' },
    { label: 'Profile', href: '/login' }
  ];

  items.forEach(({ label, href, active }) => {
    const button = createElement('button', {
      className: active ? 'active' : undefined,
      on: {
        click: () => router.navigate(href)
      }
    }, label);
    nav.appendChild(button);
  });

  return nav;
}

export function AppLayout(router: RouterInstance, mainView: HTMLElement): HTMLElement {
  ensureLayoutStyles();

  const shell = createElement('div', { className: 'app-shell' });
  const header = Header(router);
  const secondaryNav = SecondaryNav();
  const body = createElement('div', { className: 'app-body' });
  const sidebar = Sidebar();
  const main = createElement('div', { className: 'app-main' });
  main.appendChild(mainView);
  body.appendChild(sidebar);
  body.appendChild(main);
  const footer = Footer();
  const bottomNav = BottomNav(router);

  shell.appendChild(header);
  shell.appendChild(secondaryNav);
  shell.appendChild(body);
  shell.appendChild(footer);
  shell.appendChild(bottomNav);

  return shell;
}

export const Aside = Sidebar;
export const Navigation = Nav;
