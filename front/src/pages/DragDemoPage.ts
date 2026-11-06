import { createElement } from '../lib/dom';

export function DragDemoPage(): HTMLElement {
  const dropZone = createElement(
    'div',
    {
      style: {
        width: '300px',
        height: '150px',
        border: '2px dashed #94a3b8',
        marginTop: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      on: {
        dragover: (e) => {
          e.preventDefault();
          dropZone.style.background = '#334155';
        },
        drop: (e) => {
          e.preventDefault();
          dropZone.style.background = 'transparent';
          const data = e.dataTransfer?.getData('text/plain');
          dropZone.textContent = `Dropped item: ${data}`;
        }
      }
    },
    'Drop Item Here'
  );

  const draggableBox = createElement(
    'div',
    {
      draggable: true,
      style: {
        width: '100px',
        padding: '0.5rem',
        background: '#3b82f6',
        color: '#fff',
        cursor: 'grab',
        textAlign: 'center'
      },
      on: {
        dragstart: (e) => {
          e.dataTransfer?.setData('text/plain', 'Draggable Widget #1');
        }
      }
    },
    'Drag Me'
  );

  return createElement(
    'div',
    { style: { padding: '1rem' } },
    createElement('h1', {}, 'Drag and Drop Interactive Component'),
    draggableBox,
    dropZone
  );
}
