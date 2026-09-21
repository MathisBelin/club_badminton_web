"use client";

import { useState, useTransition } from "react";
import { verifyEmailCode, resendVerification } from "@/app/actions/responses";
import { CODE_LENGTH } from "@/lib/codeConstants";

// Saisie du code de vérification reçu à une adresse indiquée dans une réponse.
// Bouton « Vérifier » (valide le code) + « Renvoyer un code » (relance un envoi).
export default function VerifyEmailCode({ formId, email }: { formId: string; email: string }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [verifying, startVerify] = useTransition();
  const [resending, startResend] = useTransition();

  function verify() {
    setState(null);
    startVerify(async () => {
      const result = await verifyEmailCode(formId, email, code);
      // Succès complet : l'action redirige (vers /merci) et rien n'est renvoyé.
      if (!result.ok) setState({ type: "error", text: result.error });
    });
  }

  function resend() {
    setState(null);
    startResend(async () => {
      const result = await resendVerification(formId, email);
      setState(
        result.ok
          ? { type: "ok", text: "Nouveau code envoyé." }
          : { type: "error", text: result.error },
      );
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
          placeholder={"•".repeat(CODE_LENGTH)}
          aria-label={`Code reçu à ${email}`}
          className="w-32 rounded-md border border-zinc-300 px-3 py-1.5 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={verify}
          disabled={verifying || code.length !== CODE_LENGTH}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {verifying ? "Vérification…" : "Vérifier"}
        </button>
        <button
          onClick={resend}
          disabled={resending}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
        >
          {resending ? "Envoi…" : "Renvoyer un code"}
        </button>
      </div>
      {state && (
        <p className={`mt-1.5 text-xs ${state.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
          {state.text}
        </p>
      )}
    </div>
  );
}
