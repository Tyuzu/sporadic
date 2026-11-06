import { createElement } from '../lib/dom';
import { bus, isAuthenticated, setAuthenticated, setRedirectAfterLogin } from '../state/store';
import type { RouterInstance } from '../router/router';

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
