import type { ComponentChild, EventHandlers, EventMap, Props } from '../types';

export class PubSub<T extends Record<string, any> = Record<string, any>> {
  private events: Map<keyof T, Set<(data: any) => void>> = new Map();

  on<K extends keyof T>(event: K, cb: (data: T[K]) => void): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(cb);
    return () => this.off(event, cb);
  }

  off<K extends keyof T>(event: K, cb: (data: T[K]) => void): void {
    const subs = this.events.get(event);
    if (subs) {
      subs.delete(cb);
      if (subs.size === 0) this.events.delete(event);
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const subs = this.events.get(event);
    if (subs) {
      subs.forEach((cb) => cb(data));
    }
  }
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: ComponentChild[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (props.className) el.className = props.className;
  if (props.id) el.id = props.id;
  if (props.draggable) el.draggable = props.draggable;

  if (props.attributes) {
    for (const [k, v] of Object.entries(props.attributes)) {
      el.setAttribute(k, v);
    }
  }

  if (props.style) {
    Object.assign(el.style, props.style);
  }

  if (props.on) {
    for (const [evtName, handler] of Object.entries(props.on)) {
      if (!handler) continue;

      if (evtName === 'hover') {
        el.addEventListener('mouseenter', handler as EventListener);
        el.addEventListener('mouseleave', handler as EventListener);
      } else {
        el.addEventListener(evtName, handler as EventListener);
      }
    }
  }

  for (const child of children.flat()) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
}

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { params, timeout = 10000, headers, ...customConfig } = options;

  let url = endpoint;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const config: RequestInit = {
    method: customConfig.body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal: controller.signal,
    ...customConfig,
  };

  try {
    const res = await fetch(url, config);
    clearTimeout(id);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw err;
  }
}
