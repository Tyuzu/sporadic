import { apiFetch, createElement } from '../lib/dom';
import type { RouteContext } from '../types';

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
    .catch((err: Error) => {
      container.appendChild(
        createElement('p', { style: { color: 'red' } }, `Failed to load user: ${err.message}`)
      );
    });

  return container;
}
