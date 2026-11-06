import { createRouter } from './router/router';
import { createElement } from './lib/dom';
import { AppLayout } from './components/layout';
import { ToastContainer } from './components/ui';
import { registerRoutes } from './router/routes';

async function bootstrap() {
  const app = document.getElementById('app') || document.body;
  const mainView = createElement('main', { id: 'router-view', className: 'app-main-view' });
  const toast = ToastContainer();
  const router = createRouter(mainView);

  app.appendChild(AppLayout(router, mainView));
  app.appendChild(toast);

  registerRoutes(router);
  router.navigate(window.location.pathname);
}

void bootstrap();