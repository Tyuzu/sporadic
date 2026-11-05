import { apiFetch, createElement } from '../lib/dom';
import { bus, getRedirectAfterLogin, isAuthenticated, setAuthenticated, setRedirectAfterLogin } from '../state/store';
import type { RouteContext } from '../types';
import type { Router } from '../router/router';

export function Navigation(): HTMLElement {
  return createElement(
    'nav',
    { style: { display: 'flex', gap: '1rem', padding: '1rem', background: '#1e293b' } },
    createElement('a', { attributes: { href: '/', 'data-link': '' }, style: { color: '#fff' } }, 'Home (Static)'),
    createElement('a', { attributes: { href: '/login', 'data-link': '' }, style: { color: '#fff' } }, 'Login'),
    createElement('a', { attributes: { href: '/user/42', 'data-link': '' }, style: { color: '#fff' } }, 'User 42 (Dynamic)'),
    createElement('a', { attributes: { href: '/dashboard', 'data-link': '' }, style: { color: '#fff' } }, 'Dashboard (Protected)'),
    createElement('a', { attributes: { href: '/drag-demo', 'data-link': '' }, style: { color: '#fff' } }, 'Drag Demo')
  );
}

export function LoginPage(router: Router): HTMLElement {
  const form = createElement(
    'form',
    {
      style: { maxWidth: '420px', margin: '2rem auto', display: 'grid', gap: '1rem', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '8px' },
      on: {
        submit: (e) => {
          e.preventDefault();
          setAuthenticated(true);

          const redirectTarget = getRedirectAfterLogin() || '/';
          setRedirectAfterLogin(null);

          bus.emit('toast', { message: 'Login successful', type: 'info' });
          router.navigate(redirectTarget);
        }
      }
    },
    createElement('h1', {}, 'Login'),
    createElement('label', {},
      'Email',
      createElement('input', {
        attributes: { type: 'email', value: 'demo@example.com', placeholder: 'demo@example.com' },
        style: { width: '100%', padding: '0.75rem', marginTop: '0.5rem' }
      })
    ),
    createElement('label', {},
      'Password',
      createElement('input', {
        attributes: { type: 'password', value: 'password123', placeholder: 'Password' },
        style: { width: '100%', padding: '0.75rem', marginTop: '0.5rem' }
      })
    ),
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

export function HomePage(router: Router): HTMLElement {
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
              const nextValue = !isAuthenticated;
              setAuthenticated(nextValue);

              const redirectTarget = nextValue ? getRedirectAfterLogin() || '/' : '/';
              setRedirectAfterLogin(null);

              bus.emit('toast', {
                message: `User is now ${nextValue ? 'Logged In' : 'Logged Out'}`,
                type: 'info'
              });

              router.navigate(redirectTarget);
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
