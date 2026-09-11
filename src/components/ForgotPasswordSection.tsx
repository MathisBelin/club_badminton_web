"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";

// Section « Mot de passe oublié » de la page de connexion : dépliable, envoie un nouveau
// mot de passe par e-mail au compte interne correspondant (réponse neutre).
export default function ForgotPasswordSection() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  if (!open) {
    return (
      <p className="mt-3 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-zinc-500 hover:text-emerald-700 hover:underline"
        >
          Mot de passe oublié ?
        </button>
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-800">Mot de passe oublié</p>
      <p className="mt-1 text-xs text-zinc-500">
        Saisissez l&apos;adresse de votre compte interne : un lien de réinitialisation vous sera
        envoyé par e-mail. En l&apos;ouvrant, vous recevrez un nouveau mot de passe. (Comptes Google :
        le mot de passe est géré par Google.)
      </p>

      {state?.ok ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : (
        <form action={action} className="mt-3 space-y-2">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="votre@email.fr"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          {state?.message && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? "Envoi…" : "Envoyer un nouveau mot de passe"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
