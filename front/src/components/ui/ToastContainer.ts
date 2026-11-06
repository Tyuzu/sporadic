import { createElement } from '../../lib/dom';
import { bus } from '../../state/store';

export function ToastContainer(): HTMLElement {
  const toastEl = createElement('div', { className: 'app-toast app-toast--info' });
  let timer: number | undefined;

  bus.on('toast', ({ message, type }) => {
    toastEl.textContent = message;
    toastEl.classList.remove('app-toast--info', 'app-toast--error');
    toastEl.classList.add(type === 'error' ? 'app-toast--error' : 'app-toast--info');
    toastEl.classList.add('is-visible');

    if (timer) {
      clearTimeout(timer);
    }

    timer = window.setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 3000);
  });

  return toastEl;
}
