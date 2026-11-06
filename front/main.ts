import { createRouter } from './src/router/router';
import { authGuard } from './src/middleware/authGuard';
import { Navigation, HomePage, LoginPage, UserPage, DashboardPage, DragDemoPage, ToastContainer } from './src/components/views';
import { createElement } from './src/lib/dom';

const app = document.getElementById('app') || document.body;
const mainView = createElement('main', { id: 'router-view' });
const toast = ToastContainer();
const router = createRouter(mainView);

app.appendChild(Navigation(router));
app.appendChild(mainView);
app.appendChild(toast);

router
  .add('/', () => HomePage(router))
  .add('/login', () => LoginPage(router))
  .add('/user/:id', UserPage)
  .add('/dashboard', DashboardPage, [authGuard])
  .add('/drag-demo', DragDemoPage);

router.navigate(window.location.pathname);