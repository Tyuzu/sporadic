import { createElement } from '../lib/dom';
import {
  bus,
  isAuthenticated,
  setAuthenticated,
  setRedirectAfterLogin
} from '../state/store';
import type { RouterInstance } from '../router/router';

export function Navigation(router: RouterInstance): HTMLElement {
  const nav = createElement(
    'nav',
    { style: { display: 'flex', gap: '1rem', padding: '1rem', background: '#1e293b', alignItems: 'center', flexWrap: 'wrap' } }
  );

  const render = () => {
    nav.innerHTML = '';

    nav.appendChild(createElement('a', { attributes: { href: '/', 'data-link': '' }, style: { color: '#fff' } }, 'Home (Static)'));
    nav.appendChild(createElement('a', { attributes: { href: '/user/42', 'data-link': '' }, style: { color: '#fff' } }, 'User 42 (Dynamic)'));
    nav.appendChild(createElement('a', { attributes: { href: '/dashboard', 'data-link': '' }, style: { color: '#fff' } }, 'Dashboard (Protected)'));
    nav.appendChild(createElement('a', { attributes: { href: '/drag-demo', 'data-link': '' }, style: { color: '#fff' } }, 'Drag Demo'));

    if (!isAuthenticated) {
      nav.appendChild(
        createElement(
          'a',
          {
            attributes: { href: '/login', 'data-link': '' },
            style: { marginLeft: 'auto', color: '#fff', background: '#16a34a', padding: '0.6rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }
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
          style: {
            marginLeft: 'auto',
            padding: '0.6rem 1rem',
            cursor: 'pointer',
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600'
          },
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

export function ToastContainer(): HTMLElement {
  const toastEl = createElement('div', {
    style: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '1rem',
      background: '#0f172a',
      color: '#fff',
      border: '1px solid #334155',
      borderRadius: '4px',
      display: 'none'
    }
  });

  bus.on('toast', ({ message, type }) => {
    toastEl.textContent = message;
    toastEl.style.borderColor = type === 'error' ? '#ef4444' : '#3b82f6';
    toastEl.style.display = 'block';
    setTimeout(() => {
      toastEl.style.display = 'none';
    }, 3000);
  });

  return toastEl;
}
