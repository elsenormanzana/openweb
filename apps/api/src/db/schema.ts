import { boolean, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain"),
  subDomain: text("sub_domain"),
  routingMode: text("routing_mode").notNull().default("url"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  authProvider: text("auth_provider"),
  authProviderId: text("auth_provider_id"),
  role: text("role").notNull().default("subscriber"), // "admin"|"page_developer"|"subscriber"
  siteId: integer("site_id").references(() => sites.id), // null = global admin
  siteRoles: text("site_roles"), // JSON: [{siteId, role}] — multi-site access
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  socialMedia: text("social_media"), // JSON: [{platform,url}]
  position: text("position"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const plugins = pgTable("plugins", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  serverCode: text("server_code"),
  clientCode: text("client_code"),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  content: text("content"),
  isHomepage: boolean("is_homepage").default(false).notNull(),
  ignoreGlobalLayout: boolean("ignore_global_layout").default(false).notNull(),
  disableElevatedNavSpacing: boolean("disable_elevated_nav_spacing").default(false).notNull(),
  // SEO
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"),
  ogImage: text("og_image"),
  noIndex: boolean("no_index").default(false).notNull(),
  canonicalUrl: text("canonical_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  siteSlugUniq: unique("pages_site_slug_unique").on(t.siteId, t.slug),
}));

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  navType: text("nav_type").notNull().default("navbar"),
  navConfig: text("nav_config"),
  footerConfig: text("footer_config"),
  seoConfig: text("seo_config"),
  blogApprovalMode: boolean("blog_approval_mode").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const storageConfig = pgTable("storage_config", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("local"),
  config: text("config"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: text("size"),
  url: text("url").notNull(),
  provider: text("provider").notNull().default("local"),
  providerPath: text("provider_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const themePacks = pgTable("theme_packs", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  cssContent: text("css_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blogCategories = pgTable("blog_categories", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  siteSlugUniq: unique("blog_categories_site_slug_unique").on(t.siteId, t.slug),
}));

export const blogTags = pgTable("blog_tags", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  siteSlugUniq: unique("blog_tags_site_slug_unique").on(t.siteId, t.slug),
}));

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  slug: text("slug").notNull(),
  status: text("status").notNull().default("draft"), // draft|pending_review|approved|published|rejected
  datePublished: timestamp("date_published"),
  headerImage: text("header_image"),
  approvalNotes: text("approval_notes"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  siteSlugUniq: unique("blog_posts_site_slug_unique").on(t.siteId, t.slug),
}));

export const blogPostAuthors = pgTable("blog_post_authors", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => ({
  postUserUniq: unique("blog_post_authors_post_user_unique").on(t.postId, t.userId),
}));

export const blogPostCategories = pgTable("blog_post_categories", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => blogCategories.id, { onDelete: "cascade" }),
}, (t) => ({
  postCategoryUniq: unique("blog_post_categories_post_category_unique").on(t.postId, t.categoryId),
}));

export const blogPostTags = pgTable("blog_post_tags", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => blogTags.id, { onDelete: "cascade" }),
}, (t) => ({
  postTagUniq: unique("blog_post_tags_post_tag_unique").on(t.postId, t.tagId),
}));

export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active|inactive
  submitLabel: text("submit_label").notNull().default("Submit"),
  successMessage: text("success_message").notNull().default("Thanks, we received your submission."),
  fields: text("fields").notNull().default("[]"), // JSON: FormField[]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  siteSlugUniq: unique("forms_site_slug_unique").on(t.siteId, t.slug),
}));

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  status: text("status").notNull().default("subscribed"), // subscribed|unsubscribed
  source: text("source").notNull().default("newsletter"), // newsletter|form|manual
  meta: text("meta"), // JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  siteEmailUniq: unique("newsletter_subscribers_site_email_unique").on(t.siteId, t.email),
}));

export const crmChannels = pgTable("crm_channels", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  siteSlugUniq: unique("crm_channels_site_slug_unique").on(t.siteId, t.slug),
}));

export const crmLeads = pgTable("crm_leads", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  formId: integer("form_id").references(() => forms.id, { onDelete: "set null" }),
  channelId: integer("channel_id").references(() => crmChannels.id, { onDelete: "set null" }),
  source: text("source").notNull().default("custom"), // form|newsletter|custom
  status: text("status").notNull().default("new"), // new|contacted|qualified|lost
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  notes: text("notes"),
  payload: text("payload").notNull().default("{}"), // JSON, raw submission
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Site = typeof sites.$inferSelect;
export type User = typeof users.$inferSelect;
export type Plugin = typeof plugins.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type ThemePack = typeof themePacks.$inferSelect;
export type NewThemePack = typeof themePacks.$inferInsert;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type NewSiteSettings = typeof siteSettings.$inferInsert;
export type StorageConfig = typeof storageConfig.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type BlogTag = typeof blogTags.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type CrmChannel = typeof crmChannels.$inferSelect;
export type CrmLead = typeof crmLeads.$inferSelect;
