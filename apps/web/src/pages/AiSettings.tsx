import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Sparkles,
  Check,
  X,
  RefreshCw,
  Play,
  Settings,
  Key,
  Terminal,
  Sliders,
  Radio,
  Cpu,
  Fingerprint
} from "lucide-react";

type AIProvider = {
  connected: boolean;
  apiKey: string;
  model: string;
  url?: string;
};

type AIConfig = {
  providers: {
    claude: AIProvider;
    gemini: AIProvider;
    openai: AIProvider;
    custom: AIProvider;
  };
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
      gemini: { connected: false, apiKey: "", model: "gemini-2.5-flash" },
      openai: { connected: false, apiKey: "", model: "gpt-4o-mini" },
      custom: { connected: false, url: "", apiKey: "", model: "" }
    },
    agents: {
      translation: "claude",
      seo: "openai",
      contentGeneration: "gemini"
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Connection tester state
  const [testerText, setTesterText] = useState("Hello world! Empowering web applications with premium agentic workflows.");
  const [testResult, setTestResult] = useState<{ success: boolean; text?: string; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // OAuth Modal state
  const [activeOauth, setActiveOauth] = useState<"claude" | "gemini" | "openai" | null>(null);
  const [oauthStep, setOauthStep] = useState<"auth" | "loading" | "success">("auth");
  const [oauthKey, setOauthKey] = useState("");
  const [oauthModel, setOauthModel] = useState("");

  useEffect(() => {
    api.siteSettings.get()
      .then((s) => {
        if (s.aiConfig) {
          setConfig((prev) => ({
            ...prev,
            ...s.aiConfig
          }));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (customConfig?: AIConfig) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const targetConfig = customConfig || config;
    try {
      await api.siteSettings.update({ aiConfig: targetConfig });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to save AI configuration");
    } finally {
      setSaving(false);
    }
  };

  const openOauthModal = (provider: "claude" | "gemini" | "openai") => {
    const current = config.providers[provider];
    setOauthKey(current.apiKey.startsWith("mock-") ? "" : current.apiKey);
    setOauthModel(current.model);
    setOauthStep("auth");
    setActiveOauth(provider);
  };

  const handleOauthConnect = () => {
    if (!activeOauth) return;
    setOauthStep("loading");

    // Simulate authenticating/connecting
    setTimeout(() => {
      setOauthStep("success");
      const updatedConfig = {
        ...config,
        providers: {
          ...config.providers,
          [activeOauth]: {
            connected: true,
            apiKey: oauthKey.trim() || `mock-${activeOauth}-key-${Math.random().toString(36).substring(2, 10)}`,
            model: oauthModel.trim() || config.providers[activeOauth].model
          }
        }
      };
      setConfig(updatedConfig);
      handleSave(updatedConfig);

      setTimeout(() => {
        setActiveOauth(null);
      }, 1500);
    }, 1800);
  };

  const handleDisconnect = (provider: keyof AIConfig["providers"]) => {
    const updatedConfig = {
      ...config,
      providers: {
        ...config.providers,
        [provider]: {
          ...config.providers[provider],
          connected: false,
          apiKey: ""
        }
      }
    };
    setConfig(updatedConfig);
    handleSave(updatedConfig);
  };

  const runConnectionTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testerText })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, text: data.translated?.test || JSON.stringify(data.translated) });
      } else {
        setTestResult({ success: false, error: data.warning || "Connection failed. Please verify API keys and provider models." });
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message || "Network error. Failed to hit test endpoint." });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading AI integration settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="size-8 text-indigo-500 animate-pulse" />
            AI Integration & Agent Mapping
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Login directly to third-party AI services, map key backend jobs to providers, and build robust automated pipelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20 font-medium">{error}</span>}
          {success && <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950/20 px-3 py-1.5 rounded-lg border border-green-500/20 font-medium">Settings saved successfully!</span>}
          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="shadow-md hover:shadow-lg transition-all"
          >
            {saving ? "Saving Changes..." : "Save AI Settings"}
          </Button>
        </div>
      </div>

      {/* Grid of Providers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Claude Card */}
        <Card className="overflow-hidden border-t-4 border-t-amber-700 bg-gradient-to-b from-amber-50/10 to-transparent dark:from-amber-950/5 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center font-bold text-amber-800 dark:text-amber-300">
                  𝓒
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Claude</CardTitle>
                  <CardDescription className="text-xs">Anthropic Models</CardDescription>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all",
                config.providers.claude.connected
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                  : "bg-muted border-border text-muted-foreground"
              )}>
                {config.providers.claude.connected ? "Connected" : "Not Linked"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Superb linguistic capabilities, deep context comprehension, and premium translation output quality.
            </p>
            <div className="text-[11px] font-mono bg-muted/60 p-2 rounded border border-border/40 text-muted-foreground space-y-1">
              <div>Model: {config.providers.claude.model}</div>
              <div>Key: {config.providers.claude.connected ? `${config.providers.claude.apiKey.slice(0, 10)}...` : "None"}</div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openOauthModal("claude")}
                className="w-full text-xs font-semibold"
              >
                {config.providers.claude.connected ? "Configure Settings" : "Login to Claude"}
              </Button>
              {config.providers.claude.connected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect("claude")}
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Unlink
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* OpenAI Card */}
        <Card className="overflow-hidden border-t-4 border-t-emerald-600 bg-gradient-to-b from-emerald-50/10 to-transparent dark:from-emerald-950/5 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center font-bold text-emerald-800 dark:text-emerald-300">
                  𝓞
                </div>
                <div>
                  <CardTitle className="text-base font-bold">OpenAI</CardTitle>
                  <CardDescription className="text-xs">GPT-4o & Mini Models</CardDescription>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all",
                config.providers.openai.connected
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                  : "bg-muted border-border text-muted-foreground"
              )}>
                {config.providers.openai.connected ? "Connected" : "Not Linked"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Highly stable, standardized JSON mode responses, ideal for bulk SEO metadata mapping and logical routines.
            </p>
            <div className="text-[11px] font-mono bg-muted/60 p-2 rounded border border-border/40 text-muted-foreground space-y-1">
              <div>Model: {config.providers.openai.model}</div>
              <div>Key: {config.providers.openai.connected ? `${config.providers.openai.apiKey.slice(0, 10)}...` : "None"}</div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openOauthModal("openai")}
                className="w-full text-xs font-semibold"
              >
                {config.providers.openai.connected ? "Configure Settings" : "Login to OpenAI"}
              </Button>
              {config.providers.openai.connected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect("openai")}
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Unlink
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gemini Card */}
        <Card className="overflow-hidden border-t-4 border-t-indigo-600 bg-gradient-to-b from-indigo-50/10 to-transparent dark:from-indigo-950/5 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center font-bold text-indigo-800 dark:text-indigo-300">
                  𝓖
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Gemini</CardTitle>
                  <CardDescription className="text-xs">Google AI Studio</CardDescription>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all",
                config.providers.gemini.connected
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                  : "bg-muted border-border text-muted-foreground"
              )}>
                {config.providers.gemini.connected ? "Connected" : "Not Linked"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ultra-fast generation speeds, enormous context windows, and perfect for real-time draft composition tasks.
            </p>
            <div className="text-[11px] font-mono bg-muted/60 p-2 rounded border border-border/40 text-muted-foreground space-y-1">
              <div>Model: {config.providers.gemini.model}</div>
              <div>Key: {config.providers.gemini.connected ? `${config.providers.gemini.apiKey.slice(0, 10)}...` : "None"}</div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openOauthModal("gemini")}
                className="w-full text-xs font-semibold"
              >
                {config.providers.gemini.connected ? "Configure Settings" : "Login to Gemini"}
              </Button>
              {config.providers.gemini.connected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect("gemini")}
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Unlink
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Agent Routing & Custom Server */}
        <div className="space-y-8">
          {/* Agent Mapping Selector */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sliders className="size-5 text-indigo-500" />
                Backend Agent Mapping
              </CardTitle>
              <CardDescription>
                Assign specific background processing agents to your connected AI providers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Agent 1 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <Label className="text-sm font-semibold block">Translation Agent</Label>
                  <span className="text-xs text-muted-foreground">Translates forms, pages, and emails in real-time.</span>
                </div>
                <select
                  value={config.agents.translation}
                  onChange={(e) => setConfig({
                    ...config,
                    agents: { ...config.agents, translation: e.target.value }
                  })}
                  className="rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground w-full sm:w-48 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="gemini">Gemini (Google)</option>
                  <option value="custom">Custom AI Server</option>
                </select>
              </div>

              {/* Agent 2 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <Label className="text-sm font-semibold block">SEO & Meta Builder</Label>
                  <span className="text-xs text-muted-foreground">Autocomposes title tags and descriptions for site settings.</span>
                </div>
                <select
                  value={config.agents.seo}
                  onChange={(e) => setConfig({
                    ...config,
                    agents: { ...config.agents, seo: e.target.value }
                  })}
                  className="rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground w-full sm:w-48 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="gemini">Gemini (Google)</option>
                  <option value="custom">Custom AI Server</option>
                </select>
              </div>

              {/* Agent 3 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-semibold block">Content Generation Agent</Label>
                  <span className="text-xs text-muted-foreground">Assists bloggers to draft posts, summaries and content blocks.</span>
                </div>
                <select
                  value={config.agents.contentGeneration}
                  onChange={(e) => setConfig({
                    ...config,
                    agents: { ...config.agents, contentGeneration: e.target.value }
                  })}
                  className="rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground w-full sm:w-48 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="gemini">Gemini (Google)</option>
                  <option value="custom">Custom AI Server</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Custom AI Server Settings */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="size-5 text-amber-500" />
                Custom AI Server
              </CardTitle>
              <CardDescription>
                Plug in an OpenAI-compatible local AI gateway (Ollama, LM Studio, vLLM, or custom proxies).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all",
                  config.providers.custom.connected
                    ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300"
                    : "bg-muted border-border text-muted-foreground"
                )}>
                  {config.providers.custom.connected ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Endpoint Base URL</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="e.g. http://localhost:11434/v1/chat/completions"
                  value={config.providers.custom.url || ""}
                  onChange={(e) => setConfig({
                    ...config,
                    providers: {
                      ...config.providers,
                      custom: { ...config.providers.custom, url: e.target.value }
                    }
                  })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Model Identifier</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="e.g. llama3.1"
                    value={config.providers.custom.model}
                    onChange={(e) => setConfig({
                      ...config,
                      providers: {
                        ...config.providers,
                        custom: { ...config.providers.custom, model: e.target.value }
                      }
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Server Token / API Key</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    type="password"
                    placeholder="Optional credentials"
                    value={config.providers.custom.apiKey}
                    onChange={(e) => setConfig({
                      ...config,
                      providers: {
                        ...config.providers,
                        custom: { ...config.providers.custom, apiKey: e.target.value }
                      }
                    })}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-4">
                <p className="text-[10px] text-muted-foreground">
                  Make sure custom servers allow CORS requests if connecting client-side, otherwise request will route via API gateway.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextConnected = !config.providers.custom.connected;
                    const updated = {
                      ...config,
                      providers: {
                        ...config.providers,
                        custom: { ...config.providers.custom, connected: nextConnected }
                      }
                    };
                    setConfig(updated);
                    handleSave(updated);
                  }}
                  className="text-xs font-semibold shrink-0"
                >
                  {config.providers.custom.connected ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Live Tester & Instructions */}
        <div className="space-y-8">
          {/* Connection Tester */}
          <Card className="h-full flex flex-col shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Radio className="size-5 text-green-500 animate-pulse" />
                Live Connection Tester
              </CardTitle>
              <CardDescription>
                Verify routing capabilities by translating a test prompt using the active Translation Agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Cpu className="size-3.5" />
                    Target Provider:
                  </span>
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40 capitalize">
                    {config.agents.translation}
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Source Text (English)</Label>
                  <textarea
                    className="w-full h-20 bg-background border border-border/80 rounded-lg p-2.5 text-xs focus:border-indigo-500 focus:outline-none resize-none font-medium"
                    value={testerText}
                    onChange={(e) => setTesterText(e.target.value)}
                  />
                </div>

                <Button
                  onClick={runConnectionTest}
                  disabled={testing || !config.providers[config.agents.translation as keyof AIConfig["providers"]]?.connected}
                  className="w-full h-9 text-xs"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                      Contacting Agent...
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 mr-1.5" />
                      Test AI Translation (EN → ES)
                    </>
                  )}
                </Button>
              </div>

              {/* Output Results */}
              <div className="flex-1 min-h-[120px] flex flex-col mt-4">
                <Label className="text-xs mb-1.5 block">Response Output</Label>
                <div className="flex-1 bg-muted/70 rounded-lg border border-border/40 p-3 relative font-mono text-[11px] leading-relaxed select-text overflow-auto max-h-48">
                  {testing && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground animate-pulse">Running test...</span>
                    </div>
                  )}
                  {testResult ? (
                    testResult.success ? (
                      <div className="text-foreground">
                        <span className="text-green-600 dark:text-green-400 font-bold block mb-1">✓ Success</span>
                        {testResult.text}
                      </div>
                    ) : (
                      <div className="text-destructive">
                        <span className="text-destructive font-bold block mb-1">✗ Connection Error</span>
                        {testResult.error}
                      </div>
                    )
                  ) : (
                    <span className="text-muted-foreground italic">Click "Test AI Translation" to verify connection. Make sure the target provider is connected first.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Simulated OAuth Modal Overlay */}
      {activeOauth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className={cn(
            "w-full max-w-md bg-background border rounded-2xl shadow-2xl overflow-hidden animate-scale-up",
            activeOauth === "claude" && "border-amber-500/20",
            activeOauth === "openai" && "border-emerald-500/20",
            activeOauth === "gemini" && "border-indigo-500/20"
          )}>
            {/* Modal Brand Header Banner */}
            <div className={cn(
              "px-6 py-6 text-white relative overflow-hidden",
              activeOauth === "claude" && "bg-gradient-to-r from-amber-800 to-amber-950",
              activeOauth === "openai" && "bg-gradient-to-r from-emerald-700 to-emerald-900",
              activeOauth === "gemini" && "bg-gradient-to-r from-indigo-700 via-indigo-900 to-slate-900"
            )}>
              {/* Backdrops or glow */}
              <div className="absolute -right-12 -top-12 size-40 rounded-full bg-white/5 blur-2xl" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-lg">
                    {activeOauth === "claude" && "𝓒"}
                    {activeOauth === "openai" && "𝓞"}
                    {activeOauth === "gemini" && "𝓖"}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">
                      {activeOauth === "claude" && "Anthropic Authorization"}
                      {activeOauth === "openai" && "OpenAI Developer Sync"}
                      {activeOauth === "gemini" && "Google AI Studio Integration"}
                    </h3>
                    <p className="text-[10px] text-white/70">Secure simulated OAuth workflow</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveOauth(null)}
                  className="rounded-full bg-white/15 hover:bg-white/20 p-1.5 transition-colors focus:outline-none"
                >
                  <X className="size-4 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {oauthStep === "auth" && (
                <>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3">
                      <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                        <Fingerprint className="size-4 text-indigo-500" />
                        Permissions Requested:
                      </p>
                      <ul className="text-[11px] text-foreground space-y-2 leading-relaxed">
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span>Retrieve list of authorized model weights</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span>Publish raw prompt payloads for agent processing</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="size-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span>Securely store returned response strings on OpenWeb</span>
                        </li>
                      </ul>
                    </div>

                    {/* API Key overrides */}
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <Key className="size-3.5 text-muted-foreground" />
                          API Credentials Override (Optional)
                        </Label>
                        <Input
                          className="h-8 text-xs font-mono"
                          type="password"
                          placeholder="sk-..."
                          value={oauthKey}
                          onChange={(e) => setOauthKey(e.target.value)}
                        />
                        <span className="text-[10px] text-muted-foreground block">
                          If omitted, we will automatically generate a mock developer credentials token to simulate a successful authorization state.
                        </span>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <Settings className="size-3.5 text-muted-foreground" />
                          Default Model Override
                        </Label>
                        <Input
                          className="h-8 text-xs font-mono"
                          placeholder="Model ID"
                          value={oauthModel}
                          onChange={(e) => setOauthModel(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-3 border-t">
                    <Button
                      variant="ghost"
                      onClick={() => setActiveOauth(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleOauthConnect}
                      className={cn(
                        "text-xs shadow-md font-semibold",
                        activeOauth === "claude" && "bg-amber-800 hover:bg-amber-900 text-white",
                        activeOauth === "openai" && "bg-emerald-700 hover:bg-emerald-800 text-white",
                        activeOauth === "gemini" && "bg-indigo-700 hover:bg-indigo-800 text-white"
                      )}
                    >
                      Authorize & Connect
                    </Button>
                  </div>
                </>
              )}

              {oauthStep === "loading" && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className={cn(
                      "size-12 rounded-full border-4 border-t-transparent animate-spin",
                      activeOauth === "claude" && "border-amber-700",
                      activeOauth === "openai" && "border-emerald-600",
                      activeOauth === "gemini" && "border-indigo-600"
                    )} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Cpu className="size-4 text-muted-foreground/60 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Exchanging credentials...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Establishing connection with remote server</p>
                  </div>
                </div>
              )}

              {oauthStep === "success" && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-scale-up">
                  <div className="size-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center border border-green-300 dark:border-green-800">
                    <Check className="size-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">Connection Established!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Workspace successfully integrated into OpenWeb settings.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
