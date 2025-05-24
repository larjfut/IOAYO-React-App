/// <reference types="vite/client" />
declare module 'react-markdown';
declare module 'remark-gfm';
declare module 'rehype-raw';
declare module 'rehype-sanitize';

// Minimal stubs for runtime-only dependencies so that `tsc` succeeds
declare module 'react' {
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type Dispatch<A> = (value: A) => void;
  export function useState<S>(
    initialState: S | (() => S)
  ): [S, Dispatch<SetStateAction<S>>];
  export function useRef<T>(initialValue: T | null): { current: T | null };
  export function useCallback<T extends (...args: any[]) => any>(
    fn: T,
    deps: any[]
  ): T;
  export interface FormEvent<T = Element> extends Event {
    target: T;
  }
  export const StrictMode: { (props: { children?: any }): any };
}

declare namespace JSX {
  interface IntrinsicElements {
    [elem: string]: any;
  }
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export function createRoot(container: any): { render(children: any): void };
}

declare module 'axios';
declare module 'nanoid';
declare module '@vitejs/plugin-react';
declare module 'vite';
declare module '*.css';
