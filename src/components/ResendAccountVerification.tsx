"use client";

import { useActionState } from "react";
import { resendAccountVerification } from "@/app/actions/auth";

// Bouton « Renvoyer un code » sur la page d'attente d'inscription.
export default function ResendAccountVerification({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendAccountVerification, undefined);

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Renvoyer un code"}
      </button>
      {state?.ok && <p className="mt-2 text-sm text-emerald-600">Nouveau code envoyé.</p>}
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
