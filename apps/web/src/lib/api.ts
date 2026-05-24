import { emitDataChange } from "@/lib/dataEvents";

export type Page = {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  isHomepage: boolean;
  ignoreGlobalLayout: boolean;
  disableElevatedNavSpacing: boolean;
  theme: "auto" | "light" | "dark";
  siteId: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  ogImage: string | null;
  noIndex: boolean;
  canonicalUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ThemePack = {
  id: number;
  siteId: number;
  name: string;
  slug: string;
  cssContent: string | null;
};

export type MediaItem = {
  id: number;
  siteId: number;
  filename: string;
  mimeType: string;
  size: string | null;
  url: string;
  provider: string;
  providerPath: string | null;
  createdAt: string;
};

export type Site = {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  subDomain: string | null;
  routingMode: string;
  isDefault: boolean;
  createdAt: string;
};

export type SiteRole = { siteId: number; role: string };
export type UserSocial = { platform: string; url: string };
export type BlogStatus = "draft" | "pending_review" | "approved" | "published" | "rejected";
export type FormFieldType =
  | "text" | "email" | "textarea" | "select" | "checkbox"
  | "multiple_choice" | "checkboxes" | "dropdown" | "number" | "date" | "time"
  | "linear_scale" | "rating" | "file" | "grid_multiple_choice" | "grid_checkbox";
export type FontPreset = "default" | "serif" | "mono" | "rounded" | "playful";
export type ConditionOperator = "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
export type ConditionRule = { field: string; operator: ConditionOperator; value?: string };
export type Condition = { match: "all" | "any"; rules: ConditionRule[] };
export type FormLayout = "single" | "steps";
export type FormFieldValidation = {
  kind: "none" | "regex" | "number" | "length";
  pattern?: string;
  min?: number;
  max?: number;
  message?: string;
};
export type SectionRouting = { kind: "next" | "goto" | "submit"; targetSectionId?: string };
export type FormField = {
  id: string;
  label: string;
  name: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
  condition?: Condition | null;
  validation?: FormFieldValidation | null;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  ratingMax?: number;
  ratingIcon?: "star" | "heart";
  rows?: string[];
  columns?: string[];
  fileAccept?: string;
  fileMaxMB?: number;
  fileMaxCount?: number;
  points?: number;
  correctAnswers?: string[];
  correctGrid?: Record<string, string[]>;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  optionRouting?: Record<string, string>;
};
export type FormSection = {
  id: string;
  title: string;
  description?: string;
  condition?: Condition | null;
  afterSection?: SectionRouting | null;
  fields: FormField[];
};
export type FormTheme = {
  headerImage: string;
  themeColor: string;
  backgroundColor: string;
  headerFont: FontPreset;
  questionFont: FontPreset;
  textFont: FontPreset;
};
export type FormSettings = {
  acceptingResponses: boolean;
  closedMessage: string;
  responseLimit: number;
  isQuiz: boolean;
  showScoreImmediately: boolean;
  collectEmail: boolean;
  showProgressBar: boolean;
};
export type FormFile = { url: string; name: string; size: number; mime: string };
export type FieldTranslations = {
  label?: string;
  description?: string;
  placeholder?: string;
  options?: string[];
  rows?: string[];
  columns?: string[];
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
};
export type SectionTranslations = { title?: string; description?: string };
export type FormTranslations = {
  name?: string;
  description?: string;
  submitLabel?: string;
  successMessage?: string;
  closedMessage?: string;
  sections?: Record<string, SectionTranslations>;
  fields?: Record<string, FieldTranslations>;
};
export type QuizScoreBreakdown = {
  name: string; label: string; points: number; earned: number; correct: boolean;
};
export type QuizScore = {
  earned: number;
  total: number;
  percent: number;
  breakdown: QuizScoreBreakdown[];
};

export type User = {
  id: number;
  email: string;
  role: "admin" | "page_developer" | "subscriber" | "blogger" | "blogger_admin";
  siteId: number | null;
  siteRoles: SiteRole[] | null;
  bio: string | null;
  avatarUrl: string | null;
  socialMedia: UserSocial[] | null;
  position: string | null;
  createdAt: string;
};

export type Plugin = {
  id: number;
  siteId: number;
  name: string;
  slug: string;
  description: string | null;
  author?: string | null;
  authors?: string[] | null;
  version?: string | null;
  website?: string | null;
  hasServer?: boolean;
  hasClient?: boolean;
  serverCode?: string | null;
  clientCode?: string | null;
  enabled: boolean;
  createdAt: string;
};

export type BlogCategory = {
  id: number;
  siteId: number;
  name: string;
  slug: string;
  createdAt: string;
};

export type BlogTag = {
  id: number;
  siteId: number;
  name: string;
  slug: string;
  createdAt: string;
};

export type BlogPost = {
  id: number;
  siteId: number;
  title: string;
  description: string | null;
  content: string | null;
  slug: string;
  status: BlogStatus;
  datePublished: string | null;
  headerImage: string | null;
  approvalNotes: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
  authors: User[];
  categories: BlogCategory[];
  tags: BlogTag[];
};

export type CmsForm = {
  id: number;
  siteId: number;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "inactive";
  submitLabel: string;
  successMessage: string;
  layout: FormLayout;
  sections: FormSection[];
  fields: FormField[];
  theme: FormTheme;
  settings: FormSettings;
  primaryLanguage: string;
  translations: Record<string, FormTranslations>;
  createdAt: string;
  updatedAt: string;
};

export type FormResponse = {
  id: number;
  formId: number | null;
  siteId: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: "new" | "contacted" | "qualified" | "lost";
  createdAt: string;
  updatedAt: string;
  values: Record<string, unknown>;
  meta: Record<string, unknown>;
  score: QuizScore | null;
  userAgent: string;
  ip: string;
};

export type NewsletterSubscriber = {
  id: number;
  siteId: number;
  email: string;
  name: string | null;
  status: "subscribed" | "unsubscribed";
  source: string;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CrmChannelType =
  | "newsletter" | "form" | "facebook" | "linkedin" | "instagram"
  | "tiktok" | "twitter" | "youtube" | "whatsapp" | "custom";

export type CrmChannel = {
  id: number;
  siteId: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  channelType: CrmChannelType;
  createdAt: string;
  updatedAt: string;
};

export type CrmLead = {
  id: number;
  siteId: number;
  formId: number | null;
  channelId: number | null;
  source: "form" | "newsletter" | "custom";
  status: "new" | "contacted" | "qualified" | "lost";
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  payload: Record<string, unknown>;
  archived: boolean;
  tags: string[];
  customFields: Record<string, string>;
  score: number;
  createdAt: string;
  updatedAt: string;
  channel?: CrmChannel | null;
};

export type CrmLeadActivity = {
  id: number;
  leadId: number;
  siteId: number;
  type: "note" | "call" | "email" | "meeting" | "status_change";
  content: string | null;
  createdBy: number | null;
  createdByEmail?: string | null;
  createdAt: string;
};

export type CrmAnalytics = {
  totals: {
    activeLeads: number;
    archivedLeads: number;
    newLeads: number;
    contactedLeads: number;
    qualifiedLeads: number;
    lostLeads: number;
    avgScore: number;
    leadsLast30d: number;
    leadsLast7d: number;
  };
  byChannel: {
    channel_name: string;
    channel_type: string;
    slug: string;
    leads: string;
    qualified: string;
  }[];
  trend30d: { day: string; leads: string }[];
};

import type { ColorPalette } from "@/lib/palette";
export type { ColorPalette };
export type NavLink = { label: string; href: string };
export type NavDropdownChildLink = { label: string; href: string };
export type NavDropdownLink = { label: string; href: string; title?: string; children?: NavDropdownChildLink[] };
export type NavDropdownGroup = { title: string; links: NavDropdownLink[] };
export type NavMenuItem = { label: string; href?: string; dropdown?: NavDropdownGroup[] };

export type NavConfig = {
  logoText?: string;
  logoImage?: string;
  logoHref?: string;
  navLinks?: NavMenuItem[];
  navVariant?: "minimal" | "elevated" | "saas-cta" | "saas-email";
  navLinkStyle?: "classic" | "underline" | "pill" | "art-gradient";
  dropdownStyle?: "minimal" | "modern-card" | "gradient-border" | "glassmorphic";
  dropdownAnimation?: "fade" | "slide-up" | "scale-up" | "fade-slide";
  palette?: ColorPalette;
  headerStyle?: "transparent" | "solid";
  headerBg?: string;
  headerTextColor?: string;
  themeToggle?: "hidden" | "nav" | "actions";
  defaultTheme?: "light" | "dark";
  ctaPrimaryText?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryText?: string;
  ctaSecondaryHref?: string;
  heroBadge?: string;
  heroHeadline?: string;
  heroDescription?: string;
};

export type FooterColumn = { heading: string; text: string; links: NavLink[] };
export type FooterConfig = { copyright?: string; links?: NavLink[]; columns?: FooterColumn[] };

export type SocialProfile = { platform: string; url: string };

export type SeoConfig = {
  siteName?: string;
  siteTitle?: string;
  siteSubtitle?: string;
  globalSiteName?: string;
  siteUrl?: string;
  favicon?: string;
  defaultDescription?: string;
  defaultOgImage?: string;
  googleVerification?: string;
  bingVerification?: string;
  yandexVerification?: string;
  googleAnalyticsId?: string;
  businessType?: "WebSite" | "Organization" | "LocalBusiness" | "Person";
  businessName?: string;
  businessDescription?: string;
  businessStreet?: string;
  businessCity?: string;
  businessState?: string;
  businessZip?: string;
  businessCountry?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessLogo?: string;
  socialProfiles?: SocialProfile[];
  robotsTxt?: string;
  enableSitemap?: boolean;
};

export type SiteSettings = {
  navType: string;
  navConfig: NavConfig;
  footerConfig: FooterConfig;
  seoConfig: SeoConfig;
  blogApprovalMode?: boolean;
  aiConfig?: any;
  hasSystemGoogleOauth?: boolean;
};

export type StorageConfig = {
  provider: string;
  config: Record<string, string>;
};

export type SiteContext = {
  site: Site;
  canSwitchSites: boolean;
};

export type BackupItem = {
  name: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
};

export type SslCertificate = {
  domain: string;
  domains: string[];
  fullchainPath: string;
  privkeyPath: string;
  createdAt: string;
  expiresAt: string | null;
  provider: "letsencrypt" | "cloudflared";
  organization?: string | null;
  organizationUnit?: string | null;
};

export type SslAutoRenewStatus = {
  enabled: boolean;
  intervalHours: number;
  state: {
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
  };
  postHookConfigured: boolean;
};

export type NginxSslServerConfig = {
  siteId: number;
  siteName: string;
  domain: string | null;
  subDomain: string | null;
  host: string;
  enabled: boolean;
};


function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("openweb_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Site-scoped users always use their own siteId; global admins use the switcher
  const raw = localStorage.getItem("openweb_user");
  const userSiteId = raw ? (JSON.parse(raw) as { siteId?: number | null }).siteId : null;
  const siteId = userSiteId != null ? String(userSiteId) : sessionStorage.getItem("openweb_site_id");
  if (siteId && /^\d+$/.test(siteId)) headers["X-Site-ID"] = siteId;
  return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...getAuthHeaders() };
  if (options?.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
  if (!res.ok) {
    if (res.status === 403 && window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin") {
      window.location.assign("/admin");
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  const data = await (res.json() as Promise<T>);
  const method = (options?.method ?? "GET").toUpperCase();
  if (method !== "GET") emitDataChange({ method, path: url });
  return data;
}

export const api = {
  auth: {
    me: () => request<User>("/api/auth/me"),
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
  },
  siteContext: {
    get: async (): Promise<SiteContext> => {
      const me = await api.auth.me();
      if (me.siteId != null) {
        return {
          site: {
            id: me.siteId,
            name: `Site ${me.siteId}`,
            slug: `site-${me.siteId}`,
            domain: null,
            subDomain: null,
            routingMode: "url",
            isDefault: false,
            createdAt: new Date().toISOString(),
          },
          canSwitchSites: false,
        };
      }

      const sites = await api.sites.list().catch(() => []);
      const currentId = Number(sessionStorage.getItem("openweb_site_id"));
      const active = Number.isInteger(currentId) && currentId > 0
        ? sites.find((s) => s.id === currentId)
        : sites.find((s) => s.isDefault) ?? sites[0];
      return {
        site: active ?? {
          id: 1,
          name: "Default Site",
          slug: "default-site",
          domain: null,
          subDomain: null,
          routingMode: "url",
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
        canSwitchSites: true,
      };
    },
  },
  pages: {
    list: () => request<Page[]>("/api/pages"),
    get: (id: number) => request<Page>(`/api/pages/${id}`),
    getBySlug: (slug: string) => request<Page>(`/api/pages/by-slug/${encodeURIComponent(slug)}`),
    create: (body: { title: string; slug: string; content?: string }) =>
      request<Page>("/api/pages", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Pick<Page, "title" | "slug" | "content" | "isHomepage" | "ignoreGlobalLayout" | "disableElevatedNavSpacing" | "theme" | "seoTitle" | "seoDescription" | "seoKeywords" | "ogImage" | "noIndex" | "canonicalUrl">>) =>
      request<Page>(`/api/pages/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) => request<{ ok: true }>(`/api/pages/${id}`, { method: "DELETE" }),
  },
  homepage: {
    get: () => request<Page | null>("/api/homepage"),
    setPageId: (pageId: number) =>
      request<Page>("/api/homepage", { method: "PUT", body: JSON.stringify({ pageId }) }),
  },
  themePacks: {
    list: () => request<ThemePack[]>("/api/theme-packs"),
    get: (id: number) => request<ThemePack>(`/api/theme-packs/${id}`),
    create: (body: { name: string; slug?: string; cssContent?: string }) =>
      request<ThemePack>("/api/theme-packs", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: { name?: string; slug?: string; cssContent?: string }) =>
      request<ThemePack>(`/api/theme-packs/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) => request<{ ok: true }>(`/api/theme-packs/${id}`, { method: "DELETE" }),
  },
  siteSettings: {
    get: () => request<SiteSettings>("/api/site-settings"),
    update: (body: Partial<SiteSettings>) =>
      request<SiteSettings>("/api/site-settings", { method: "PUT", body: JSON.stringify(body) }),
  },
  storageConfig: {
    get: () => request<StorageConfig>("/api/storage-config"),
    update: (body: { provider?: string; config?: Record<string, string> }) =>
      request<StorageConfig>("/api/storage-config", { method: "PUT", body: JSON.stringify(body) }),
  },
  media: {
    list: () => request<MediaItem[]>("/api/media"),
    delete: (id: number) => request<{ ok: true }>(`/api/media/${id}`, { method: "DELETE" }),
    upload: async (file: File): Promise<MediaItem> => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: form,
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 403 && window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin") {
          window.location.assign("/admin");
        }
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? "Upload failed");
      }
      const data = await (res.json() as Promise<MediaItem>);
      emitDataChange({ method: "POST", path: "/api/media/upload" });
      return data;
    },
  },
  sites: {
    list: () => request<Site[]>("/api/sites"),
    create: (body: { name: string; slug?: string; domain?: string; subDomain?: string; routingMode?: string; isDefault?: boolean; adminEmail?: string; adminPassword?: string }) =>
      request<Site & { adminUser?: User }>("/api/sites", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Pick<Site, "name" | "domain" | "subDomain" | "routingMode" | "isDefault">>) =>
      request<Site>(`/api/sites/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) => request<{ ok: true }>(`/api/sites/${id}`, { method: "DELETE" }),
  },
  users: {
    list: () => request<User[]>("/api/users"),
    create: (body: { email: string; password: string; role?: string; siteId?: number | null; siteRoles?: SiteRole[]; bio?: string | null; avatarUrl?: string | null; socialMedia?: UserSocial[] | null; position?: string | null }) =>
      request<User>("/api/users", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: { email?: string; password?: string; role?: string; siteId?: number | null; siteRoles?: SiteRole[]; bio?: string | null; avatarUrl?: string | null; socialMedia?: UserSocial[] | null; position?: string | null }) =>
      request<User>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) => request<{ ok: true }>(`/api/users/${id}`, { method: "DELETE" }),
  },
  profile: {
    get: () => request<User>("/api/profile"),
    update: (body: { email?: string; password?: string; bio?: string | null; avatarUrl?: string | null; socialMedia?: UserSocial[] | null; position?: string | null }) =>
      request<User>("/api/profile", { method: "PUT", body: JSON.stringify(body) }),
  },
  plugins: {
    list: () => request<Plugin[]>("/api/plugins"),
    listActiveClient: () => request<Array<{ slug: string; hasClient: boolean }>>("/api/plugins/client-active"),
    upload: async (file: File): Promise<Plugin> => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/plugins/upload", {
        method: "POST",
        body: form,
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 403 && window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin") {
          window.location.assign("/admin");
        }
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? "Upload failed");
      }
      const data = await (res.json() as Promise<Plugin>);
      emitDataChange({ method: "POST", path: "/api/plugins/upload" });
      return data;
    },
    update: (id: number, body: Partial<Pick<Plugin, "enabled">>) =>
      request<Plugin>(`/api/plugins/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: number) => request<{ ok: true }>(`/api/plugins/${id}`, { method: "DELETE" }),
    reload: (id: number) => request<{ ok: true; message: string }>(`/api/plugins/${id}/reload`, { method: "POST" }),
  },
  blog: {
    settings: {
      get: () => request<{ approvalMode: boolean }>("/api/blog/settings"),
      update: (body: { approvalMode: boolean }) => request<{ approvalMode: boolean }>("/api/blog/settings", { method: "PUT", body: JSON.stringify(body) }),
    },
    categories: {
      list: () => request<BlogCategory[]>("/api/blog/categories"),
      create: (body: { name: string; slug?: string }) => request<BlogCategory>("/api/blog/categories", { method: "POST", body: JSON.stringify(body) }),
      update: (id: number, body: { name?: string; slug?: string }) => request<BlogCategory>(`/api/blog/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),
      delete: (id: number) => request<{ ok: true }>(`/api/blog/categories/${id}`, { method: "DELETE" }),
    },
    tags: {
      list: () => request<BlogTag[]>("/api/blog/tags"),
      create: (body: { name: string; slug?: string }) => request<BlogTag>("/api/blog/tags", { method: "POST", body: JSON.stringify(body) }),
      update: (id: number, body: { name?: string; slug?: string }) => request<BlogTag>(`/api/blog/tags/${id}`, { method: "PUT", body: JSON.stringify(body) }),
      delete: (id: number) => request<{ ok: true }>(`/api/blog/tags/${id}`, { method: "DELETE" }),
    },
    posts: {
      list: () => request<BlogPost[]>("/api/blog/posts"),
      get: (id: number) => request<BlogPost>(`/api/blog/posts/${id}`),
      create: (body: Partial<BlogPost> & { title: string; slug?: string; authorIds?: number[]; categoryIds?: number[]; tagIds?: number[] }) =>
        request<BlogPost>("/api/blog/posts", { method: "POST", body: JSON.stringify(body) }),
      update: (id: number, body: Partial<BlogPost> & { authorIds?: number[]; categoryIds?: number[]; tagIds?: number[] }) =>
        request<BlogPost>(`/api/blog/posts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
      delete: (id: number) => request<{ ok: true }>(`/api/blog/posts/${id}`, { method: "DELETE" }),
      submit: (id: number) => request<BlogPost>(`/api/blog/posts/${id}/submit`, { method: "POST" }),
      approve: (id: number, body?: { publish?: boolean; notes?: string | null }) => request<BlogPost>(`/api/blog/posts/${id}/approve`, { method: "POST", body: JSON.stringify(body ?? {}) }),
      reject: (id: number, body?: { notes?: string | null }) => request<BlogPost>(`/api/blog/posts/${id}/reject`, { method: "POST", body: JSON.stringify(body ?? {}) }),
    },
    public: {
      list: () => request<BlogPost[]>("/api/blog/public/posts"),
      getBySlug: (slug: string) => request<BlogPost>(`/api/blog/public/posts/${encodeURIComponent(slug)}`),
    },
  },
  forms: {
    list: () => request<CmsForm[]>("/api/forms"),
    get: (id: number) => request<CmsForm>(`/api/forms/${id}`),
    getBySlug: (slug: string) => request<CmsForm>(`/api/forms/by-slug/${encodeURIComponent(slug)}`),
    create: (body: { name: string; slug?: string; description?: string | null; status?: "active" | "inactive"; submitLabel?: string; successMessage?: string; layout?: FormLayout; sections?: FormSection[]; fields?: FormField[]; theme?: FormTheme; settings?: FormSettings; primaryLanguage?: string; translations?: Record<string, FormTranslations> }) =>
      request<CmsForm>("/api/forms", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Pick<CmsForm, "name" | "slug" | "description" | "status" | "submitLabel" | "successMessage" | "layout" | "sections" | "fields" | "theme" | "settings" | "primaryLanguage" | "translations">>) =>
      request<CmsForm>(`/api/forms/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    translate: (id: number, targetLang: string, languageName?: string) =>
      request<{ translations: FormTranslations; warning?: string }>(`/api/forms/${id}/translate`, {
        method: "POST", body: JSON.stringify({ targetLang, languageName }),
      }),
    delete: (id: number) => request<{ ok: true }>(`/api/forms/${id}`, { method: "DELETE" }),
    submit: (slug: string, body: { values: Record<string, unknown>; meta?: Record<string, unknown> }) =>
      request<{ ok: true; message: string; lead: CrmLead; score: QuizScore | null }>(`/api/forms/submit/${encodeURIComponent(slug)}`, { method: "POST", body: JSON.stringify(body) }),
    uploadFile: (slug: string, file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return request<FormFile>(`/api/forms/${encodeURIComponent(slug)}/upload`, { method: "POST", body: fd });
    },
    responses: {
      list: () => request<FormResponse[]>("/api/forms/responses"),
      listByFormId: (id: number) => request<FormResponse[]>(`/api/forms/${id}/responses`),
    },
  },
  backups: {
    list: () => request<BackupItem[]>("/api/backups"),
    create: () => request<{ ok: true; backup: BackupItem }>("/api/backups", { method: "POST" }),
    download: async (name: string): Promise<Blob> => {
      const res = await fetch(`/api/backups/${encodeURIComponent(name)}/download`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 403 && window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin") {
          window.location.assign("/admin");
        }
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? "Download failed");
      }
      return res.blob();
    },
    restore: async (file: File): Promise<{ ok: true; message: string }> => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/backups/restore", {
        method: "POST",
        body: form,
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 403 && window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin") {
          window.location.assign("/admin");
        }
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? "Restore failed");
      }
      const data = await (res.json() as Promise<{ ok: true; message: string }>);
      emitDataChange({ method: "POST", path: "/api/backups/restore" });
      return data;
    },
  },
  ssl: {
    list: () => request<SslCertificate[]>("/api/ssl/certificates"),
    create: (body: {
      domain: string;
      provider?: "letsencrypt" | "cloudflared";
      email?: string;
      organization?: string;
      organizationUnit?: string;
      staging?: boolean;
      mode?: "webroot" | "standalone";
      webrootPath?: string;
      certificatePem?: string;
      privateKeyPem?: string;
    }) =>
      request<{ ok: true; certificate: SslCertificate; output: { stdout: string; stderr: string } }>("/api/ssl/certificates", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (domain: string) => request<{ ok: true; removedBy: string; domain: string }>(`/api/ssl/certificates/${encodeURIComponent(domain)}`, { method: "DELETE" }),
    downloadFile: async (domain: string, file: "fullchain.pem" | "privkey.pem" | "openweb-meta.json"): Promise<Blob> => {
      const res = await fetch(`/api/ssl/certificates/${encodeURIComponent(domain)}/download/${encodeURIComponent(file)}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? "Download failed");
      }
      return res.blob();
    },
    autoRenew: {
      status: () => request<SslAutoRenewStatus>("/api/ssl/auto-renew"),
      runNow: (body?: { dryRun?: boolean }) =>
        request<{ ok: true; skipped: boolean; reason?: string; output?: { stdout: string; stderr: string }; state?: SslAutoRenewStatus["state"] }>(
          "/api/ssl/auto-renew/run",
          { method: "POST", body: JSON.stringify(body ?? {}) }
        ),
    },
  },
  nginx: {
    sslServers: {
      list: () => request<{ items: NginxSslServerConfig[]; baseDomain: string | null; managedConfigPath: string }>("/api/nginx/ssl-servers"),
      update: (siteId: number, body: { host?: string; enabled?: boolean }) =>
        request<NginxSslServerConfig>(`/api/nginx/ssl-servers/${siteId}`, { method: "PUT", body: JSON.stringify(body) }),
      apply: () => request<{ ok: true; path: string; hosts: string[]; reloadCommand: string; configPreview: string }>("/api/nginx/ssl-servers/apply", { method: "POST" }),
    },
  },
  newsletter: {
    subscribe: (body: { email: string; name?: string; source?: string; meta?: Record<string, unknown> }) =>
      request<{ ok: true; subscriber: NewsletterSubscriber }>("/api/newsletter/subscribe", { method: "POST", body: JSON.stringify(body) }),
    subscribers: {
      list: () => request<NewsletterSubscriber[]>("/api/newsletter/subscribers"),
      update: (id: number, body: { name?: string | null; status?: "subscribed" | "unsubscribed" }) =>
        request<NewsletterSubscriber>(`/api/newsletter/subscribers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
      delete: (id: number) => request<{ ok: true }>(`/api/newsletter/subscribers/${id}`, { method: "DELETE" }),
    },
  },
  crm: {
    publicLead: (body: { channelSlug?: string; name?: string; email?: string; phone?: string; company?: string; notes?: string; payload?: Record<string, unknown> }) =>
      request<{ ok: true; lead: CrmLead }>("/api/crm/public-lead", { method: "POST", body: JSON.stringify(body) }),
    channels: {
      list: () => request<CrmChannel[]>("/api/crm/channels"),
      create: (body: { name: string; slug?: string; description?: string | null; isActive?: boolean; channelType?: CrmChannelType }) =>
        request<CrmChannel>("/api/crm/channels", { method: "POST", body: JSON.stringify(body) }),
      update: (id: number, body: { name?: string; slug?: string; description?: string | null; isActive?: boolean; channelType?: CrmChannelType }) =>
        request<CrmChannel>(`/api/crm/channels/${id}`, { method: "PUT", body: JSON.stringify(body) }),
      delete: (id: number) => request<{ ok: true }>(`/api/crm/channels/${id}`, { method: "DELETE" }),
    },
    leads: {
      list: (opts?: { status?: CrmLead["status"]; archived?: boolean; search?: string; channelId?: number }) => {
        const p = new URLSearchParams();
        if (opts?.status) p.set("status", opts.status);
        if (opts?.archived !== undefined) p.set("archived", String(opts.archived));
        if (opts?.search) p.set("search", opts.search);
        if (opts?.channelId) p.set("channelId", String(opts.channelId));
        const qs = p.toString();
        return request<CrmLead[]>(qs ? `/api/crm/leads?${qs}` : "/api/crm/leads");
      },
      create: (body: { source?: CrmLead["source"]; channelId?: number | null; status?: CrmLead["status"]; name?: string | null; email?: string | null; phone?: string | null; company?: string | null; notes?: string | null; payload?: Record<string, unknown>; tags?: string[]; customFields?: Record<string, string>; score?: number }) =>
        request<CrmLead>("/api/crm/leads", { method: "POST", body: JSON.stringify(body) }),
      update: (id: number, body: { status?: CrmLead["status"]; notes?: string | null; name?: string | null; email?: string | null; phone?: string | null; company?: string | null; channelId?: number | null; tags?: string[]; customFields?: Record<string, string>; score?: number }) =>
        request<CrmLead>(`/api/crm/leads/${id}`, { method: "PUT", body: JSON.stringify(body) }),
      delete: (id: number) => request<{ ok: true }>(`/api/crm/leads/${id}`, { method: "DELETE" }),
      archive: (id: number) => request<{ ok: true }>(`/api/crm/leads/${id}/archive`, { method: "POST" }),
      unarchive: (id: number) => request<{ ok: true }>(`/api/crm/leads/${id}/unarchive`, { method: "POST" }),
      activities: {
        list: (id: number) => request<CrmLeadActivity[]>(`/api/crm/leads/${id}/activities`),
        create: (id: number, body: { type?: CrmLeadActivity["type"]; content?: string }) =>
          request<CrmLeadActivity>(`/api/crm/leads/${id}/activities`, { method: "POST", body: JSON.stringify(body) }),
      },
    },
    analytics: () => request<CrmAnalytics>("/api/crm/analytics"),
    aiContext: () => request<unknown>("/api/crm/ai-context"),
  },
};
