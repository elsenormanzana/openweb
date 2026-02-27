import { useEffect, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  Home, FileText, Palette, Layout, Image, HardDrive,
  Search, ExternalLink, Menu, X, Layers, Lock,
  Users2, Globe, Puzzle, ChevronDown, LogOut, UserCircle2, BookOpenText, ClipboardList, Mail, BriefcaseBusiness, Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api, type Site, type SiteContext } from "@/lib/api";
import { onDataChange } from "@/lib/dataEvents";

const prefetchedAdminRoutes = new Set<string>();
const adminRoutePrefetchers: Record<string, () => Promise<unknown>> = {
  "/admin": () => import("@/pages/AdminIndex"),
  "/admin/pages": () => import("@/pages/PagesList"),
  "/admin/media": () => import("@/pages/MediaGallery"),
  "/admin/layout": () => import("@/pages/SiteLayout"),
  "/admin/seo": () => import("@/pages/SeoSettings"),
  "/admin/storage": () => import("@/pages/StorageSettings"),
  "/admin/backups": () => import("@/pages/BackupsAdmin"),
  "/admin/themes": () => import("@/pages/ThemePacksList"),
  "/admin/users": () => import("@/pages/Users"),
  "/admin/sites": () => import("@/pages/Sites"),
  "/admin/plugins": () => import("@/pages/Plugins"),
  "/admin/profile": () => import("@/pages/MyProfile"),
  "/admin/blog": () => import("@/pages/BlogPosts"),
  "/admin/blog/new": () => import("@/pages/BlogPostEditor"),
  "/admin/forms": () => import("@/pages/FormsBuilder"),
  "/admin/newsletter": () => import("@/pages/NewsletterAdmin"),
  "/admin/crm": () => import("@/pages/CrmAdmin"),
};

function prefetchAdminRoute(route: string) {
  if (prefetchedAdminRoutes.has(route)) return;
  const load = adminRoutePrefetchers[route];
  if (!load) return;
  prefetchedAdminRoutes.add(route);
  load().catch(() => {
    prefetchedAdminRoutes.delete(route);
  });
}

type NavGroup = "General" | "Content" | "Design" | "Growth" | "System";

const allNav = [
  { to: "/admin", end: true, label: "Home", icon: Home, roles: ["admin", "page_developer", "blogger", "blogger_admin"], group: "General" as NavGroup },
  { to: "/admin/pages", end: false, label: "Pages", icon: FileText, roles: ["admin", "page_developer"], group: "Content" as NavGroup },
  { to: "/admin/blog", end: false, label: "Blog", icon: BookOpenText, roles: ["admin", "blogger", "blogger_admin"], group: "Content" as NavGroup },
  { to: "/admin/forms", end: true, label: "Forms", icon: ClipboardList, roles: ["admin", "page_developer", "blogger_admin"], group: "Content" as NavGroup },
  { to: "/admin/media", end: true, label: "Media", icon: Image, roles: ["admin", "page_developer", "blogger", "blogger_admin"], group: "Content" as NavGroup },
  { to: "/admin/layout", end: true, label: "Site Layout", icon: Layout, roles: ["admin", "page_developer"], group: "Design" as NavGroup },
  { to: "/admin/themes", end: false, label: "Themes", icon: Palette, roles: ["admin", "page_developer"], group: "Design" as NavGroup },
  { to: "/admin/seo", end: true, label: "SEO", icon: Search, roles: ["admin", "page_developer", "blogger", "blogger_admin"], group: "Growth" as NavGroup },
  { to: "/admin/newsletter", end: true, label: "Newsletter", icon: Mail, roles: ["admin", "page_developer", "blogger_admin"], group: "Growth" as NavGroup },
  { to: "/admin/crm", end: true, label: "CRM", icon: BriefcaseBusiness, roles: ["admin", "page_developer", "blogger_admin"], group: "Growth" as NavGroup },
  { to: "/admin/users", end: true, label: "Users", icon: Users2, roles: ["admin", "blogger_admin"], group: "System" as NavGroup },
  { to: "/admin/storage", end: true, label: "Storage", icon: HardDrive, roles: ["admin"], globalOnly: true, group: "System" as NavGroup },
  { to: "/admin/backups", end: true, label: "Backups", icon: Archive, roles: ["admin"], globalOnly: true, group: "System" as NavGroup },
  { to: "/admin/sites", end: true, label: "Sites", icon: Globe, roles: ["admin"], globalOnly: true, group: "System" as NavGroup },
  { to: "/admin/plugins", end: true, label: "Plugins", icon: Puzzle, roles: ["admin"], group: "System" as NavGroup },
];
const NAV_GROUP_ORDER: NavGroup[] = ["General", "Content", "Design", "Growth", "System"];

function SiteScopePanel() {
  const [context, setContext] = useState<SiteContext | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      api.siteContext.get()
        .then((ctx) => {
          setContext(ctx);
          if (ctx.canSwitchSites) {
            api.sites.list().then(setSites).catch(() => {});
          }
        })
        .catch(() => {});
    };
    load();
    return onDataChange((event) => {
      if (event.path.startsWith("/api/sites")) load();
    });
  }, []);

  function switchTo(s: Site) {
    sessionStorage.setItem("openweb_site_id", String(s.id));
    window.location.reload();
  }

  if (!context) {
    return (
      <div className="px-3 pb-2">
        <div className="rounded-xl border border-border/60 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Editing Site</p>
          <p className="text-sm font-medium mt-0.5">Loading…</p>
        </div>
      </div>
    );
  }

  const current = context.site;
  const showSwitcher = context.canSwitchSites && sites.length > 1;

  return (
    <div className="relative px-3 pb-2">
      <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Editing Site</p>
          {!showSwitcher && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
              <Lock className="size-3" />
              Locked
            </span>
          )}
        </div>
        {showSwitcher ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Globe className="size-4 shrink-0" />
            <span className="flex-1 truncate text-left">{current.name}</span>
            <ChevronDown className="size-3.5 shrink-0" />
          </button>
        ) : (
          <div className="w-full flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm font-medium">
            <Globe className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{current.name}</span>
          </div>
        )}
      </div>

      {showSwitcher && open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-background border border-border rounded-xl shadow-lg z-50 py-1">
          {sites.map((s) => (
            <button
              key={s.id}
              onClick={() => { switchTo(s); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted",
                s.id === current.id ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState("");

  const nav = allNav.filter((item) => {
    if (!user || !item.roles.includes(user.role)) return false;
    if (item.globalOnly && user.siteId != null) return false;
    if (query.trim() && !item.label.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });
  const groupedNav = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: nav.filter((item) => item.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-foreground flex items-center justify-center shrink-0">
            <Layers className="size-4 text-background" />
          </div>
          <span className="font-semibold tracking-tight">OpenWeb</span>
        </div>
        {onClose && (
          <button
            aria-label="Close navigation menu"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <SiteScopePanel />

      <div className="px-3 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Quick find..."
          className="w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-2 overflow-y-auto">
        {groupedNav.map(({ group, items }) => (
          <div key={group} className="space-y-0.5">
            <p className="px-2 text-[10px] uppercase tracking-wide text-muted-foreground/80">{group}</p>
            {items.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                onMouseEnter={() => prefetchAdminRoute(to)}
                onFocus={() => prefetchAdminRoute(to)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )
                }
              >
                <Icon className="size-3.5 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
        {groupedNav.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">No matches</p>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-border/40 space-y-0.5">
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ExternalLink className="size-4 shrink-0" />
          View live site
        </Link>
        {user && (
          <NavLink
            to="/admin/profile"
            end
            onClick={onClose}
            onMouseEnter={() => prefetchAdminRoute("/admin/profile")}
            onFocus={() => prefetchAdminRoute("/admin/profile")}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )
            }
          >
            <UserCircle2 className="size-4 shrink-0" />
            My Profile
          </NavLink>
        )}
        {user && (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-left"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="flex-1 truncate">{user.email}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-svh bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-60 bg-background border-r border-border/50 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside role="dialog" aria-modal="true" aria-label="Navigation menu" className="relative w-72 bg-background border-r border-border/50 shadow-2xl">
            <SidebarContent onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open navigation menu"
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-foreground flex items-center justify-center">
              <Layers className="size-3.5 text-background" />
            </div>
            <span className="font-semibold text-sm">OpenWeb</span>
          </div>
        </div>
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="size-4" />
          <span className="hidden sm:inline">Live site</span>
        </Link>
      </header>

      {/* Main */}
      <main className="md:ml-60 min-h-svh p-6 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
