import { Suspense, lazy, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";

const AdminLayout = lazy(() => import("@/pages/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminIndex = lazy(() => import("@/pages/AdminIndex").then((m) => ({ default: m.AdminIndex })));
const HomepageEditor = lazy(() => import("@/pages/HomepageEditor").then((m) => ({ default: m.HomepageEditor })));
const PagesList = lazy(() => import("@/pages/PagesList").then((m) => ({ default: m.PagesList })));
const PageNew = lazy(() => import("@/pages/PageNew").then((m) => ({ default: m.PageNew })));
const PageWebEditor = lazy(() => import("@/pages/PageWebEditor").then((m) => ({ default: m.PageWebEditor })));
const PageSettings = lazy(() => import("@/pages/PageSettings").then((m) => ({ default: m.PageSettings })));
const ThemePacksList = lazy(() => import("@/pages/ThemePacksList").then((m) => ({ default: m.ThemePacksList })));
const ThemePackEdit = lazy(() => import("@/pages/ThemePackEdit").then((m) => ({ default: m.ThemePackEdit })));
const SiteLayout = lazy(() => import("@/pages/SiteLayout").then((m) => ({ default: m.SiteLayout })));
const SeoSettings = lazy(() => import("@/pages/SeoSettings").then((m) => ({ default: m.SeoSettings })));
const MediaGallery = lazy(() => import("@/pages/MediaGallery").then((m) => ({ default: m.MediaGallery })));
const StorageSettings = lazy(() => import("@/pages/StorageSettings").then((m) => ({ default: m.StorageSettings })));
const Login = lazy(() => import("@/pages/Login").then((m) => ({ default: m.Login })));
const Setup = lazy(() => import("@/pages/Setup").then((m) => ({ default: m.Setup })));
const Portal = lazy(() => import("@/pages/Portal").then((m) => ({ default: m.Portal })));
const Users = lazy(() => import("@/pages/Users").then((m) => ({ default: m.Users })));
const Sites = lazy(() => import("@/pages/Sites").then((m) => ({ default: m.Sites })));
const Plugins = lazy(() => import("@/pages/Plugins").then((m) => ({ default: m.Plugins })));
const MyProfile = lazy(() => import("@/pages/MyProfile").then((m) => ({ default: m.MyProfile })));
const BlogPosts = lazy(() => import("@/pages/BlogPosts").then((m) => ({ default: m.BlogPosts })));
const BlogPostEditor = lazy(() => import("@/pages/BlogPostEditor").then((m) => ({ default: m.BlogPostEditor })));
const FormsBuilder = lazy(() => import("@/pages/FormsBuilder").then((m) => ({ default: m.FormsBuilder })));
const NewsletterAdmin = lazy(() => import("@/pages/NewsletterAdmin").then((m) => ({ default: m.NewsletterAdmin })));
const CrmAdmin = lazy(() => import("@/pages/CrmAdmin").then((m) => ({ default: m.CrmAdmin })));
const PublicHomePage = lazy(() => import("@/pages/PublicHomePage").then((m) => ({ default: m.PublicHomePage })));
const PublicPage = lazy(() => import("@/pages/PublicPage").then((m) => ({ default: m.PublicPage })));
const PublicBlogList = lazy(() => import("@/pages/PublicBlogList").then((m) => ({ default: m.PublicBlogList })));
const PublicBlogPost = lazy(() => import("@/pages/PublicBlogPost").then((m) => ({ default: m.PublicBlogPost })));

function RouteLoader({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth pages */}
          <Route path="/login" element={<RouteLoader><Login /></RouteLoader>} />
          <Route path="/setup" element={<RouteLoader><Setup /></RouteLoader>} />

          {/* Subscriber portal */}
          <Route path="/portal" element={
            <RequireAuth>
              <RouteLoader><Portal /></RouteLoader>
            </RequireAuth>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <RequireAuth roles={["admin", "page_developer", "blogger", "blogger_admin"]}>
              <RouteLoader><AdminLayout /></RouteLoader>
            </RequireAuth>
          }>
            <Route index element={<RouteLoader><AdminIndex /></RouteLoader>} />
            <Route path="homepage" element={<RouteLoader><HomepageEditor /></RouteLoader>} />
            <Route path="pages" element={<RouteLoader><PagesList /></RouteLoader>} />
            <Route path="pages/new" element={<RouteLoader><PageNew /></RouteLoader>} />
            <Route path="pages/:id/editor" element={<RouteLoader><PageWebEditor /></RouteLoader>} />
            <Route path="pages/:id/settings" element={<RouteLoader><PageSettings /></RouteLoader>} />
            <Route path="pages/:id" element={<Navigate to="editor" replace />} />
            <Route path="layout" element={<RouteLoader><SiteLayout /></RouteLoader>} />
            <Route path="seo" element={<RouteLoader><SeoSettings /></RouteLoader>} />
            <Route path="media" element={<RouteLoader><MediaGallery /></RouteLoader>} />
            <Route path="themes" element={<RouteLoader><ThemePacksList /></RouteLoader>} />
            <Route path="themes/:id" element={<RouteLoader><ThemePackEdit /></RouteLoader>} />
            <Route path="blog" element={
              <RequireAuth roles={["admin", "blogger", "blogger_admin"]}>
                <RouteLoader><BlogPosts /></RouteLoader>
              </RequireAuth>
            } />
            <Route path="blog/new" element={
              <RequireAuth roles={["admin", "blogger", "blogger_admin"]}>
                <RouteLoader><BlogPostEditor /></RouteLoader>
              </RequireAuth>
            } />
            <Route path="blog/:id" element={
              <RequireAuth roles={["admin", "blogger", "blogger_admin"]}>
                <RouteLoader><BlogPostEditor /></RouteLoader>
              </RequireAuth>
            } />
            <Route path="forms" element={
              <RequireAuth roles={["admin", "page_developer", "blogger_admin"]}>
                <RouteLoader><FormsBuilder /></RouteLoader>
              </RequireAuth>
            } />
            <Route path="newsletter" element={
              <RequireAuth roles={["admin", "page_developer", "blogger_admin"]}>
                <RouteLoader><NewsletterAdmin /></RouteLoader>
              </RequireAuth>
            } />
            <Route path="crm" element={
              <RequireAuth roles={["admin", "page_developer", "blogger_admin"]}>
                <RouteLoader><CrmAdmin /></RouteLoader>
              </RequireAuth>
            } />

            {/* Admin-only routes */}
            <Route path="storage" element={
              <RequireAuth roles={["admin"]} globalOnly>
                <RouteLoader><StorageSettings /></RouteLoader>
              </RequireAuth>
            } />
            <Route path="users" element={
              <RequireAuth roles={["admin", "blogger_admin"]}>
                <RouteLoader><Users /></RouteLoader>
              </RequireAuth>
            } />
            <Route path="sites" element={
              <RequireAuth roles={["admin"]} globalOnly>
                <RouteLoader><Sites /></RouteLoader>
              </RequireAuth>
            } />
            <Route path="plugins" element={
              <RequireAuth roles={["admin"]}>
                <RouteLoader><Plugins /></RouteLoader>
              </RequireAuth>
            } />
            <Route path="profile" element={
              <RequireAuth roles={["admin", "page_developer", "blogger", "blogger_admin"]}>
                <RouteLoader><MyProfile /></RouteLoader>
              </RequireAuth>
            } />
          </Route>

          {/* Public pages */}
          <Route path="/" element={<RouteLoader><PublicHomePage /></RouteLoader>} />
          <Route path="/blog" element={<RouteLoader><PublicBlogList /></RouteLoader>} />
          <Route path="/blog/:slug" element={<RouteLoader><PublicBlogPost /></RouteLoader>} />
          <Route path="/:slug" element={<RouteLoader><PublicPage /></RouteLoader>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
