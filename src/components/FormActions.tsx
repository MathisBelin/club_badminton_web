"use client";

import { useState, useTransition } from "react";
import { duplicateForm, saveAsTemplate, togglePublish } from "@/app/actions/forms";
import { CopyIcon, Spinner, TemplateIcon } from "@/components/icons";
import { NAV_START } from "@/components/NavigationProgress";

// Duplication d'un formulaire (paramètres + questions, sans les réponses).
export function DuplicateFormButton({ formId, className }: { formId: string; className?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Dupliquer"
      aria-label="Dupliquer"
      disabled={pending}
      onClick={() => {
        // La duplication redirige vers le constructeur : barre de progression immédiate.
        window.dispatchEvent(new Event(NAV_START));
        startTransition(() => duplicateForm(formId));
      }}
      className={className}
    >
      {pending ? <Spinner /> : <CopyIcon />}
    </button>
  );
}

// Bascule « Rendre accessible » / « Clôturer » avec indicateur de chargement.
// La mise en ligne est refusée sans libellé Contacts : le message est affiché à côté.
export function PublishToggleButton({
  formId,
  isPublished,
  className,
}: {
  formId: string;
  isPublished: boolean;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await togglePublish(formId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Action impossible.");
            }
          });
        }}
        className={`inline-flex items-center gap-2 ${className ?? ""}`}
      >
        {pending && <Spinner className="h-3.5 w-3.5" />}
        {isPublished ? "Clôturer" : "Rendre accessible"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </>
  );
}

// Enregistrement de la configuration courante comme modèle réutilisable.
export function SaveTemplateButton({ formId, defaultName }: { formId: string; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        await saveAsTemplate(formId, name);
        setMessage({ type: "ok", text: "Modèle enregistré." });
        setOpen(false);
      } catch (e) {
        setMessage({ type: "error", text: e instanceof Error ? e.message : "Échec de l'enregistrement." });
      }
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
      >
        <TemplateIcon />
        Enregistrer comme modèle
      </button>
      {message && (
        <span className={`text-sm ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </span>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-zinc-900">Enregistrer comme modèle</h2>
            <p className="mt-2 text-sm text-zinc-600">
              La configuration actuelle (paramètres, questions, image) sera réutilisable à la création
              d&apos;un nouveau formulaire.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du modèle"
              className="mt-4 w-full rounded-md border border-zinc-300 p-2 text-sm outline-none focus:border-emerald-400"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={pending || !name.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {pending && <Spinner />}
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
