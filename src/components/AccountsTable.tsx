"use client";

import { useMemo, useState, useTransition } from "react";
import { resetPasswordForUser, deleteUserAccount } from "@/app/actions/adminAccounts";

export type AccountRow = {
  id: string;
  email: string;
  name: string;
  provider: "GOOGLE" | "CREDENTIALS";
  verified: boolean;
  createdAt: string; // déjà formaté côté serveur
  isSelf: boolean;
  isAdmin: boolean;
};

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export default function AccountsTable({ accounts }: { accounts: AccountRow[] }) {
  const [query, setQuery] = useState("");
  // Mot de passe temporaire généré, affiché une seule fois par ligne.
  const [tempPwd, setTempPwd] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return accounts;
    return accounts.filter((a) => normalize(`${a.name} ${a.email}`).includes(q));
  }, [accounts, query]);

  function reset(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await resetPasswordForUser(id);
      if (res.ok) setTempPwd((m) => ({ ...m, [id]: res.password }));
      else setError(res.error);
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteUserAccount(id);
      if (!res.ok) setError(res.error);
      setConfirmDelete(null);
    });
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un nom ou un e-mail…"
          className="w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <span className="text-sm text-zinc-400">
          {filtered.length} sur {accounts.length}
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Créé le</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-zinc-100 last:border-0 align-top">
                <td className="px-4 py-3 text-zinc-800">
                  {a.name || "—"}
                  {a.isAdmin && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600">{a.email}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {a.provider === "GOOGLE" ? "Google" : "Interne"}
                </td>
                <td className="px-4 py-3">
                  {a.provider === "GOOGLE" ? (
                    <span className="text-zinc-400">—</span>
                  ) : a.verified ? (
                    <span className="text-emerald-700">Vérifié</span>
                  ) : (
                    <span className="text-amber-700">En attente</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">{a.createdAt}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {a.provider === "CREDENTIALS" &&
                      (tempPwd[a.id] ? (
                        <TempPasswordBox password={tempPwd[a.id]} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => reset(a.id)}
                          disabled={pending}
                          className="w-fit rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                        >
                          Réinitialiser le mot de passe
                        </button>
                      ))}

                    {a.isSelf ? (
                      <span className="text-xs text-zinc-400">(votre compte)</span>
                    ) : confirmDelete === a.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => remove(a.id)}
                          disabled={pending}
                          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(a.id)}
                        className="w-fit rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Aucun compte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Affiche le mot de passe temporaire généré avec un bouton « Copier ».
function TempPasswordBox({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1">
      <code className="text-xs font-semibold text-emerald-800">{password}</code>
      <button
        type="button"
        onClick={copy}
        className="rounded border border-emerald-300 px-1.5 py-0.5 text-xs text-emerald-700 hover:bg-emerald-100"
      >
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}
