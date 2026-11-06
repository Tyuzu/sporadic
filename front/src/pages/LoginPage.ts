import { createElement } from '../lib/dom';
import {
  bus,
  getRedirectAfterLogin,
  getRememberMe,
  isAuthenticated,
  setAuthenticated,
  setRedirectAfterLogin,
  setRememberMe
} from '../state/store';
import type { RouterInstance } from '../router/router';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
