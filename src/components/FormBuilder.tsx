"use client";

import { useState, useTransition } from "react";
import { saveForm, type SaveFormInput } from "@/app/actions/forms";
import { QUESTION_TYPES, TYPES_WITH_OPTIONS, type QuestionType } from "@/lib/questions";

type BuilderQuestion = {
  key: string; // clé React stable (id db ou temporaire)
  id?: string; // id db si la question existe déjà
  title: string;
  description: string;
  type: QuestionType;
  required: boolean;
  options: string[];
};

type Props = {
  initial: {
    formId: string;
    title: string;
    description: string;
    allowEditResponse: boolean;
    singleResponse: boolean;
    questions: Array<{
      id: string;
      title: string;
      description: string;
      type: QuestionType;
      required: boolean;
      options: string[];
    }>;
  };
};

function newKey() {
  return `new-${Math.random().toString(36).slice(2)}`;
}

export default function FormBuilder({ initial }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [allowEditResponse, setAllowEditResponse] = useState(initial.allowEditResponse);
  const [singleResponse, setSingleResponse] = useState(initial.singleResponse);
  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    initial.questions.map((q) => ({ ...q, key: q.id })),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function update(key: string, patch: Partial<BuilderQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      { key: newKey(), title: "", description: "", type: "TEXT", required: false, options: [] },
    ]);
  }

  function removeQuestion(key: string) {
    setQuestions((qs) => qs.filter((q) => q.key !== key));
  }

  function move(key: string, dir: -1 | 1) {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function save() {
    setMessage(null);
    // Validation légère côté client.
    if (!title.trim()) {
      setMessage({ type: "error", text: "Le titre est requis." });
      return;
    }
    for (const q of questions) {
      if (!q.title.trim()) {
        setMessage({ type: "error", text: "Chaque question doit avoir un intitulé." });
        return;
      }
      if (TYPES_WITH_OPTIONS.includes(q.type) && q.options.filter((o) => o.trim()).length === 0) {
        setMessage({ type: "error", text: `La question « ${q.title} » doit avoir au moins une option.` });
        return;
      }
    }

    const input: SaveFormInput = {
      formId: initial.formId,
      title: title.trim(),
      description: description.trim(),
      allowEditResponse,
      singleResponse,
      questions: questions.map((q) => ({
        id: q.id,
        title: q.title.trim(),
        description: q.description.trim(),
        type: q.type,
        required: q.required,
        options: TYPES_WITH_OPTIONS.includes(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : [],
      })),
    };

    startTransition(async () => {
      try {
        await saveForm(input);
        setMessage({ type: "ok", text: "Formulaire enregistré." });
      } catch (e) {
        setMessage({ type: "error", text: e instanceof Error ? e.message : "Erreur d'enregistrement." });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Paramètres du formulaire */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du formulaire"
          className="w-full border-none text-xl font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (facultative)"
          rows={2}
          className="mt-2 w-full resize-none rounded-md border border-zinc-200 p-2 text-sm text-zinc-700 outline-none focus:border-emerald-400"
        />
        <div className="mt-3 flex flex-wrap gap-5 text-sm text-zinc-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowEditResponse}
              onChange={(e) => setAllowEditResponse(e.target.checked)}
            />
            Autoriser la modification de la réponse
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={singleResponse}
              onChange={(e) => setSingleResponse(e.target.checked)}
            />
            Une seule réponse par personne
          </label>
        </div>
      </section>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, index) => (
          <QuestionEditor
            key={q.key}
            q={q}
            index={index}
            total={questions.length}
            onChange={(patch) => update(q.key, patch)}
            onRemove={() => removeQuestion(q.key)}
            onMove={(dir) => move(q.key, dir)}
          />
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="w-full rounded-xl border border-dashed border-zinc-300 bg-white py-3 text-sm font-medium text-zinc-600 hover:border-emerald-400 hover:text-emerald-700"
      >
        + Ajouter une question
      </button>

      {/* Barre d'enregistrement */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="text-sm">
          {message && (
            <span className={message.type === "ok" ? "text-emerald-600" : "text-red-600"}>
              {message.text}
            </span>
          )}
        </div>
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function QuestionEditor({
  q,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  q: BuilderQuestion;
  index: number;
  total: number;
  onChange: (patch: Partial<BuilderQuestion>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const hasOptions = TYPES_WITH_OPTIONS.includes(q.type);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="mt-2 text-sm text-zinc-400">{index + 1}.</span>
        <div className="flex-1 space-y-3">
          <input
            value={q.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Intitulé de la question"
            className="w-full rounded-md border border-zinc-200 p-2 text-sm font-medium text-zinc-900 outline-none focus:border-emerald-400"
          />
          <input
            value={q.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Aide / précision (facultatif)"
            className="w-full rounded-md border border-zinc-200 p-2 text-sm text-zinc-600 outline-none focus:border-emerald-400"
          />

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={q.type}
              onChange={(e) => onChange({ type: e.target.value as QuestionType })}
              className="rounded-md border border-zinc-300 bg-white p-2 text-sm text-zinc-700 outline-none"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => onChange({ required: e.target.checked })}
              />
              Obligatoire
            </label>
          </div>

          {hasOptions && <OptionsEditor options={q.options} onChange={(options) => onChange({ options })} />}
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="Monter"
            className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="Descendre"
            className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            title="Supprimer"
            className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-500 hover:bg-red-50"
          >
            ✕
          </button>
        </div>
      </div>
    </section>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const list = options.length ? options : [""];

  function set(i: number, value: string) {
    const next = [...list];
    next[i] = value;
    onChange(next);
  }
  function add() {
    onChange([...list, ""]);
  }
  function remove(i: number) {
    onChange(list.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {list.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-zinc-400">•</span>
          <input
            value={opt}
            onChange={(e) => set(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="flex-1 rounded-md border border-zinc-200 p-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <button
            onClick={() => remove(i)}
            className="rounded px-2 text-zinc-400 hover:text-red-500"
            title="Retirer l'option"
          >
            ✕
          </button>
        </div>
      ))}
      <button onClick={add} className="text-sm text-emerald-700 hover:underline">
        + Ajouter une option
      </button>
    </div>
  );
}
