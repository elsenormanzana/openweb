import { useEffect } from "react";

export type SeoHeadProps = {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
  siteName?: string;
};

function upsertMeta(attr: "name" | "property", key: string, value: string): Element {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
  return el;
}

function upsertLink(rel: string, href: string): Element {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return el;
}

export function useSeoHead({ title, description, keywords, ogImage, canonical, noIndex, siteName }: SeoHeadProps) {
  useEffect(() => {
    const els: Element[] = [];
    const prevTitle = document.title;

    if (title) document.title = title;
    if (description) els.push(upsertMeta("name", "description", description));
    if (keywords) els.push(upsertMeta("name", "keywords", keywords));
    els.push(upsertMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow"));
    if (title) els.push(upsertMeta("property", "og:title", title));
    if (description) els.push(upsertMeta("property", "og:description", description));
    if (ogImage) els.push(upsertMeta("property", "og:image", ogImage));
    els.push(upsertMeta("property", "og:type", "website"));
    if (siteName) els.push(upsertMeta("property", "og:site_name", siteName));
    els.push(upsertMeta("name", "twitter:card", ogImage ? "summary_large_image" : "summary"));
    if (title) els.push(upsertMeta("name", "twitter:title", title));
    if (description) els.push(upsertMeta("name", "twitter:description", description));
    if (ogImage) els.push(upsertMeta("name", "twitter:image", ogImage));
    if (canonical) els.push(upsertLink("canonical", canonical));

    return () => {
      document.title = prevTitle;
      els.forEach((el) => el.remove());
    };
  }, [title, description, keywords, ogImage, canonical, noIndex, siteName]);
}
