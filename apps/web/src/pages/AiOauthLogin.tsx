import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RefreshCw, Check, Key, Lock } from "lucide-react";

export function AiOauthLogin() {
  const [provider, setProvider] = useState<string>("claude");
  const [step, setStep] = useState<"login" | "loading" | "success">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  // Retrieve provider from query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prov = params.get("provider") || "claude";
    setProvider(prov);
  }, []);

  const handleConnect = () => {
    setStep("loading");

    // Generate simulated key if not provided
    const keyToSubmit = apiKey.trim() || `mock-${provider}-key-${Math.random().toString(36).substring(2, 10)}`;
    const defaultModels: Record<string, string> = {
      claude: "claude-haiku-4-5-20251001",
      openai: "gpt-4o-mini",
      gemini: "gemini-2.5-flash"
    };
    const modelToSubmit = model.trim() || defaultModels[provider] || "default";

    setTimeout(() => {
      setStep("success");
      setTimeout(() => {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "ai-oauth-done",
              provider,
              key: keyToSubmit,
              model: modelToSubmit
            },
            "*"
          );
        }
        window.close();
      }, 1000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F19] flex items-center justify-center p-4">
      <div className={cn(
        "w-full max-w-md bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden transition-all duration-300",
        provider === "claude" && "border-amber-500/20",
        provider === "openai" && "border-emerald-500/20",
        provider === "gemini" && "border-indigo-500/20"
      )}>
        {/* Top Header Banner */}
        <div className={cn(
          "px-6 py-6 text-white text-center relative overflow-hidden",
          provider === "claude" && "bg-gradient-to-r from-amber-800 to-amber-950",
          provider === "openai" && "bg-gradient-to-r from-emerald-800 to-emerald-950",
          provider === "gemini" && "bg-gradient-to-r from-indigo-800 via-indigo-900 to-slate-900"
        )}>
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/5 blur-xl" />

          {/* Logo Badge */}
          <div className="mx-auto size-12 rounded-xl bg-white/10 flex items-center justify-center font-black text-xl mb-3 shadow-inner">
            {provider === "claude" && "𝓒"}
            {provider === "openai" && "𝓞"}
            {provider === "gemini" && "𝓖"}
          </div>

          <h1 className="text-lg font-bold tracking-tight">
            {provider === "claude" && "Link Anthropic Console"}
            {provider === "openai" && "Link OpenAI Platform"}
            {provider === "gemini" && "Link Google AI Studio"}
          </h1>
          <p className="text-xs text-white/70 mt-0.5">Secure SSO integration for OpenWeb</p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {step === "login" && (
            <div className="space-y-4">
              {provider === "gemini" ? (
                // Google styled authorization screen
                <div className="space-y-4">
                  <div className="flex justify-center my-2">
                    <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Choose Google Account</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">to continue to Google AI Studio</p>
                  </div>

                  <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    <button
                      type="button"
                      onClick={() => handleConnect()}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left font-medium"
                    >
                      <div className="size-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[10px]">
                        JD
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-gray-900 dark:text-gray-100">John Developer</p>
                        <p className="text-[10px] text-muted-foreground truncate">john.developer@gmail.com</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConnect()}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left font-medium"
                    >
                      <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                        OW
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-gray-900 dark:text-gray-100">OpenWeb Workspace Account</p>
                        <p className="text-[10px] text-muted-foreground truncate">admin@openweb.internal</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                // Sign in with Email / Password or API key
                <div className="space-y-4">
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">SSO Email Address</Label>
                      <Input
                        type="email"
                        placeholder="developer@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">SSO Account Password</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">or enter API key</span>
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                  </div>
                </div>
              )}

              {/* Developer credentials override */}
              <div className="space-y-3.5 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Key className="size-3.5 text-muted-foreground" />
                    Developer API Key / Token
                  </Label>
                  <Input
                    type="password"
                    placeholder={provider === "openai" ? "sk-proj-..." : "sk-..."}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground block leading-relaxed">
                    Leave blank to run simulated connection using a mock credentials token.
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Custom Model ID (Optional)</Label>
                  <Input
                    placeholder={provider === "openai" ? "gpt-4o-mini" : provider === "gemini" ? "gemini-2.5-flash" : "claude-haiku-4-5-20251001"}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Permissions scope alert */}
              <div className="rounded-lg border bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-200/50 dark:border-yellow-800/20 p-3 flex gap-2">
                <Lock className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-800 dark:text-yellow-300 leading-normal">
                  OpenWeb will be authorized to access your workspace. Keys and tokens are stored securely in your database.
                </p>
              </div>

              <Button
                onClick={handleConnect}
                className={cn(
                  "w-full h-9 text-xs font-semibold shadow-md text-white mt-4",
                  provider === "claude" && "bg-amber-800 hover:bg-amber-900",
                  provider === "openai" && "bg-emerald-700 hover:bg-emerald-800",
                  provider === "gemini" && "bg-indigo-700 hover:bg-indigo-800"
                )}
              >
                Sign In & Grant Access
              </Button>
            </div>
          )}

          {step === "loading" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className={cn(
                "size-10 animate-spin",
                provider === "claude" && "text-amber-700",
                provider === "openai" && "text-emerald-600",
                provider === "gemini" && "text-indigo-600"
              )} />
              <div className="text-center">
                <p className="text-sm font-semibold">Exchanging SSO Tokens...</p>
                <p className="text-xs text-muted-foreground mt-1">Completing OAuth handshake with {provider} endpoints</p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="size-12 rounded-full bg-green-50 dark:bg-green-950 flex items-center justify-center border border-green-200 dark:border-green-800">
                <Check className="size-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-green-700 dark:text-green-400">Connection Authorized!</p>
                <p className="text-xs text-muted-foreground mt-1">Closing auth window and returning to settings</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
