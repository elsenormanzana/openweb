import type { Page, SiteSettings, BlogPost } from "./lib/api";

declare global {
  interface Window {
    __INITIAL_PAGE_DATA__?: Page | null;
    __INITIAL_SITE_SETTINGS__?: SiteSettings | null;
    __INITIAL_BLOG_POSTS__?: BlogPost[] | null;
    __INITIAL_BLOG_POST__?: BlogPost | null;
  }
}
export {};
