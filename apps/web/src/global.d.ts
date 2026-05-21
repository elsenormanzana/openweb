import type { InitialData } from "./lib/initialData";

declare global {
  interface Window {
    /** Seed data embedded by the web SSR server for the rendered public route. */
    __INITIAL_DATA__?: InitialData;
  }
}
export {};
