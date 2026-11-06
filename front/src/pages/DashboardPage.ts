import { createElement } from '../lib/dom';

export function DashboardPage(): HTMLElement {
  const shell = createElement('div', { className: 'page-shell' });

  const header = createElement('div', { className: 'page-header-row' });
  const titleWrap = createElement('div');
  titleWrap.appendChild(createElement('h1', { className: 'page-title' }, 'Operations dashboard'));
  titleWrap.appendChild(createElement('p', { className: 'page-subtitle' }, 'Overview of field performance and work execution.'));
  header.appendChild(titleWrap);
  header.appendChild(createElement('button', { className: 'page-action' }, 'Export report'));
  shell.appendChild(header);

  const kpiGrid = createElement('div', { className: 'kpi-grid' });
  [
    { label: 'Active farms', value: '12', trend: '+2 this month' },
    { label: 'Tasks completed', value: '284', trend: '+18%' },
    { label: 'Inventory accuracy', value: '97.2%', trend: '+1.4%' },
    { label: 'Avg. turnaround', value: '3.4 days', trend: '-0.6 days' }
  ].forEach(({ label, value, trend }) => {
    const card = createElement('div', { className: 'kpi-card' });
    card.appendChild(createElement('span', { className: 'kpi-label' }, label));
    card.appendChild(createElement('div', { className: 'kpi-value' }, value));
    card.appendChild(createElement('span', { className: 'kpi-trend' }, trend));
    kpiGrid.appendChild(card);
  });
  shell.appendChild(kpiGrid);

  const dashboardGrid = createElement('div', { className: 'dashboard-grid' });

  const mainCard = createElement('section', { className: 'section-card' });
  const mainHeading = createElement('div', { className: 'section-heading' });
  mainHeading.appendChild(createElement('h2', {}, 'Performance trend'));
  mainHeading.appendChild(createElement('span', { className: 'link-muted' }, 'Last 30 days'));
  mainCard.appendChild(mainHeading);

  const bars = createElement('div', { className: 'chart-bars' });
  [32, 44, 58, 46, 72, 83, 68].forEach((height) => {
    const bar = createElement('div', { className: 'chart-bar', style: { height: `${height}%` } });
    bars.appendChild(bar);
  });
  mainCard.appendChild(bars);
  dashboardGrid.appendChild(mainCard);

  const sideCard = createElement('aside', { className: 'section-card' });
  sideCard.appendChild(createElement('h3', {}, 'Priority tasks'));
  const taskList = createElement('ul', { className: 'task-list' });
  [
    { title: 'Field irrigation check', time: 'Due today', badge: 'On track', type: 'success' },
    { title: 'Harvest planning', time: 'Due tomorrow', badge: 'Review', type: 'warning' },
    { title: 'Supplier follow-up', time: 'Due in 2 days', badge: 'Action', type: 'primary' }
  ].forEach(({ title, time, badge, type }) => {
    const item = createElement('li', { className: 'task-item' });
    const meta = createElement('div', { className: 'task-meta' });
    meta.appendChild(createElement('strong', {}, title));
    meta.appendChild(createElement('span', {}, time));
    item.appendChild(meta);
    const tag = createElement('span', { className: `badge badge--${type}` }, badge);
    item.appendChild(tag);
    taskList.appendChild(item);
  });
  sideCard.appendChild(taskList);
  dashboardGrid.appendChild(sideCard);
  shell.appendChild(dashboardGrid);

  const bottomCard = createElement('section', { className: 'section-card' });
  const bottomHeading = createElement('div', { className: 'section-heading' });
  bottomHeading.appendChild(createElement('h2', {}, 'Recent activity'));
  bottomHeading.appendChild(createElement('span', { className: 'link-muted' }, 'Updated 5 min ago'));
  bottomCard.appendChild(bottomHeading);

  const activityList = createElement('ul', { className: 'activity-list' });
  [
    { title: 'Team verified field A3', detail: 'Crew 2 • 09:10 AM', badge: 'Confirmed' },
    { title: 'Inventory count completed', detail: 'Warehouse • 08:45 AM', badge: 'Synced' },
    { title: 'Irrigation pipeline flagged', detail: 'North block • 07:30 AM', badge: 'Needs review' }
  ].forEach(({ title, detail, badge }) => {
    const item = createElement('li', { className: 'activity-item' });
    const meta = createElement('div', { className: 'activity-meta' });
    meta.appendChild(createElement('strong', {}, title));
    meta.appendChild(createElement('span', {}, detail));
    item.appendChild(meta);
    item.appendChild(createElement('span', { className: 'badge badge--success' }, badge));
    activityList.appendChild(item);
  });
  bottomCard.appendChild(activityList);
  shell.appendChild(bottomCard);

  return shell;
}
