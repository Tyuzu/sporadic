import { createElement } from '../lib/dom';

export function DashboardPage(): HTMLElement {
  return createElement(
    'div',
    { style: { padding: '1rem' } },
    createElement('h1', {}, 'Protected Dashboard'),
    createElement('p', {}, 'Welcome to your private dashboard data!')
  );
}
