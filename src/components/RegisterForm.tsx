"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { register } from "@/app/actions/auth";
import { PASSWORD_MIN } from "@/lib/password";
import PasswordInput from "@/components/PasswordInput";

// Formulaire de création d'un compte interne (nom, prénom, e-mail, mot de passe + confirmation).
// Champs CONTRÔLÉS : une erreur serveur (ex. e-mail déjà pris) n'efface pas la saisie.
export default function RegisterForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(register, undefined);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Contrôle local de la confirmation (n'apparaît qu'une fois le champ renseigné).
  const mismatch = confirm.length > 0 && confirm !== password;

  const field =
    "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const err = "mt-1 text-xs text-red-600";

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl || "/"} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-zinc-700">
            Prénom
          </label>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={field}
          />
          {state?.errors?.firstName && <p className={err}>{state.errors.firstName}</p>}
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-zinc-700">
            Nom
          </label>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={field}
          />
          {state?.errors?.lastName && <p className={err}>{state.errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
        {state?.errors?.email && <p className={err}>{state.errors.email}</p>}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
          Mot de passe
        </label>
        <PasswordInput
          id="password"
          name="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
        />
        {state?.errors?.password ? (
          <p className={err}>{state.errors.password}</p>
        ) : (
          <p className="mt-1 text-xs text-zinc-400">Au moins {PASSWORD_MIN} caractères.</p>
        )}
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-zinc-700">
          Confirmer le mot de passe
        </label>
        <PasswordInput
          id="confirm"
          name="confirmPassword"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        {mismatch && <p className={err}>Les deux mots de passe ne correspondent pas.</p>}
      </div>

      {state?.message && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending || mismatch}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer mon compte"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Déjà un compte ?{" "}
        <Link
          href={`/connexion${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="font-medium text-emerald-700 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}
