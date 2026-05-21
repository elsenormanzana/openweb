import { createContext, useContext, type ReactNode } from "react";
import type { Page, SiteSettings, BlogPost } from "@/lib/api";

/**
 * Data the server already has when it renders a public page. The web SSR server
 * passes it here; the browser receives the same object via `window.__INITIAL_DATA__`
 * and feeds it back in. Because both sides seed React state from the *same* object,
 * the server HTML and the client's first render are identical — no hydration drift.
 */
export type InitialData = {
  page?: Page | null;
  settings?: SiteSettings | null;
  blogPosts?: BlogPost[] | null;
  blogPost?: BlogPost | null;
};

const InitialDataContext = createContext<InitialData>({});

export function InitialDataProvider({ value, children }: { value: InitialData; children: ReactNode }) {
  return <InitialDataContext.Provider value={value}>{children}</InitialDataContext.Provider>;
}

/** Seed data for the route that was server-rendered. Empty on admin/SPA routes. */
export function useInitialData(): InitialData {
  return useContext(InitialDataContext);
}
