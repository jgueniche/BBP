"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const emailSchema = z.email();
const passwordSchema = z.string().min(6);

const inputClass =
  "w-full rounded-[20px] border-2 border-ink bg-paper px-4 py-3 outline-none focus:border-boutargue-deep";
const primaryButtonClass =
  "w-full rounded-full border-2 border-ink bg-boutargue px-6 py-3 font-semibold text-ink shadow-[4px_4px_0_var(--color-ink)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-ink)] disabled:opacity-50";

function authErrorMessage(code: string | undefined, mode: "signin" | "signup") {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return fr.auth.alreadyRegistered;
    case "email_not_confirmed":
      return fr.auth.emailNotConfirmed;
    default:
      return mode === "signin" ? fr.auth.signInError : fr.auth.signUpError;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!emailSchema.safeParse(email).success) {
      setError(fr.auth.invalidEmail);
      return;
    }
    if (!passwordSchema.safeParse(password).success) {
      setError(fr.auth.invalidPassword);
      return;
    }

    setPending(true);
    const supabase = createClient();

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setPending(false);
      if (signInError) {
        setError(authErrorMessage(signInError.code, "signin"));
        return;
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      setPending(false);
      if (signUpError) {
        setError(authErrorMessage(signUpError.code, "signup"));
        return;
      }
      if (!data.session) {
        // Email confirmation is still enabled in Supabase: no session until confirmed.
        setNotice(fr.auth.confirmEmailSent);
        setMode("signin");
        return;
      }
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

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
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
        <label className="flex flex-col gap-2 font-medium">
          {fr.auth.passwordLabel}
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={fr.auth.passwordPlaceholder}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={pending || !isSupabaseConfigured}
          className={primaryButtonClass}
        >
          {mode === "signin" ? fr.auth.signIn : fr.auth.signUp}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="text-sm font-medium text-ink-70 underline"
        >
          {mode === "signin" ? fr.auth.toSignUp : fr.auth.toSignIn}
        </button>
      </form>

      {notice && <p className="mt-4 text-sm font-medium text-ok">{notice}</p>}
      {error && <p className="mt-4 text-sm font-medium text-warn">{error}</p>}
    </section>
  );
}
