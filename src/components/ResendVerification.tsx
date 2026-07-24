"use client";

import { useState, useTransition } from "react";
import { resendVerification } from "@/app/actions/responses";

// Bouton « renvoyer l'e-mail de confirmation » : seul moyen de relancer un envoi
// tant que la demande précédente est encore valable (7 jours).
export default function ResendVerification({ formId, email }: { formId: string; email: string }) {
  const [state, setState] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function resend() {
    setState(null);
    startTransition(async () => {
      const result = await resendVerification(formId, email);
      setState(
        result.ok
          ? { type: "ok", text: "E-mail renvoyé." }
          : { type: "error", text: result.error },
      );
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={resend}
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Renvoyer l'e-mail de confirmation"}
      </button>
      {state && (
        <span className={`text-xs ${state.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
          {state.text}
        </span>
      )}
    </div>
  );
}
