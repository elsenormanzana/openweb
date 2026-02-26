import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { NewsletterBlockProps } from "@/lib/blocks";

export function NewsletterBlock({ props }: { props: NewsletterBlockProps }) {
  const { heading, description, placeholder, buttonLabel, collectName, backgroundColor, textColor, align } = props;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLight = textColor === "light";
  const headingClass = isLight ? "text-white" : "text-gray-900";
  const subClass = isLight ? "text-white/75" : "text-gray-500";
  const alignClass = align === "center" ? "text-center items-center" : "text-left items-start";
  const inputBg = isLight ? "bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-white" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400";
  const btnClass = isLight ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-700";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.newsletter.subscribe({
        email: email.trim(),
        name: collectName ? (name.trim() || undefined) : undefined,
        source: "newsletter_block",
      });
      setSuccess("Subscribed successfully.");
      setEmail("");
      setName("");
    } catch (err) {
      setError((err as Error).message || "Subscription failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={backgroundColor ? { backgroundColor } : undefined}
      className={`w-full py-20 px-4 ${!backgroundColor ? "bg-gray-50" : ""}`}
    >
      <div className={`max-w-2xl mx-auto flex flex-col gap-6 ${alignClass}`}>
        <div className={`flex flex-col gap-3 ${alignClass}`}>
          <h2 className={`text-3xl md:text-4xl font-bold leading-tight ${headingClass}`}>{heading}</h2>
          {description && <p className={`text-base ${subClass}`}>{description}</p>}
        </div>
        <form
          className={`flex flex-col gap-3 w-full ${align === "center" ? "max-w-md mx-auto" : "max-w-md"}`}
          onSubmit={onSubmit}
        >
          {collectName && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors ${inputBg}`}
            />
          )}
          <div className="flex gap-3 w-full">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder || "Enter your email"}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors ${inputBg}`}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shrink-0 ${btnClass} disabled:opacity-60`}
            >
              {loading ? "Submitting..." : buttonLabel || "Subscribe"}
            </button>
          </div>
          {success && <p className={`text-xs ${isLight ? "text-white/80" : "text-emerald-700"}`}>{success}</p>}
          {error && <p className={`text-xs ${isLight ? "text-red-200" : "text-red-600"}`}>{error}</p>}
        </form>
        {isLight && (
          <p className="text-xs text-white/50">No spam. Unsubscribe anytime.</p>
        )}
      </div>
    </section>
  );
}
