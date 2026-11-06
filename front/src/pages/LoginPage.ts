import { createElement } from '../lib/dom';
import {
  bus,
  getRedirectAfterLogin,
  getRememberMe,
  setAuthenticated,
  setRedirectAfterLogin,
  setRememberMe
} from '../state/store';
import type { RouterInstance } from '../router/router';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginPage(router: RouterInstance): HTMLElement {
  const shell = createElement('div', { className: 'page-shell login-shell' });

  const visual = createElement('div', { className: 'login-visual' });
  visual.appendChild(createElement('span', { className: 'pill' }, 'Welcome back'));
  visual.appendChild(createElement('h2', {}, 'Keep the farm in sync.'));
  visual.appendChild(
    createElement(
      'p',
      {},
      'Access real-time operations, team updates, and inventory data without leaving the field.'
    )
  );

  const points = createElement('ul', { className: 'login-points' });
  ['Live field metrics', 'Task coordination', 'Secure workforce access'].forEach((item) => {
    const row = createElement('li');
    row.appendChild(createElement('span', { className: 'point-dot' }));
    row.appendChild(createElement('span', {}, item));
    points.appendChild(row);
  });
  visual.appendChild(points);

  const form = createElement('form', {
    className: 'login-card form-grid',
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
            errorBox.classList.add('is-visible');
          }
          return;
        }

        if (password.length < 6) {
          if (errorBox) {
            errorBox.textContent = 'Password must be at least 6 characters long.';
            errorBox.classList.add('is-visible');
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
  });

  form.appendChild(createElement('h1', { className: 'page-title' }, 'Sign in'));
  form.appendChild(createElement('p', { className: 'page-subtitle' }, 'Access your workspace securely.'));

  const errorBox = createElement('p', {
    className: 'form-error',
    attributes: { 'data-error': '' }
  });
  form.appendChild(errorBox);

  const emailRow = createElement('div', { className: 'form-row' });
  const emailLabel = createElement('label', { className: 'form-label' }, 'Email address');
  const emailInput = createElement('input', {
    className: 'form-input',
    attributes: { type: 'email', name: 'email', placeholder: 'demo@example.com', required: '' }
  });
  emailRow.appendChild(emailLabel);
  emailRow.appendChild(emailInput);
  form.appendChild(emailRow);

  const passwordRow = createElement('div', { className: 'form-row' });
  const passwordLabel = createElement('label', { className: 'form-label' }, 'Password');
  const passwordInput = createElement('input', {
    className: 'form-input',
    attributes: { type: 'password', name: 'password', placeholder: '••••••••', required: '' }
  });
  passwordRow.appendChild(passwordLabel);
  passwordRow.appendChild(passwordInput);
  form.appendChild(passwordRow);

  const remember = createElement('label', { className: 'checkbox-row' });
  const rememberInput = createElement('input', { attributes: { type: 'checkbox', name: 'remember' } });
  rememberInput.checked = getRememberMe();
  remember.appendChild(rememberInput);
  remember.appendChild(createElement('span', {}, 'Keep me signed in'));
  form.appendChild(remember);

  const submit = createElement('button', { className: 'form-submit', attributes: { type: 'submit' } }, 'Log in');
  form.appendChild(submit);

  shell.appendChild(visual);
  shell.appendChild(form);
  return shell;
}
