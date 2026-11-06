import { apiFetch, createElement } from '../lib/dom';
import type { RouteContext } from '../types';

export function UserPage(ctx: RouteContext): HTMLElement {
  const shell = createElement('div', { className: 'page-shell user-shell' });
  const card = createElement('section', { className: 'profile-card' });

  const header = createElement('div', { className: 'profile-header' });
  const meta = createElement('div', { className: 'profile-meta' });
  const avatar = createElement('div', { className: 'avatar' }, 'U');
  const titleWrap = createElement('div');
  titleWrap.appendChild(createElement('h1', { className: 'profile-name' }, `User ${ctx.params.id}`));
  titleWrap.appendChild(createElement('div', { className: 'profile-role' }, 'Loading profile details...'));
  meta.appendChild(avatar);
  meta.appendChild(titleWrap);
  header.appendChild(meta);
  header.appendChild(createElement('span', { className: 'badge badge--primary' }, 'Active profile'));
  card.appendChild(header);

  const detailsGrid = createElement('div', { className: 'details-grid' });
  const fields = [
    { label: 'Name', value: 'Loading...' },
    { label: 'Email', value: 'Loading...' },
    { label: 'Company', value: 'Loading...' },
    { label: 'City', value: 'Loading...' }
  ];

  fields.forEach(({ label, value }) => {
    const box = createElement('div', { className: 'detail-box' });
    box.appendChild(createElement('span', {}, label));
    box.appendChild(createElement('strong', {}, value));
    detailsGrid.appendChild(box);
  });

  card.appendChild(detailsGrid);
  shell.appendChild(card);

  apiFetch<{ id: number; name: string; email: string; company?: { name: string }; address?: { city: string } }>(
    `https://jsonplaceholder.typicode.com/users/${ctx.params.id}`
  )
    .then((user) => {
      titleWrap.innerHTML = '';
      titleWrap.appendChild(createElement('h1', { className: 'profile-name' }, user.name));
      titleWrap.appendChild(createElement('div', { className: 'profile-role' }, `User ID ${user.id} • Team member`));

      detailsGrid.innerHTML = '';
      [
        { label: 'Name', value: user.name },
        { label: 'Email', value: user.email },
        { label: 'Company', value: user.company?.name ?? 'N/A' },
        { label: 'City', value: user.address?.city ?? 'N/A' }
      ].forEach(({ label, value }) => {
        const box = createElement('div', { className: 'detail-box' });
        box.appendChild(createElement('span', {}, label));
        box.appendChild(createElement('strong', {}, value));
        detailsGrid.appendChild(box);
      });
    })
    .catch((err: Error) => {
      titleWrap.innerHTML = '';
      titleWrap.appendChild(createElement('h1', { className: 'profile-name' }, `User ${ctx.params.id}`));
      titleWrap.appendChild(createElement('div', { className: 'profile-role' }, 'Offline profile data'));
      detailsGrid.innerHTML = '';
      const box = createElement('div', { className: 'detail-box' });
      box.appendChild(createElement('span', {}, 'Status'));
      box.appendChild(createElement('strong', {}, `Failed to load user: ${err.message}`));
      detailsGrid.appendChild(box);
    });

  return shell;
}
