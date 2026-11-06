import type { RouterInstance } from './router';

export function registerRoutes(router: RouterInstance): RouterInstance {
  return router
    .add('/', async () => {
      const { HomePage } = await import('../pages/HomePage');
      return HomePage(router);
    })
    .add('/login', async () => {
      const { LoginPage } = await import('../pages/LoginPage');
      return LoginPage(router);
    })
    .add('/user/:id', async (ctx) => {
      const { UserPage } = await import('../pages/UserPage');
      return UserPage(ctx);
    })
    .add('/dashboard', async () => {
      const { DashboardPage } = await import('../pages/DashboardPage');
      return DashboardPage();
    }, [async (ctx) => {
      const { authGuard } = await import('../middleware/authGuard');
      return authGuard(ctx);
    }])
    .add('/drag-demo', async () => {
      const { DragDemoPage } = await import('../pages/DragDemoPage');
      return DragDemoPage();
    });
}
