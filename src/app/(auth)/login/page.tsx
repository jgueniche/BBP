"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const emailSchema = z.email();

const inputClass =
  "w-full rounded-[20px] border-2 border-ink bg-paper px-4 py-3 outline-none focus:border-boutargue-deep";
const primaryButtonClass =
  "w-full rounded-full border-2 border-ink bg-boutargue px-6 py-3 font-semibold text-ink shadow-[4px_4px_0_var(--color-ink)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-ink)] disabled:opacity-50";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!emailSchema.safeParse(email).success) {
      setError(fr.auth.invalidEmail);
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setPending(false);
    if (sendError) {
      setError(fr.auth.sendError);
      return;
    }
    setStep("code");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setPending(false);
    if (verifyError) {
      setError(fr.auth.verifyError);
      return;
    }
    router.push("/journal");
    router.refresh();
  }

  return (
    <section className="rounded-[20px] border-2 border-ink bg-paper p-6 shadow-[4px_4px_0_var(--color-ink)]">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {fr.auth.title}
      </h1>
      <p className="mt-2 text-ink-70">{fr.auth.subtitle}</p>

      {!isSupabaseConfigured && (
        <p className="mt-4 rounded-[16px] bg-boutargue-soft p-3 text-sm text-ink-70">
          {fr.auth.notConfigured}
        </p>
      )}

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2 font-medium">
            {fr.auth.emailLabel}
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={fr.auth.emailPlaceholder}
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={pending || !isSupabaseConfigured}
            className={primaryButtonClass}
          >
            {fr.auth.sendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2 font-medium">
            {fr.auth.codeLabel}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={fr.auth.codePlaceholder}
              className={`${inputClass} font-mono`}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className={primaryButtonClass}
          >
            {fr.auth.verifyCode}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="text-sm font-medium text-ink-70 underline"
          >
            {fr.auth.changeEmail}
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-sm font-medium text-warn">{error}</p>}
    </section>
  );
}
