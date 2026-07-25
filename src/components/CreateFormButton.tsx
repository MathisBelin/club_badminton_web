"use client";

import { useState, useTransition } from "react";
import { createForm } from "@/app/actions/forms";
import { syncLabelsFromGoogle, type ClubLabelOption } from "@/app/actions/labels";
import { Spinner } from "@/components/icons";
import { NAV_START } from "@/components/NavigationProgress";
import Select from "@/components/Select";

type Template = { id: string; name: string; questionCount: number };

// « + Créer un formulaire » : ouvre une fenêtre proposant un formulaire vierge
// ou la copie d'un modèle enregistré. Le libellé Contacts est OBLIGATOIRE : c'est lui
// qui dit qui est déjà inscrit (et donc qui ne peut plus modifier sa réponse).
// Les libellés sont relus dans Google Contacts À CHAQUE ouverture de la fenêtre.
export default function CreateFormButton({
  templates,
  labels: initialLabels,
}: {
  templates: Template[];
  labels: ClubLabelOption[];
}) {
  const [open, setOpen] = useState(false);
  const [fromTemplate, setFromTemplate] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [labels, setLabels] = useState(initialLabels);
  const [labelResource, setLabelResource] = useState(initialLabels[0]?.resourceName ?? "");
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Ouverture : on repart de la liste connue puis on la rafraîchit chez Google.
  async function openDialog() {
    setOpen(true);
    setError(null);
    setLabelsError(null);
    setLabelsLoading(true);
    const result = await syncLabelsFromGoogle();
    if (result.ok) {
      setLabels(result.labels);
      // Garde la sélection courante si le libellé existe toujours.
      setLabelResource((current) =>
        result.labels.some((l) => l.resourceName === current)
          ? current
          : (result.labels[0]?.resourceName ?? ""),
      );
    } else {
      setLabelsError(result.error);
    }
    setLabelsLoading(false);
  }

  function create() {
    setError(null);
    window.dispatchEvent(new Event(NAV_START));
    startTransition(async () => {
      try {
        // L'action redirige vers le constructeur en cas de succès.
        await createForm(fromTemplate ? templateId : undefined, labelResource);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de la création.");
      }
    });
  }

  return (
    <>
      <button
        onClick={openDialog}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        + Créer un formulaire
      </button>

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
            <h2 className="text-lg font-semibold text-zinc-900">Nouveau formulaire</h2>

            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="source"
                  className="mt-1"
                  checked={!fromTemplate}
                  onChange={() => setFromTemplate(false)}
                />
                <span>
                  <span className="font-medium">Formulaire vierge</span>
                  <span className="block text-xs text-zinc-500">Repartir de zéro.</span>
                </span>
              </label>

              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="source"
                  className="mt-1"
                  checked={fromTemplate}
                  disabled={templates.length === 0}
                  onChange={() => setFromTemplate(true)}
                />
                <span>
                  <span className="font-medium">À partir d&apos;un modèle</span>
                  <span className="block text-xs text-zinc-500">
                    {templates.length === 0
                      ? "Aucun modèle enregistré pour l'instant."
                      : "Reprend les questions et les paramètres du modèle."}
                  </span>
                </span>
              </label>

              {fromTemplate && templates.length > 0 && (
                <Select
                  className="w-full"
                  value={templateId}
                  onChange={setTemplateId}
                  ariaLabel="Modèle"
                  options={templates.map((t) => ({
                    value: t.id,
                    label: `${t.name} (${t.questionCount} question${t.questionCount > 1 ? "s" : ""})`,
                  }))}
                />
              )}
              <div className="border-t border-zinc-200 pt-3">
                <label className="block font-medium text-zinc-900" htmlFor="label-select">
                  Libellé Contacts
                </label>
                <p className="mb-2 text-xs text-zinc-500">
                  Un formulaire inscrit vers un seul libellé. Ses membres sont considérés comme déjà
                  inscrits et ne peuvent plus modifier leur réponse.
                </p>
                {labelsLoading ? (
                  <p className="flex items-center gap-2 px-1 py-2 text-xs text-zinc-500">
                    <Spinner />
                    Lecture des libellés Google Contacts…
                  </p>
                ) : labelsError ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {labelsError}
                  </p>
                ) : labels.length === 0 ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Aucun libellé dans vos contacts Google.
                  </p>
                ) : (
                  <Select
                    id="label-select"
                    className="w-full"
                    value={labelResource}
                    onChange={setLabelResource}
                    ariaLabel="Libellé Contacts"
                    options={labels.map((l) => ({ value: l.resourceName, label: l.name }))}
                  />
                )}
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={create}
                disabled={pending || labelsLoading || !labelResource || (fromTemplate && !templateId)}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {pending && <Spinner />}
                {pending ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
