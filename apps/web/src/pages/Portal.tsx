import { useAuth } from "@/lib/auth";
import { Layers } from "lucide-react";

export function Portal() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-xl bg-foreground flex items-center justify-center">
            <Layers className="size-5 text-background" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriber Portal</h1>
          <p className="text-sm text-muted-foreground">Signed in as <strong>{user?.email}</strong></p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background p-8">
          <p className="text-muted-foreground text-sm">Subscription content coming soon.</p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
