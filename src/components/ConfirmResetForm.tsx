"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { confirmPasswordReset } from "@/app/actions/auth";

// Bouton de confirmation de réinitialisation : au clic, génère et affiche le nouveau mot
// de passe (également envoyé par e-mail).
export default function ConfirmResetForm({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function confirm() {
    setError(null);
    start(async () => {
      const res = await confirmPasswordReset(token);
      if (res.ok) setPassword(res.password);
      else setError(res.error);
    });
  }

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  if (password) {
    return (
      <>
        <p className="mt-2 text-sm text-zinc-600">
          Voici votre nouveau mot de passe. Il vous a aussi été envoyé par e-mail. Connectez-vous,
          puis changez-le depuis « Mon compte ».
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <code className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-800">
            {password}
          </code>
          <button
            type="button"
            onClick={copy}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Aller à la connexion
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="mt-2 text-sm text-zinc-600">
        Confirmez pour générer un nouveau mot de passe pour votre compte.
      </p>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Réinitialisation…" : "Réinitialiser mon mot de passe"}
      </button>
    </>
  );
}
