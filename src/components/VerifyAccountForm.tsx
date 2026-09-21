"use client";

import { useActionState, useState } from "react";
import { verifyAccountEmail } from "@/app/actions/auth";
import { CODE_LENGTH } from "@/lib/codeConstants";

// Saisie du code de confirmation reçu par e-mail à la création d'un compte interne.
// En cas de succès, l'action redirige vers la connexion.
export default function VerifyAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyAccountEmail, undefined);
  const [code, setCode] = useState("");

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="email" value={email} />
      <label htmlFor="code" className="block text-left text-sm font-medium text-zinc-700">
        Code de confirmation
      </label>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={CODE_LENGTH}
        required
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
        placeholder={"•".repeat(CODE_LENGTH)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-center text-2xl font-semibold tracking-[0.4em] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />

      {state?.error && <p className="mt-2 text-left text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || code.length !== CODE_LENGTH}
        className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Vérification…" : "Confirmer mon adresse"}
      </button>
    </form>
  );
}
