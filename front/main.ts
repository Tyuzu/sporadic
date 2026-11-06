import { createRouter } from './src/router/router';
import { createElement } from './src/lib/dom';
import { registerRoutes } from './src/router/routes';

async function bootstrap() {
  const { Navigation, ToastContainer } = await import('./src/components/views');
  const app = document.getElementById('app') || document.body;
  const mainView = createElement('main', { id: 'router-view' });
  const toast = ToastContainer();
  const router = createRouter(mainView);

  app.appendChild(Navigation(router));
  app.appendChild(mainView);
  app.appendChild(toast);

  registerRoutes(router);
  router.navigate(window.location.pathname);
}

void bootstrap();