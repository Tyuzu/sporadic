export type EventMap = {
  click: MouseEvent;
  hover: MouseEvent;
  dragstart: DragEvent;
  dragover: DragEvent;
  drop: DragEvent;
  input: InputEvent;
  change: Event;
  submit: SubmitEvent;
};

export type EventHandlers = {
  [K in keyof EventMap]?: (e: EventMap[K]) => void;
};

export interface Props {
  className?: string;
  id?: string;
  attributes?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
  on?: EventHandlers;
  draggable?: boolean;
}

export type ComponentChild = HTMLElement | string | number | null | undefined;

export interface RouteContext {
  params: Record<string, string>;
  query: Record<string, string>;
  pathname: string;
}

export type Middleware = (ctx: RouteContext) => boolean | string | Promise<boolean | string>;
export type RouteHandler = (ctx: RouteContext) => HTMLElement | Promise<HTMLElement>;

export interface Route {
  path: string;
  regex: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  middlewares: Middleware[];
}
