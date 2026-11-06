import { createRouter } from './src/router/router';
import { createElement } from './src/lib/dom';
import { AppLayout } from './src/components/layout';
import { ToastContainer } from './src/ui';
import { registerRoutes } from './src/router/routes';

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