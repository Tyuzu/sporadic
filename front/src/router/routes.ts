import type { RouterInstance } from './router';
import { DashboardPage, DragDemoPage, HomePage, LoginPage, UserPage } from '../pages';

export function registerRoutes(router: RouterInstance): RouterInstance {
  return router
    .add('/', async () => HomePage(router))
    .add('/login', async () => LoginPage(router))
    .add('/user/:id', async (ctx) => UserPage(ctx))
    .add('/dashboard', async () => DashboardPage(), [async (ctx) => {
      const { authGuard } = await import('../middleware/authGuard');
      return authGuard(ctx);
    }])
    .add('/drag-demo', async () => DragDemoPage());
}
