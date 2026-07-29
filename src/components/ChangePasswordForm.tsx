"use client";

import { useActionState, useEffect, useState } from "react";
import { changePassword } from "@/app/actions/account";
import { PASSWORD_MIN } from "@/lib/password";
import PasswordInput from "@/components/PasswordInput";

// Changement de mot de passe (compte interne) : ancien + nouveau + confirmation.
export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  // Vide les champs après un changement réussi.
  useEffect(() => {
    if (state?.ok) {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }, [state?.ok]);

  const mismatch = confirm.length > 0 && confirm !== next;

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-zinc-700">
          Mot de passe actuel
        </label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-zinc-700">
          Nouveau mot de passe
        </label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
        />
        <p className="mt-1 text-xs text-zinc-400">Au moins {PASSWORD_MIN} caractères.</p>
      </div>
      <div>
        <label htmlFor="confirmNewPassword" className="mb-1 block text-sm font-medium text-zinc-700">
          Confirmer le nouveau mot de passe
        </label>
        <PasswordInput
          id="confirmNewPassword"
          name="confirmNewPassword"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        {mismatch && (
          <p className="mt-1 text-xs text-red-600">Les deux mots de passe ne correspondent pas.</p>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Mot de passe modifié.</p>}

      <button
        type="submit"
        disabled={pending || mismatch}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Modification…" : "Changer le mot de passe"}
      </button>
    </form>
  );
}
