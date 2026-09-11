"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  resetPasswordForUser,
  deleteUserAccount,
  verifyAccountManually,
} from "@/app/actions/adminAccounts";

export type AccountRow = {
  id: string;
  email: string;
  name: string;
  provider: "GOOGLE" | "CREDENTIALS";
  verified: boolean;
  createdAt: string; // déjà formaté côté serveur
  createdAtMs: number; // pour le filtre par date
  isSelf: boolean;
  isAdmin: boolean;
};

const PAGE_SIZE = 20;

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export default function AccountsTable({ accounts }: { accounts: AccountRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "verified" | "pending">("all");
  const [type, setType] = useState<"all" | "GOOGLE" | "CREDENTIALS">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dupOnly, setDupOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Mot de passe temporaire généré, affiché une seule fois par ligne.
  const [tempPwd, setTempPwd] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Noms apparaissant plusieurs fois (sur l'ensemble des comptes) → doublons potentiels.
  const dupNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of accounts) {
      const n = normalize(a.name.trim());
      if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, c]) => c > 1).map(([n]) => n));
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    let list = accounts.filter((a) => {
      if (q && !normalize(`${a.name} ${a.email}`).includes(q)) return false;
      if (type !== "all" && a.provider !== type) return false;
      if (status === "verified" && !(a.provider === "CREDENTIALS" && a.verified)) return false;
      if (status === "pending" && !(a.provider === "CREDENTIALS" && !a.verified)) return false;
      if (fromMs != null && a.createdAtMs < fromMs) return false;
      if (toMs != null && a.createdAtMs > toMs) return false;
      if (dupOnly && !dupNames.has(normalize(a.name.trim()))) return false;
      return true;
    });
    // En mode doublons, on regroupe par nom pour voir les identiques côte à côte.
    if (dupOnly) {
      list = [...list].sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
    }
    return list;
  }, [accounts, query, type, status, dateFrom, dateTo, dupOnly, dupNames]);

  // Tout changement de filtre ramène à la première page.
  useEffect(() => {
    setPage(1);
  }, [query, type, status, dateFrom, dateTo, dupOnly]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  function reset(id: string) {
    setError(null);
    setConfirmReset(null);
    startTransition(async () => {
      const res = await resetPasswordForUser(id);
      if (res.ok) setTempPwd((m) => ({ ...m, [id]: res.password }));
      else setError(res.error);
    });
  }

  function validate(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await verifyAccountManually(id);
      if (!res.ok) setError(res.error);
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

  const selectClass =
    "rounded-lg border border-zinc-300 px-2.5 py-2 text-sm text-zinc-700 outline-none focus:border-emerald-500";

  return (
    <div className="mt-6">
      {/* Filtres */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un nom ou un e-mail…"
          className="w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={selectClass}>
          <option value="all">Tout statut</option>
          <option value="verified">Vérifié</option>
          <option value="pending">En attente</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={selectClass}>
          <option value="all">Tout type</option>
          <option value="CREDENTIALS">Interne</option>
          <option value="GOOGLE">Google</option>
        </select>
        <label className="flex items-center gap-1 text-sm text-zinc-500">
          Du
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={selectClass}
          />
        </label>
        <label className="flex items-center gap-1 text-sm text-zinc-500">
          au
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={selectClass}
          />
        </label>
        <button
          type="button"
          onClick={() => setDupOnly((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm ${
            dupOnly
              ? "border-amber-400 bg-amber-50 text-amber-800"
              : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {dupOnly ? "✓ Doublons (nom identique)" : "Afficher les doublons"}
        </button>
        <span className="ml-auto text-sm text-zinc-400">
          {filtered.length} sur {accounts.length}
        </span>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

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
            {pageRows.map((a) => {
              const isDup = dupNames.has(normalize(a.name.trim()));
              return (
                <tr key={a.id} className="border-b border-zinc-100 last:border-0 align-top">
                  <td className="px-4 py-3 text-zinc-800">
                    {a.name || "—"}
                    {a.isAdmin && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                        admin
                      </span>
                    )}
                    {isDup && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                        doublon
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
                      {/* Valider manuellement un compte interne en attente. */}
                      {a.provider === "CREDENTIALS" && !a.verified && (
                        <button
                          type="button"
                          onClick={() => validate(a.id)}
                          disabled={pending}
                          className="w-fit rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                          title="Marquer l'adresse comme vérifiée : le membre pourra se connecter avec son mot de passe"
                        >
                          Valider le compte
                        </button>
                      )}

                      {a.provider === "CREDENTIALS" &&
                        (tempPwd[a.id] ? (
                          <TempPasswordBox password={tempPwd[a.id]} />
                        ) : confirmReset === a.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Réinitialiser ?</span>
                            <button
                              type="button"
                              onClick={() => reset(a.id)}
                              disabled={pending}
                              className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                            >
                              Confirmer
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmReset(null)}
                              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmReset(a.id)}
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
              );
            })}
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

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-end gap-3 text-sm text-zinc-600">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage <= 1}
            className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-50"
          >
            ← Précédent
          </button>
          <span>
            Page {clampedPage} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={clampedPage >= pageCount}
            className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-50"
          >
            Suivant →
          </button>
        </div>
      )}
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
