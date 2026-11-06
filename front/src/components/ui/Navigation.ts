import { createElement } from '../../lib/dom';
import { bus, isAuthenticated, setAuthenticated, setRedirectAfterLogin } from '../../state/store';
import type { RouterInstance } from '../../router/router';

export function Navigation(router: RouterInstance): HTMLElement {
  const nav = createElement('nav', { className: 'app-primary-nav' });

  const render = () => {
    nav.innerHTML = '';

    nav.appendChild(createElement('a', { className: 'app-link', attributes: { href: '/', 'data-link': '' } }, 'Home (Static)'));
    nav.appendChild(createElement('a', { className: 'app-link', attributes: { href: '/user/42', 'data-link': '' } }, 'User 42 (Dynamic)'));
    nav.appendChild(createElement('a', { className: 'app-link', attributes: { href: '/dashboard', 'data-link': '' } }, 'Dashboard (Protected)'));
    nav.appendChild(createElement('a', { className: 'app-link', attributes: { href: '/drag-demo', 'data-link': '' } }, 'Drag Demo'));

    if (!isAuthenticated) {
      nav.appendChild(
        createElement(
          'a',
          {
            className: 'app-primary-action app-primary-action--login',
            attributes: { href: '/login', 'data-link': '' }
          },
          'Login'
        )
      );
      return;
    }

    nav.appendChild(
      createElement(
        'button',
        {
          className: 'app-primary-action app-primary-action--danger',
          on: {
            click: () => {
              setAuthenticated(false);
              setRedirectAfterLogin(null);
              bus.emit('toast', { message: 'You have been logged out', type: 'info' });
              router.navigate('/');
            }
          }
        },
        'Log Out'
      )
    );
  };

  bus.on('user:authenticated', () => {
    render();
  });

  render();
  return nav;
}
