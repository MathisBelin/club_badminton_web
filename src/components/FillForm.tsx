"use client";

import { useState, useTransition } from "react";
import { submitResponse } from "@/app/actions/responses";
import type { QuestionType } from "@/lib/questions";

type Question = {
  id: string;
  title: string;
  description: string;
  type: QuestionType;
  required: boolean;
  options: string[];
};

const CHECKBOX_SEP = ", ";

export default function FillForm({
  formId,
  title,
  description,
  respondentEmail,
  locked,
  questions,
  previousAnswers,
}: {
  formId: string;
  title: string;
  description: string;
  respondentEmail: string;
  locked: boolean;
  questions: Question[];
  previousAnswers: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...previousAnswers }));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setValue(qid: string, value: string) {
    setValues((v) => ({ ...v, [qid]: value }));
  }

  function toggleCheckbox(qid: string, option: string, checked: boolean) {
    setValues((v) => {
      const current = v[qid] ? v[qid].split(CHECKBOX_SEP).filter(Boolean) : [];
      const next = checked ? [...current, option] : current.filter((o) => o !== option);
      return { ...v, [qid]: next.join(CHECKBOX_SEP) };
    });
  }

  function submit() {
    setError(null);
    for (const q of questions) {
      if (q.required && !values[q.id]?.trim()) {
        setError(`La question « ${q.title} » est obligatoire.`);
        return;
      }
    }
    startTransition(async () => {
      const result = await submitResponse({
        formId,
        answers: questions.map((q) => ({ questionId: q.id, value: values[q.id] ?? "" })),
      });
      // En cas de succès, l'action redirige. Ici on ne reçoit que les erreurs.
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-t-4 border-emerald-600 border-x border-b border-zinc-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        {description && <p className="mt-2 whitespace-pre-line text-sm text-zinc-600">{description}</p>}
        <p className="mt-3 text-xs text-zinc-400">Connecté en tant que {respondentEmail}</p>
      </div>

      {questions.map((q) => (
        <fieldset key={q.id} className="rounded-xl border border-zinc-200 bg-white p-5" disabled={locked}>
          <legend className="sr-only">{q.title}</legend>
          <div className="font-medium text-zinc-900">
            {q.title}
            {q.required && <span className="ml-1 text-red-500">*</span>}
          </div>
          {q.description && <p className="mt-1 text-sm text-zinc-500">{q.description}</p>}
          <div className="mt-3">{renderInput(q, values[q.id] ?? "", setValue, toggleCheckbox)}</div>
        </fieldset>
      ))}

      {questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">
          Ce formulaire ne contient aucune question.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {!locked && questions.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      )}
    </div>
  );
}

function renderInput(
  q: Question,
  value: string,
  setValue: (qid: string, value: string) => void,
  toggleCheckbox: (qid: string, option: string, checked: boolean) => void,
) {
  switch (q.type) {
    case "PARAGRAPH":
      return (
        <textarea
          value={value}
          onChange={(e) => setValue(q.id, e.target.value)}
          rows={4}
          className="w-full rounded-md border border-zinc-300 p-2 text-sm outline-none focus:border-emerald-400"
        />
      );
    case "DATE":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(q.id, e.target.value)}
          className="rounded-md border border-zinc-300 p-2 text-sm outline-none focus:border-emerald-400"
        />
      );
    case "RADIO":
      return (
        <div className="space-y-2">
          {q.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name={q.id}
                checked={value === opt}
                onChange={() => setValue(q.id, opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    case "CHECKBOX": {
      const selected = value ? value.split(", ").filter(Boolean) : [];
      return (
        <div className="space-y-2">
          {q.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => toggleCheckbox(q.id, opt, e.target.checked)}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    case "DROP_DOWN":
      return (
        <select
          value={value}
          onChange={(e) => setValue(q.id, e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white p-2 text-sm outline-none focus:border-emerald-400"
        >
          <option value="">— Sélectionner —</option>
          {q.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    default: // TEXT
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(q.id, e.target.value)}
          className="w-full rounded-md border border-zinc-300 p-2 text-sm outline-none focus:border-emerald-400"
        />
      );
  }
}
