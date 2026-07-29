"use client";

import { useActionState } from "react";
import { resendAccountVerification } from "@/app/actions/auth";

// Bouton « Renvoyer l'e-mail de confirmation » sur la page d'attente d'inscription.
export default function ResendAccountVerification({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendAccountVerification, undefined);

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={pending || state?.ok}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
      >
        {pending ? "Envoi…" : state?.ok ? "E-mail renvoyé" : "Renvoyer l'e-mail de confirmation"}
      </button>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
