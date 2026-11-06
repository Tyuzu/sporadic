import { createElement } from '../../lib/dom';
import { bus } from '../../state/store';

export function ToastContainer(): HTMLElement {
  const toastEl = createElement('div', {
    style: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '1rem',
      background: '#0f172a',
      color: '#fff',
      border: '1px solid #334155',
      borderRadius: '4px',
      display: 'none',
      zIndex: '50'
    }
  });

  bus.on('toast', ({ message, type }) => {
    toastEl.textContent = message;
    toastEl.style.borderColor = type === 'error' ? '#ef4444' : '#3b82f6';
    toastEl.style.display = 'block';
    setTimeout(() => {
      toastEl.style.display = 'none';
    }, 3000);
  });

  return toastEl;
}
