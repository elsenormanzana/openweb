import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Check,
  X,
  RefreshCw,
  Play,
  Terminal,
  Sliders,
  Radio,
  Plus,
  Trash2,
  Globe,
  Database,
  Key,
  Unlock
} from "lucide-react";

type AIProvider = {
  connected: boolean;
  apiKey: string;
  model: string;
  authMode?: "apikey" | "oauth";
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
};

type CustomServer = {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  model: string;
};

type AIConfig = {
  providers: {
    claude: AIProvider;
    gemini: AIProvider;
    openai: AIProvider;
  };
  customServers?: CustomServer[];
  agents: {
    translation: string;
    seo: string;
    contentGeneration: string;
  };
};

export function AiSettings() {
  const [config, setConfig] = useState<AIConfig>({
    providers: {
      claude: { connected: false, apiKey: "", model: "claude-haiku-4-5-20251001" },
      gemini: { connected: false, apiKey: "", model: "gemini-2.5-flash", authMode: "apikey" },
      openai: { connected: false, apiKey: "", model: "gpt-4o-mini" }
    },
    customServers: [],
    agents: {
      translation: "claude",
      seo: "openai",
      contentGeneration: "gemini"
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Connection tester state
  const [testerText, setTesterText] = useState("Hello world! Empowering web applications with premium agentic workflows.");
  const [testResult, setTestResult] = useState<{ success: boolean; text?: string; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Custom server testing states
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [serverTestResult, setServerTestResult] = useState<Record<string, { success: boolean; text?: string; error?: string }>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  // Listen for Google Gemini OAuth completed callback
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === "google-gemini-oauth-done") {
        loadSettings();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const loadSettings = () => {
    api.siteSettings.get()
      .then((s) => {
        if (s.aiConfig) {
          setConfig((prev) => ({
            ...prev,
            ...s.aiConfig,
            customServers: s.aiConfig.customServers || [],
            providers: {
              ...prev.providers,
              ...s.aiConfig.providers,
              gemini: {
                authMode: "apikey",
                ...prev.providers.gemini,
                ...s.aiConfig.providers.gemini
              }
            }
          }));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const save = (configOverride?: AIConfig) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const target = configOverride || config;
    api.siteSettings.update({ aiConfig: target })
      .then((res) => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        if (res.aiConfig) {
          setConfig(res.aiConfig);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const updateProviderField = (provider: keyof AIConfig["providers"], field: keyof AIProvider, value: any) => {
    setConfig((prev) => {
      const updatedProvider = {
        ...prev.providers[provider],
        [field]: value
      };
      // Automatically set connected true if they fill in apiKey
      if (field === "apiKey") {
        updatedProvider.connected = !!value;
      }
      return {
        ...prev,
        providers: {
          ...prev.providers,
          [provider]: updatedProvider
        }
      };
    });
  };

  // Google Gemini OAuth Flow Trigger
  const startGeminiOauth = () => {
    const gemini = config.providers.gemini;
    if (!gemini.clientId || !gemini.clientSecret) {
      setError("Please save Google Client ID and Client Secret in Gemini credentials before linking.");
      return;
    }
    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      "/api/ai/oauth/google/start",
      "google-gemini-oauth",
      `width=${width},height=${height},left=${left},top=${top},popup=yes,resizable=yes`
    );
  };

  const disconnectOauth = (provider: keyof AIConfig["providers"]) => {
    setConfig((prev) => {
      const updated = {
        ...prev.providers[provider],
        connected: false,
        accessToken: "",
        refreshToken: "",
        tokenExpiry: ""
      };
      const next = {
        ...prev,
        providers: {
          ...prev.providers,
          [provider]: updated
        }
      };
      save(next);
      return next;
    });
  };

  const addCustomServer = () => {
    const newServer: CustomServer = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Local server ${ (config.customServers?.length || 0) + 1 }`,
      url: "http://localhost:11434/v1/chat/completions",
      apiKey: "",
      model: "llama3"
    };
    const updated = {
      ...config,
      customServers: [...(config.customServers || []), newServer]
    };
    setConfig(updated);
    save(updated);
  };

  const updateCustomServer = (id: string, patch: Partial<CustomServer>) => {
    const updatedServers = (config.customServers || []).map((s) => {
      if (s.id === id) return { ...s, ...patch };
      return s;
    });
    setConfig({
      ...config,
      customServers: updatedServers
    });
  };

  const deleteCustomServer = (id: string) => {
    const updatedServers = (config.customServers || []).filter((s) => s.id !== id);
    const updated = {
      ...config,
      customServers: updatedServers
    };
    setConfig(updated);
    save(updated);
  };

  const testCustomServer = async (server: CustomServer) => {
    setTestingServerId(server.id);
    const configOverride = {
      agents: { translation: "custom" },
      providers: {
        claude: config.providers.claude,
        gemini: config.providers.gemini,
        openai: config.providers.openai,
        custom: { connected: true, url: server.url, apiKey: server.apiKey, model: server.model }
      }
    };

    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Ping", configOverride })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setServerTestResult((prev) => ({
          ...prev,
          [server.id]: { success: true, text: data.translated?.test || "Connected successfully!" }
        }));
      } else {
        setServerTestResult((prev) => ({
          ...prev,
          [server.id]: { success: false, error: data.warning || "Failed to reach server. Check endpoint URL & CORS." }
        }));
      }
    } catch (e: any) {
      setServerTestResult((prev) => ({
        ...prev,
        [server.id]: { success: false, error: e.message || "Network error. Failed to reach custom server." }
      }));
    } finally {
      setTestingServerId(null);
    }
  };

  const runConnectionTest = async () => {
    setTesting(true);
    setTestResult(null);

    const activeAgentKey = config.agents.translation;
    let configOverride: any = {
      agents: { translation: activeAgentKey },
      providers: { ...config.providers }
    };

    if (activeAgentKey.startsWith("custom__")) {
      const customId = activeAgentKey.split("__")[1];
      const customServer = config.customServers?.find((s) => s.id === customId);
      if (customServer) {
        configOverride.providers.custom = {
          connected: true,
          url: customServer.url,
          apiKey: customServer.apiKey,
          model: customServer.model
        };
      }
    }

    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testerText, configOverride })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, text: data.translated?.test || JSON.stringify(data.translated) });
      } else {
        setTestResult({ success: false, error: data.warning || "Connection failed. Verify API credentials." });
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message || "Failed to communicate with API test gateway." });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="size-6 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading AI integration settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header matching SeoSettings */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your LLM providers, agent routing, and custom servers.</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded border border-destructive/20 font-medium">{error}</span>}
          {saved && <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950/20 px-2.5 py-1.5 rounded border border-green-500/20 font-medium">Saved!</span>}
          <Button onClick={() => save()} disabled={saving} size="sm">
            {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="providers">
        <TabsList className="w-full">
          <TabsTrigger value="providers" className="flex-1 gap-1.5">
            <Globe className="size-3.5" /> Built-in
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex-1 gap-1.5">
            <Database className="size-3.5" /> Custom Servers
          </TabsTrigger>
          <TabsTrigger value="routing" className="flex-1 gap-1.5">
            <Sliders className="size-3.5" /> Agent Mapping
          </TabsTrigger>
          <TabsTrigger value="tester" className="flex-1 gap-1.5">
            <Radio className="size-3.5" /> Tester
          </TabsTrigger>
        </TabsList>

        {/* ── Built-in Providers Tab ── */}
        <TabsContent value="providers" className="mt-4 space-y-4">
          {/* Claude Card */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <div className="flex gap-3">
                <div className="size-10 shrink-0 rounded-lg flex items-center justify-center bg-[#FDF6EC] border border-[#E9A85B]/30">
                  <svg viewBox="0 0 24 24" className="size-6 text-[#CC7B5C]" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.3 12.3c-.4.5-.9.9-1.5 1.1s-1.3.2-1.9.1c-.6-.1-1.1-.3-1.6-.7S9.4 13.9 9.2 13.3s-.2-1.3-.1-1.9.3-1.1.7-1.6 1-.8 1.6-1.1c.5-.2 1.1-.2 1.7-.1.6.1 1.1.3 1.6.7s.9.9 1.1 1.5.2 1.3.1 1.9-.3 1.1-.7 1.6-.9.8-1.5 1z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Anthropic Claude</CardTitle>
                  <CardDescription className="text-xs">API Key Integration</CardDescription>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border",
                config.providers.claude.connected
                  ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300"
                  : "bg-muted border-border text-muted-foreground"
              )}>
                {config.providers.claude.connected ? "Active" : "Inactive"}
              </span>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs">Anthropic API Key</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  type="password"
                  placeholder="sk-ant-..."
                  value={config.providers.claude.apiKey || ""}
                  onChange={(e) => updateProviderField("claude", "apiKey", e.target.value)}
                  onBlur={() => save()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model Identifier</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="e.g. claude-haiku-4-5-20251001"
                  value={config.providers.claude.model}
                  onChange={(e) => updateProviderField("claude", "model", e.target.value)}
                  onBlur={() => save()}
                />
              </div>
            </CardContent>
          </Card>

          {/* OpenAI Card */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <div className="flex gap-3">
                <div className="size-10 shrink-0 rounded-lg flex items-center justify-center bg-[#E6F4EA] border border-[#10A37F]/20">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-6 text-[#10A37F]">
                    <path d="M21.35 11.1C21.9 9.8 21.75 8.2 20.85 7.35C20.15 6.7 19.1 6.45 18.25 6.75C18.1 5.4 17.25 4.25 15.95 3.75C14.85 3.3 13.55 3.55 12.7 4.35C12.1 3.1 10.9 2.15 9.45 2.05C8.05 1.95 6.75 2.7 6.1 3.9C4.85 3.75 3.65 4.45 3.15 5.65C2.7 6.75 2.95 8.05 3.75 8.9C2.5 9.5 1.55 10.7 1.45 12.15C1.35 13.55 2.1 14.85 3.3 15.5C3.15 16.75 3.85 17.95 5.05 18.45C6.15 18.9 7.45 18.65 8.3 17.85C8.9 19.1 10.1 20.05 11.55 20.15C12.95 20.25 14.25 19.5 14.9 18.3C16.15 18.45 17.35 17.75 17.85 16.55C18.3 15.45 18.05 14.15 17.25 13.3C18.5 12.7 19.45 11.5 19.55 10.05C19.65 8.65 18.9 7.35 17.7 6.7C17.85 5.45 17.15 4.25 15.95 3.75C15.8 5.1 14.95 6.25 13.65 6.75C12.55 7.2 11.25 6.95 10.4 6.15C11 7.4 11.25 8.7 12.5 8.9C13.9 9.1 15.2 8.35 15.85 7.15C17.1 7.3 18.3 6.6 18.8 5.4C19.25 6.5 19 7.8 18.2 8.65C19.45 9.25 20.4 10.45 20.5 11.9C20.6 13.3 19.85 14.6 18.65 15.25C18.8 16.5 18.1 17.7 16.9 18.2C15.8 18.65 14.5 18.4 13.65 17.6C13.05 18.85 11.85 19.8 10.4 19.9C9 20 7.7 19.25 7.05 18.05C5.8 18.2 4.6 17.5 4.1 16.3C3.65 15.2 3.9 13.9 4.7 13.05C3.45 12.45 2.5 11.25 2.4 9.8C2.3 8.4 3.05 7.1 4.25 6.45C4.1 5.2 4.8 4 6 3.5C7.1 3.05 8.4 3.3 9.25 4.1C9.85 2.85 11.05 1.9 12.5 1.8C13.9 1.7 15.2 2.45 15.85 3.65C17.1 3.5 18.3 4.2 18.8 5.4C19.25 4.3 19.5 3 20.3 2.15C21.5 2.05 22.8 2.8 23.46 4C22.21 4.15 21.01 4.85 20.51 6.05C20.96 4.95 22.26 4.2 23.46 4M10.06 14.4l2.6 1.5v3l-2.6 1.5L7.46 18.9v-3l2.6-1.5z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">OpenAI GPT</CardTitle>
                  <CardDescription className="text-xs">API Key Integration</CardDescription>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border",
                config.providers.openai.connected
                  ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300"
                  : "bg-muted border-border text-muted-foreground"
              )}>
                {config.providers.openai.connected ? "Active" : "Inactive"}
              </span>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs">OpenAI API Key</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  type="password"
                  placeholder="sk-proj-..."
                  value={config.providers.openai.apiKey || ""}
                  onChange={(e) => updateProviderField("openai", "apiKey", e.target.value)}
                  onBlur={() => save()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model Identifier</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="e.g. gpt-4o-mini"
                  value={config.providers.openai.model}
                  onChange={(e) => updateProviderField("openai", "model", e.target.value)}
                  onBlur={() => save()}
                />
              </div>
            </CardContent>
          </Card>

          {/* Gemini Card */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <div className="flex gap-3">
                <div className="size-10 shrink-0 rounded-lg flex items-center justify-center bg-[#EEF2FF] border border-[#818CF8]/25">
                  <svg viewBox="0 0 24 24" className="size-6 text-indigo-500" fill="currentColor">
                    <path d="M12 2c0 4-1 8-5 9 4 1 5 5 5 9 0-4 1-8 5-9-4-1-5-5-5-9z" />
                    <path d="M19 13c0 2-.5 4-2.5 4.5 2 .5 2.5 2 2.5 4.5 0-2 .5-4 2.5-4.5-2-.5-2.5-2-2.5-4.5z" opacity="0.8" fill="#818CF8" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Google Gemini</CardTitle>
                  <CardDescription className="text-xs">API Key or Google OAuth 2.0 Auth</CardDescription>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border",
                config.providers.gemini.connected
                  ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300"
                  : "bg-muted border-border text-muted-foreground"
              )}>
                {config.providers.gemini.connected ? "Connected" : "Disconnected"}
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Authentication Method</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateProviderField("gemini", "authMode", "apikey")}
                    className={cn(
                      "flex-1 py-1.5 text-xs rounded border font-medium text-center transition-colors",
                      (config.providers.gemini.authMode || "apikey") === "apikey"
                        ? "bg-muted border-foreground/60 text-foreground"
                        : "bg-transparent border-border text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    API Key
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProviderField("gemini", "authMode", "oauth")}
                    className={cn(
                      "flex-1 py-1.5 text-xs rounded border font-medium text-center transition-colors",
                      config.providers.gemini.authMode === "oauth"
                        ? "bg-muted border-foreground/60 text-foreground"
                        : "bg-transparent border-border text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    Google OAuth
                  </button>
                </div>
              </div>

              {/* Mode A: API Key */}
              {(config.providers.gemini.authMode || "apikey") === "apikey" && (
                <div className="space-y-3.5 border-t pt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Gemini API Key</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="password"
                      placeholder="AIzaSy..."
                      value={config.providers.gemini.apiKey || ""}
                      onChange={(e) => updateProviderField("gemini", "apiKey", e.target.value)}
                      onBlur={() => save()}
                    />
                  </div>
                </div>
              )}

              {/* Mode B: Google OAuth */}
              {config.providers.gemini.authMode === "oauth" && (
                <div className="space-y-3.5 border-t pt-3">
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Create credentials in Google Cloud Console. Redirect URI must be:<br />
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[9px] break-all">{window.location.origin}/api/ai/oauth/google/callback</code>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Google Client ID</Label>
                      <Input
                        className="h-8 text-xs font-mono"
                        placeholder="...apps.googleusercontent.com"
                        value={config.providers.gemini.clientId || ""}
                        onChange={(e) => updateProviderField("gemini", "clientId", e.target.value)}
                        onBlur={() => save()}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Google Client Secret</Label>
                      <Input
                        className="h-8 text-xs font-mono"
                        type="password"
                        placeholder="GOCSPX-..."
                        value={config.providers.gemini.clientSecret || ""}
                        onChange={(e) => updateProviderField("gemini", "clientSecret", e.target.value)}
                        onBlur={() => save()}
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex gap-2 items-center justify-between">
                    <div className="text-[10px] text-muted-foreground flex-1 min-w-0">
                      {config.providers.gemini.accessToken ? (
                        <span className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                          <Check className="size-3.5" /> Token Link Active
                        </span>
                      ) : (
                        <span className="italic">Click link account to authorize.</span>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!config.providers.gemini.clientId || !config.providers.gemini.clientSecret}
                        onClick={startGeminiOauth}
                      >
                        Link Google Account
                      </Button>
                      {config.providers.gemini.accessToken && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => disconnectOauth("gemini")}
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1 border-t pt-3">
                <Label className="text-xs">Model Identifier</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="e.g. gemini-2.5-flash"
                  value={config.providers.gemini.model}
                  onChange={(e) => updateProviderField("gemini", "model", e.target.value)}
                  onBlur={() => save()}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Custom AI Servers Tab ── */}
        <TabsContent value="custom" className="mt-4 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold">Local & Custom Servers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Plug in local or private gateways (Ollama, LM Studio, vLLM, custom gateways).</p>
            </div>
            <Button size="sm" variant="outline" onClick={addCustomServer} className="gap-1.5">
              <Plus className="size-3.5" /> Add Server
            </Button>
          </div>

          {(!config.customServers || config.customServers.length === 0) ? (
            <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
              <Terminal className="size-6 text-muted-foreground/60 mx-auto" />
              <p className="text-xs font-medium text-muted-foreground">No custom servers configured yet</p>
              <p className="text-[10px] text-muted-foreground/80 max-w-xs mx-auto">
                Add one to connect local models running on Ollama, LM Studio, or vLLM endpoints.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {config.customServers.map((server) => {
                const testState = serverTestResult[server.id];
                const isTestingThis = testingServerId === server.id;

                return (
                  <Card key={server.id}>
                    <CardContent className="pt-5 space-y-3.5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <Input
                            className="h-8 font-semibold text-sm bg-transparent border-transparent hover:border-border focus:border-indigo-500/50 px-2 py-0 w-64 max-w-full -ml-2"
                            value={server.name}
                            onChange={(e) => updateCustomServer(server.id, { name: e.target.value })}
                            onBlur={() => save()}
                            placeholder="Server Name"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 px-2 py-1 h-auto"
                          onClick={() => deleteCustomServer(server.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-3 pt-1 border-t">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground font-medium">Endpoint URL</Label>
                          <Input
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. http://localhost:11434/v1/chat/completions"
                            value={server.url}
                            onChange={(e) => updateCustomServer(server.id, { url: e.target.value })}
                            onBlur={() => save()}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground font-medium">Model Identifier</Label>
                            <Input
                              className="h-8 text-xs font-mono"
                              placeholder="e.g. llama3"
                              value={server.model}
                              onChange={(e) => updateCustomServer(server.id, { model: e.target.value })}
                              onBlur={() => save()}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground font-medium">Authorization Token (Optional)</Label>
                            <Input
                              className="h-8 text-xs font-mono"
                              type="password"
                              placeholder="Bearer API Key"
                              value={server.apiKey}
                              onChange={(e) => updateCustomServer(server.id, { apiKey: e.target.value })}
                              onBlur={() => save()}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-4">
                        <div className="text-[11px] min-w-0 flex-1 truncate">
                          {isTestingThis ? (
                            <span className="text-muted-foreground animate-pulse flex items-center gap-1.5">
                              <RefreshCw className="size-3 animate-spin text-indigo-500" /> Connecting to server...
                            </span>
                          ) : testState ? (
                            testState.success ? (
                              <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                <Check className="size-3.5 shrink-0" /> {testState.text}
                              </span>
                            ) : (
                              <span className="text-destructive font-medium flex items-center gap-1 truncate" title={testState.error}>
                                <X className="size-3.5 shrink-0" /> {testState.error}
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground italic">Click Test to check connection parameters.</span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTestingThis}
                          onClick={() => testCustomServer(server)}
                          className="h-7 text-xs px-3 font-semibold shrink-0"
                        >
                          Test Server
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Agent Mapping Tab ── */}
        <TabsContent value="routing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Assignments</CardTitle>
              <CardDescription>Assign specific task agents to any connected AI service or custom server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Translation Agent</Label>
                <select
                  value={config.agents.translation}
                  onChange={(e) => {
                    const next = {
                      ...config,
                      agents: { ...config.agents, translation: e.target.value }
                    };
                    setConfig(next);
                    save(next);
                  }}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <optgroup label="Built-in Providers">
                    <option value="claude">Anthropic Claude</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="gemini">Google Gemini</option>
                  </optgroup>
                  {config.customServers && config.customServers.length > 0 && (
                    <optgroup label="Custom Local Servers">
                      {config.customServers.map((s) => (
                        <option key={s.id} value={`custom__${s.id}`}>{s.name} ({s.model})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-muted-foreground">Used for forms localization translations.</p>
              </div>

              <div className="space-y-1.5 border-t pt-4">
                <Label className="text-sm font-semibold">SEO & Meta Description Builder</Label>
                <select
                  value={config.agents.seo}
                  onChange={(e) => {
                    const next = {
                      ...config,
                      agents: { ...config.agents, seo: e.target.value }
                    };
                    setConfig(next);
                    save(next);
                  }}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <optgroup label="Built-in Providers">
                    <option value="claude">Anthropic Claude</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="gemini">Google Gemini</option>
                  </optgroup>
                  {config.customServers && config.customServers.length > 0 && (
                    <optgroup label="Custom Local Servers">
                      {config.customServers.map((s) => (
                        <option key={s.id} value={`custom__${s.id}`}>{s.name} ({s.model})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-muted-foreground">Generates metadata suggestions in site layout settings.</p>
              </div>

              <div className="space-y-1.5 border-t pt-4">
                <Label className="text-sm font-semibold">Content Composition Co-Writer</Label>
                <select
                  value={config.agents.contentGeneration}
                  onChange={(e) => {
                    const next = {
                      ...config,
                      agents: { ...config.agents, contentGeneration: e.target.value }
                    };
                    setConfig(next);
                    save(next);
                  }}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <optgroup label="Built-in Providers">
                    <option value="claude">Anthropic Claude</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="gemini">Google Gemini</option>
                  </optgroup>
                  {config.customServers && config.customServers.length > 0 && (
                    <optgroup label="Custom Local Servers">
                      {config.customServers.map((s) => (
                        <option key={s.id} value={`custom__${s.id}`}>{s.name} ({s.model})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-xs text-muted-foreground">Assists bloggers in autowriting post outlines and drafts.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Connection Tester Tab ── */}
        <TabsContent value="tester" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="size-4 text-green-500 animate-pulse" />
                Live Connection Testing Console
              </CardTitle>
              <CardDescription>
                Test your configuration by translating text using the currently selected Translation Agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs bg-muted/40 p-2 rounded border border-border/80">
                <span className="font-medium text-muted-foreground">Mapped Translation Provider:</span>
                <span className="font-semibold text-foreground uppercase tracking-wider text-[10px] bg-background px-2 py-0.5 rounded border border-border">
                  {config.agents.translation.startsWith("custom__")
                    ? config.customServers?.find(s => s.id === config.agents.translation.split("__")[1])?.name || "Custom server"
                    : config.agents.translation}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">English Input Prompt</Label>
                <textarea
                  className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  value={testerText}
                  onChange={(e) => setTesterText(e.target.value)}
                />
              </div>

              <Button
                onClick={runConnectionTest}
                disabled={testing}
                className="w-full"
                size="sm"
              >
                {testing ? (
                  <>
                    <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> Running translation...
                  </>
                ) : (
                  <>
                    <Play className="size-3.5 mr-1.5" /> Translate to Spanish (EN → ES)
                  </>
                )}
              </Button>

              <div className="space-y-1">
                <Label className="text-xs block">Console Log Output</Label>
                <div className="bg-muted/70 rounded-md border border-border/80 p-3 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto select-text min-h-[80px]">
                  {testResult ? (
                    testResult.success ? (
                      <div className="text-foreground">
                        <span className="text-green-600 dark:text-green-400 font-bold block mb-1">✓ Connection success</span>
                        {testResult.text}
                      </div>
                    ) : (
                      <div className="text-destructive">
                        <span className="text-destructive font-bold block mb-1">✗ Connection failed</span>
                        {testResult.error}
                      </div>
                    )
                  ) : (
                    <span className="text-muted-foreground italic">Console idle. Send a translation trigger.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
