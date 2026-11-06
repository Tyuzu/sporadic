import { apiFetch, createElement } from '../lib/dom';
import {
  bus,
  getRedirectAfterLogin,
  getRememberMe,
  isAuthenticated,
  setAuthenticated,
  setRedirectAfterLogin,
  setRememberMe
} from '../state/store';
import type { RouteContext } from '../types';
import type { RouterInstance } from '../router/router';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

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

export function LoginPage(router: RouterInstance): HTMLElement {
  const form = createElement(
    'form',
    {
      style: { maxWidth: '420px', margin: '2rem auto', display: 'grid', gap: '1rem', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' },
      on: {
        submit: (e) => {
          e.preventDefault();

          const target = e.currentTarget as HTMLFormElement;
          const emailInput = target.querySelector('input[name="email"]') as HTMLInputElement | null;
          const passwordInput = target.querySelector('input[name="password"]') as HTMLInputElement | null;
          const rememberInput = target.querySelector('input[name="remember"]') as HTMLInputElement | null;
          const errorBox = target.querySelector('[data-error]') as HTMLElement | null;

          const email = emailInput?.value.trim() ?? '';
          const password = passwordInput?.value ?? '';
          const remember = rememberInput?.checked ?? false;

          if (!email || !isValidEmail(email)) {
            if (errorBox) {
              errorBox.textContent = 'Please enter a valid email address.';
              errorBox.style.display = 'block';
            }
            return;
          }

          if (password.length < 6) {
            if (errorBox) {
              errorBox.textContent = 'Password must be at least 6 characters long.';
              errorBox.style.display = 'block';
            }
            return;
          }

          const redirectTarget = getRedirectAfterLogin() || '/dashboard';
          setRememberMe(remember);
          setAuthenticated(true, remember);
          setRedirectAfterLogin(null);

          bus.emit('toast', { message: 'Login successful', type: 'info' });
          router.navigate(redirectTarget);
        }
      }
    }
  );

  const errorBox = createElement('p', {
    style: { color: '#dc2626', margin: '0', display: 'none' },
    attributes: { 'data-error': '' }
  });

  const emailInput = createElement('input', {
    attributes: { type: 'email', name: 'email', placeholder: 'demo@example.com', required: '' },
    style: { width: '100%', padding: '0.75rem', marginTop: '0.5rem' }
  });

  const passwordInput = createElement('input', {
    attributes: { type: 'password', name: 'password', placeholder: 'Password', required: '' },
    style: { width: '100%', padding: '0.75rem', marginTop: '0.5rem' }
  });

  const rememberInput = createElement('input', {
    attributes: { type: 'checkbox', name: 'remember' },
    style: { marginRight: '0.5rem' }
  });
  rememberInput.checked = getRememberMe();

  form.appendChild(createElement('h1', {}, 'Login'));
  form.appendChild(errorBox);
  form.appendChild(createElement('label', {}, 'Email', emailInput));
  form.appendChild(createElement('label', {}, 'Password', passwordInput));
  form.appendChild(
    createElement(
      'label',
      { style: { display: 'flex', alignItems: 'center' } },
      rememberInput,
      'Remember me'
    )
  );
  form.appendChild(
    createElement(
      'button',
      {
        style: { padding: '0.75rem 1rem', cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px' }
      },
      'Log In'
    )
  );

  return form;
}

export function HomePage(router: RouterInstance): HTMLElement {
  return createElement(
    'div',
    { style: { padding: '1rem' } },
    createElement('h1', {}, 'Home Page'),
    createElement('p', {}, `Auth Status: ${isAuthenticated ? 'Logged In' : 'Logged Out'}`),
    createElement(
      'button',
      {
        style: { padding: '0.5rem 1rem', cursor: 'pointer' },
        on: {
          click: () => {
            if (isAuthenticated) {
              setAuthenticated(false);
              setRedirectAfterLogin(null);
              bus.emit('toast', { message: 'You have been logged out', type: 'info' });
              router.navigate('/');
              return;
            }

            router.navigate('/login');
          },
          hover: (e) => {
            (e.target as HTMLElement).style.opacity = e.type === 'mouseenter' ? '0.8' : '1';
          }
        }
      },
      isAuthenticated ? 'Log Out' : 'Go to Login'
    )
  );
}

export function UserPage(ctx: RouteContext): HTMLElement {
  const container = createElement('div', { style: { padding: '1rem' } },
    createElement('h1', {}, `User Profile: ID ${ctx.params.id}`),
    createElement('p', {}, 'Fetching user data from API...')
  );

  apiFetch<{ id: number; name: string; email: string }>(
    `https://jsonplaceholder.typicode.com/users/${ctx.params.id}`
  )
    .then((user) => {
      container.appendChild(
        createElement('div', { style: { marginTop: '1rem', border: '1px solid #ccc', padding: '1rem' } },
          createElement('p', {}, `Name: ${user.name}`),
          createElement('p', {}, `Email: ${user.email}`)
        )
      );
    })
    .catch((err) => {
      container.appendChild(
        createElement('p', { style: { color: 'red' } }, `Failed to load user: ${err.message}`)
      );
    });

  return container;
}

export function DashboardPage(): HTMLElement {
  return createElement(
    'div',
    { style: { padding: '1rem' } },
    createElement('h1', {}, 'Protected Dashboard'),
    createElement('p', {}, 'Welcome to your private dashboard data!')
  );
}

export function DragDemoPage(): HTMLElement {
  const dropZone = createElement(
    'div',
    {
      style: {
        width: '300px',
        height: '150px',
        border: '2px dashed #94a3b8',
        marginTop: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      on: {
        dragover: (e) => {
          e.preventDefault();
          dropZone.style.background = '#334155';
        },
        drop: (e) => {
          e.preventDefault();
          dropZone.style.background = 'transparent';
          const data = e.dataTransfer?.getData('text/plain');
          dropZone.textContent = `Dropped item: ${data}`;
        }
      }
    },
    'Drop Item Here'
  );

  const draggableBox = createElement(
    'div',
    {
      draggable: true,
      style: {
        width: '100px',
        padding: '0.5rem',
        background: '#3b82f6',
        color: '#fff',
        cursor: 'grab',
        textAlign: 'center'
      },
      on: {
        dragstart: (e) => {
          e.dataTransfer?.setData('text/plain', 'Draggable Widget #1');
        }
      }
    },
    'Drag Me'
  );

  return createElement(
    'div',
    { style: { padding: '1rem' } },
    createElement('h1', {}, 'Drag and Drop Interactive Component'),
    draggableBox,
    dropZone
  );
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
