import { createElement } from '../lib/dom';

export function DragDemoPage(): HTMLElement {
  const shell = createElement('div', { className: 'page-shell drag-demo-shell' });

  const header = createElement('div', { className: 'page-header-row' });
  const titleWrap = createElement('div');
  titleWrap.appendChild(createElement('h1', { className: 'page-title' }, 'Drag & drop demo'));
  titleWrap.appendChild(createElement('p', { className: 'page-subtitle' }, 'Move operational items into the queue.'));
  header.appendChild(titleWrap);
  shell.appendChild(header);

  const panel = createElement('section', { className: 'drag-panel' });
  panel.appendChild(createElement('h2', {}, 'Task queue'));

  const dragRow = createElement('div', { className: 'drag-row' });
  const draggableBox = createElement(
    'div',
    {
      className: 'drag-item',
      draggable: true,
      on: {
        dragstart: (e) => {
          e.dataTransfer?.setData('text/plain', 'Field kit #1');
        }
      }
    },
    'Field kit #1'
  );
  dragRow.appendChild(draggableBox);

  const dropZone = createElement('div', { className: 'drop-zone' }, 'Drop an item here');
  const status = createElement('div', { className: 'status-pill' }, 'Ready for dispatch');

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('is-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('is-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('is-over');
    const data = e.dataTransfer?.getData('text/plain');
    dropZone.textContent = `${data ?? 'Item'} added to queue`;
    status.textContent = 'Item scheduled';
  });

  dragRow.appendChild(dropZone);
  panel.appendChild(dragRow);
  panel.appendChild(status);
  shell.appendChild(panel);
  return shell;
}
