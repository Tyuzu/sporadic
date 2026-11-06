import { createElement } from '../../lib/dom';
import { bus, isAuthenticated, setAuthenticated, setRedirectAfterLogin } from '../../state/store';
import type { RouterInstance } from '../../router/router';
import { Navigation as UiNavigation } from '../ui';

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
      createElement('strong', { className: 'app-card-title' }, 'Farm Pulse'),
      createElement('p', { className: 'app-card-text' }, 'Healthy crops • 18 active tasks')
    )
  );

  aside.appendChild(
    createElement('div', { className: 'app-sidebar-card' },
      createElement('strong', { className: 'app-card-title' }, 'Quick Stats'),
      createElement('p', { className: 'app-card-text' }, '96% field retention')
    )
  );

  aside.appendChild(
    createElement('div', { className: 'app-sidebar-card' },
      createElement('strong', { className: 'app-card-title' }, 'Alerts'),
      createElement('p', { className: 'app-card-text' }, '2 high-priority updates')
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
      className: active ? 'app-bottom-nav-button active' : 'app-bottom-nav-button',
      on: {
        click: () => router.navigate(href)
      }
    }, label);
    nav.appendChild(button);
  });

  return nav;
}

export function AppLayout(router: RouterInstance, mainView: HTMLElement): HTMLElement {
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
