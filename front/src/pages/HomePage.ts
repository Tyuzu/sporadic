import { createElement } from '../lib/dom';
import { bus, isAuthenticated, setAuthenticated, setRedirectAfterLogin } from '../state/store';
import type { RouterInstance } from '../router/router';

export function HomePage(router: RouterInstance): HTMLElement {
  const shell = createElement('div', { className: 'page-shell' });

  const hero = createElement('section', { className: 'hero-panel' });
  const heroCopy = createElement('div', { className: 'hero-copy' });

  heroCopy.appendChild(createElement('span', { className: 'pill' }, 'Operational intelligence'));
  heroCopy.appendChild(createElement('h1', {}, 'Smart farm workflows, built for daily decisions.'));
  heroCopy.appendChild(
    createElement(
      'p',
      {},
      'Track every field, simplify handoffs, and keep your teams moving with a live operating system designed for modern agriculture.'
    )
  );

  const ctaRow = createElement('div', { className: 'cta-row' });
  const primaryAction = createElement(
    'button',
    {
      className: 'primary-btn',
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
        }
      }
    },
    isAuthenticated ? 'Log out' : 'Open dashboard'
  );
  const secondaryAction = createElement(
    'button',
    {
      className: 'secondary-btn',
      on: {
        click: () => router.navigate('/dashboard')
      }
    },
    'View insights'
  );

  ctaRow.appendChild(primaryAction);
  ctaRow.appendChild(secondaryAction);
  heroCopy.appendChild(ctaRow);

  const heroStats = createElement('div', { className: 'hero-stats' });
  const stats = [
    { value: '96%', label: 'Field retention' },
    { value: '18', label: 'Active tasks' },
    { value: '4.8/5', label: 'Team satisfaction' }
  ];

  stats.forEach(({ value, label }) => {
    const item = createElement('div', { className: 'stat-mini' });
    item.appendChild(createElement('strong', {}, value));
    item.appendChild(createElement('span', {}, label));
    heroStats.appendChild(item);
  });

  hero.appendChild(heroCopy);
  hero.appendChild(heroStats);
  shell.appendChild(hero);

  const metrics = createElement('div', { className: 'metrics-grid' });
  [
    { label: 'Yield this week', value: '2.4 t', trend: '+12.6%' },
    { label: 'Water usage', value: '84%', trend: '-8.3%' },
    { label: 'Farm health', value: 'Good', trend: '+3.1%' },
    { label: 'Response time', value: '1.8h', trend: '-21%' }
  ].forEach(({ label, value, trend }) => {
    const card = createElement('div', { className: 'metric-card' });
    card.appendChild(createElement('span', { className: 'metric-label' }, label));
    card.appendChild(createElement('div', { className: 'metric-value' }, value));
    card.appendChild(createElement('span', { className: 'metric-trend' }, trend));
    metrics.appendChild(card);
  });

  shell.appendChild(metrics);

  const featureSection = createElement('section', { className: 'section-card' });
  const heading = createElement('div', { className: 'section-heading' });
  heading.appendChild(createElement('h2', {}, 'Why teams choose Simpo'));
  heading.appendChild(createElement('span', { className: 'link-muted' }, 'Built for action'));
  featureSection.appendChild(heading);

  const featureGrid = createElement('div', { className: 'feature-grid' });
  [
    { icon: '01', title: 'Unified monitoring', text: 'Bring crop health, labor, and logistics into one real-time view.' },
    { icon: '02', title: 'Smart scheduling', text: 'Keep tasks and field visits aligned with team capacity and urgency.' },
    { icon: '03', title: 'Actionable reporting', text: 'Turn operational trends into decisions with immediate context and insight.' }
  ].forEach(({ icon, title, text }) => {
    const item = createElement('div', { className: 'feature-card' });
    item.appendChild(createElement('div', { className: 'feature-icon' }, icon));
    item.appendChild(createElement('h3', {}, title));
    item.appendChild(createElement('p', {}, text));
    featureGrid.appendChild(item);
  });

  featureSection.appendChild(featureGrid);
  shell.appendChild(featureSection);

  return shell;
}
