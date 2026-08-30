"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { Logo } from "@/components/illustrations/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const emailSchema = z.email();
const passwordSchema = z.string().min(6);

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
    <section className="rounded-lg border bg-card p-6 shadow-soft">
      <Logo variant="ink" height={32} className="mb-4" />
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {fr.auth.title}
      </h1>
      <p className="mt-2 text-ink-70">{fr.auth.subtitle}</p>

      {!isSupabaseConfigured && (
        <p className="mt-4 rounded-lg bg-boutargue-tint p-3 text-sm text-[#3d3d3d]">
          {fr.auth.notConfigured}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-2 font-medium">
          {fr.auth.emailLabel}
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={fr.auth.emailPlaceholder}
          />
        </label>
        <label className="flex flex-col gap-2 font-medium">
          {fr.auth.passwordLabel}
          <Input
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={fr.auth.passwordPlaceholder}
          />
        </label>
        <Button
          type="submit"
          disabled={pending || !isSupabaseConfigured}
          className="w-full"
        >
          {mode === "signin" ? fr.auth.signIn : fr.auth.signUp}
        </Button>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signin" ? fr.auth.toSignUp : fr.auth.toSignIn}
        </Button>
      </form>

      {notice && <p className="mt-4 text-sm font-medium text-ok">{notice}</p>}
      {error && <p className="mt-4 text-sm font-medium text-warn">{error}</p>}
    </section>
  );
}
