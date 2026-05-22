import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { isDark, toggleTheme } from "@/lib/theme";

/** Dark/Light mode toggle for the navigation. The visitor's choice persists. */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(isDark());
    sync();
    window.addEventListener("openweb-theme", sync);
    return () => window.removeEventListener("openweb-theme", sync);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={
        className ??
        "inline-flex items-center justify-center size-11 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10 transition-colors"
      }
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
