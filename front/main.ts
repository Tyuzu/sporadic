import { createRouter } from './src/router/router';
import { createElement } from './src/lib/dom';

async function bootstrap() {
  const { Navigation, ToastContainer } = await import('./src/components/views');
  const app = document.getElementById('app') || document.body;
  const mainView = createElement('main', { id: 'router-view' });
  const toast = ToastContainer();
  const router = createRouter(mainView);

  app.appendChild(Navigation(router));
  app.appendChild(mainView);
  app.appendChild(toast);

  router
    .add('/', async () => {
      const { HomePage } = await import('./src/components/views');
      return HomePage(router);
    })
    .add('/login', async () => {
      const { LoginPage } = await import('./src/components/views');
      return LoginPage(router);
    })
    .add('/user/:id', async (ctx) => {
      const { UserPage } = await import('./src/components/views');
      return UserPage(ctx);
    })
    .add('/dashboard', async () => {
      const { DashboardPage } = await import('./src/components/views');
      return DashboardPage();
    }, [async (ctx) => {
      const { authGuard } = await import('./src/middleware/authGuard');
      return authGuard(ctx);
    }])
    .add('/drag-demo', async () => {
      const { DragDemoPage } = await import('./src/components/views');
      return DragDemoPage();
    });

  router.navigate(window.location.pathname);
}

void bootstrap();