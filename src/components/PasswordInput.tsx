"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

// Champ mot de passe contrôlé avec bouton « afficher / masquer » (œil).
export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  autoComplete,
  minLength,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        required
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        title={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-700"
      >
        {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
    </div>
  );
}
