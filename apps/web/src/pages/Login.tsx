import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Globe, Layers } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

type SetupNeededResponse = { needed: boolean };
type SsoProvider = { id: "google" | "microsoft" | "oidc"; label: string };
type SsoProvidersResponse = { providers: SsoProvider[] };

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [ssoProviders, setSsoProviders] = useState<SsoProvider[]>([]);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAuthMeta() {
      try {
        const [setupRes, providerRes] = await Promise.all([
          fetch("/api/setup/needed"),
          fetch("/api/auth/sso/providers"),
        ]);
        if (setupRes.ok) {
          const setupData = await setupRes.json() as SetupNeededResponse;
          if (isMounted) setSetupNeeded(Boolean(setupData.needed));
        }
        if (providerRes.ok) {
          const providerData = await providerRes.json() as SsoProvidersResponse;
          if (isMounted) setSsoProviders(Array.isArray(providerData.providers) ? providerData.providers : []);
        }
      } catch {
        if (isMounted) {
          setSetupNeeded(false);
          setSsoProviders([]);
        }
      }
    }
    loadAuthMeta();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { token?: string; user?: AuthUser; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      login(data.token!, data.user!);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSsoStart(provider: SsoProvider["id"]) {
    setSsoLoading(provider);
    window.location.href = `/api/auth/sso/${provider}/start?redirect=${encodeURIComponent(from)}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="size-10 rounded-xl bg-foreground flex items-center justify-center">
            <Layers className="size-5 text-background" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to OpenWeb</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border/60 bg-background p-6 space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground text-background py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          {ssoProviders.length > 0 && (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or continue with</span>
                </div>
              </div>
              <div className="space-y-2">
                {ssoProviders.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleSsoStart(provider.id)}
                    disabled={Boolean(ssoLoading)}
                    className="w-full rounded-lg border border-border/60 bg-background py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ssoLoading === provider.id ? "Redirecting…" : `Sign in with ${provider.label}`}
                  </button>
                ))}
              </div>
            </>
          )}
        </form>

        <div className="text-center text-sm text-muted-foreground mt-4 flex items-center justify-center gap-2">
          <Globe className="size-4" />
          <span>Use your local account or configured SSO provider.</span>
        </div>
        {setupNeeded && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            First time?{" "}
            <Link to="/setup" className="underline hover:text-foreground transition-colors">
              Run setup
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
