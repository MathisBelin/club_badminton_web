"use client";

import { useState, useTransition } from "react";
import { saveForm, type SaveFormInput } from "@/app/actions/forms";
import {
  CONTACT_FIELDS,
  OPTION_ACTIONS,
  QUESTION_TYPES,
  TEXT_BLOCK,
  TYPES_WITH_OPTIONS,
  isQuestion,
  type ContactField,
  type ItemType,
  type OptionAction,
} from "@/lib/questions";
import { QUESTION_FORMATS, TYPES_WITH_FORMAT, type QuestionFormat } from "@/lib/formats";
import HeaderImagePicker from "@/components/HeaderImagePicker";
import Select from "@/components/Select";
import { useDragAutoScroll } from "@/lib/useDragAutoScroll";
import { CloseIcon, GripIcon, TextIcon, TrashIcon } from "@/components/icons";

// Un élément du formulaire : une question, ou un bloc de texte informatif
// (type TEXT_BLOCK — le texte affiché est porté par `title`).
type BuilderItem = {
  key: string; // clé React stable (id db ou temporaire)
  id?: string; // id db si l'élément existe déjà
  title: string;
  type: ItemType;
  required: boolean;
  options: string[];
  optionActions: OptionAction[]; // effet de chaque option (aligné sur `options`)
  format: QuestionFormat | null; // contrôle de saisie (TEXT / TEXT_LIST)
  contactField: ContactField | null; // champ de fiche contact correspondant
  verifyEmail: boolean; // format EMAIL : confirmation de l'adresse par e-mail
};

type Props = {
  initial: {
    formId: string;
    title: string;
    description: string;
    headerImageUrl: string | null;
    termsEnabled: boolean;
    termsText: string;
    allowEditResponse: boolean;
    singleResponse: boolean;
    questions: Array<{
      id: string;
      title: string;
      type: ItemType;
      required: boolean;
      options: string[];
      optionActions: OptionAction[];
      format: QuestionFormat | null;
      contactField: ContactField | null;
      verifyEmail: boolean;
    }>;
  };
};

function newKey() {
  return `new-${Math.random().toString(36).slice(2)}`;
}

export default function FormBuilder({ initial }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(initial.headerImageUrl);
  const [termsEnabled, setTermsEnabled] = useState(initial.termsEnabled);
  const [termsText, setTermsText] = useState(initial.termsText);
  const [allowEditResponse, setAllowEditResponse] = useState(initial.allowEditResponse);
  const [singleResponse, setSingleResponse] = useState(initial.singleResponse);
  const [items, setItems] = useState<BuilderItem[]>(
    initial.questions.map((q) => ({ ...q, key: q.id })),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Glisser-déposer : `dragKey` = élément en cours de déplacement (la liste est
  // réordonnée en direct au survol, ce qui donne l'aperçu avant de lâcher) ;
  // `grabbedKey` = carte rendue déplaçable, uniquement quand on presse sa poignée.
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [grabbedKey, setGrabbedKey] = useState<string | null>(null);

  // Défilement automatique quand on glisse une carte près du haut/bas de l'écran.
  useDragAutoScroll(dragKey !== null);

  function update(key: string, patch: Partial<BuilderItem>) {
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function addQuestion() {
    setItems((list) => [
      ...list,
      {
        key: newKey(),
        title: "",
        type: "TEXT",
        required: false,
        options: [],
        optionActions: [],
        format: null,
        contactField: null,
        verifyEmail: false,
      },
    ]);
  }

  function addTextBlock() {
    setItems((list) => [
      ...list,
      {
        key: newKey(),
        title: "",
        type: TEXT_BLOCK,
        required: false,
        options: [],
        optionActions: [],
        format: null,
        contactField: null,
        verifyEmail: false,
      },
    ]);
  }

  function removeItem(key: string) {
    setItems((list) => list.filter((it) => it.key !== key));
  }

  function move(key: string, dir: -1 | 1) {
    setItems((list) => {
      const i = list.findIndex((it) => it.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  /// Déplace l'élément en cours de glissement à la position de `targetKey` (aperçu en direct).
  function moveTo(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    setItems((list) => {
      const from = list.findIndex((it) => it.key === dragKey);
      const to = list.findIndex((it) => it.key === targetKey);
      if (from < 0 || to < 0) return list;
      const copy = [...list];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  function dragProps(key: string) {
    return {
      draggable: grabbedKey === key,
      onDragStart: (e: React.DragEvent) => {
        setDragKey(key);
        e.dataTransfer.effectAllowed = "move";
        // Certains navigateurs annulent le glissement sans données associées.
        e.dataTransfer.setData("text/plain", key);
      },
      onDragEnd: () => {
        setDragKey(null);
        setGrabbedKey(null);
      },
      onDragOver: (e: React.DragEvent) => {
        if (!dragKey) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      },
      onDragEnter: () => moveTo(key),
      onDrop: (e: React.DragEvent) => e.preventDefault(),
    };
  }

  const grabProps = (key: string) => ({
    onMouseDown: () => setGrabbedKey(key),
    onMouseUp: () => setGrabbedKey(null),
  });

  function save() {
    setMessage(null);
    // Validation légère côté client.
    if (!title.trim()) {
      setMessage({ type: "error", text: "Le titre est requis." });
      return;
    }
    for (const it of items) {
      if (!it.title.trim()) {
        setMessage({
          type: "error",
          text: isQuestion(it.type)
            ? "Chaque question doit avoir un intitulé."
            : "Chaque bloc de texte doit contenir du texte.",
        });
        return;
      }
      if (TYPES_WITH_OPTIONS.includes(it.type) && it.options.filter((o) => o.trim()).length === 0) {
        setMessage({ type: "error", text: `La question « ${it.title} » doit avoir au moins une option.` });
        return;
      }
    }

    if (termsEnabled && !termsText.trim()) {
      setMessage({ type: "error", text: "Renseignez le texte des conditions d'inscription." });
      return;
    }

    const input: SaveFormInput = {
      formId: initial.formId,
      title: title.trim(),
      description: description.trim(),
      headerImageUrl,
      termsEnabled,
      termsText: termsText.trim(),
      allowEditResponse,
      singleResponse,
      questions: items.map((it) => ({
        id: it.id,
        title: it.title.trim(),
        type: it.type,
        required: it.required,
        options: TYPES_WITH_OPTIONS.includes(it.type)
          ? it.options.map((o) => o.trim()).filter(Boolean)
          : [],
        optionActions: TYPES_WITH_OPTIONS.includes(it.type)
          ? it.options
              .map((o, i) => ({ o: o.trim(), a: it.optionActions[i] ?? "NONE" }))
              .filter((x) => x.o)
              .map((x) => x.a)
          : [],
        format: TYPES_WITH_FORMAT.includes(it.type) ? it.format : null,
        contactField: TYPES_WITH_FORMAT.includes(it.type) ? it.contactField : null,
        verifyEmail: it.format === "EMAIL" ? it.verifyEmail : false,
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
        <HeaderImagePicker value={headerImageUrl} onChange={setHeaderImageUrl} />
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

      {/* Questions et blocs de texte */}
      <div className="space-y-4">
        {items.map((it, index) => {
          // Numérotation continue des seules questions (les blocs de texte n'en ont pas).
          const questionNumber = items.slice(0, index + 1).filter((x) => isQuestion(x.type)).length;
          const common = {
            index,
            total: items.length,
            dragging: dragKey === it.key,
            dragProps: dragProps(it.key),
            grabProps: grabProps(it.key),
            onRemove: () => removeItem(it.key),
            onMove: (dir: -1 | 1) => move(it.key, dir),
          };
          return isQuestion(it.type) ? (
            <QuestionEditor
              key={it.key}
              item={it}
              number={questionNumber}
              onChange={(patch) => update(it.key, patch)}
              {...common}
            />
          ) : (
            <TextBlockEditor
              key={it.key}
              item={it}
              onChange={(patch) => update(it.key, patch)}
              {...common}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={addQuestion}
          className="flex-1 rounded-xl border border-dashed border-zinc-300 bg-white py-3 text-sm font-medium text-zinc-600 hover:border-emerald-400 hover:text-emerald-700"
        >
          + Ajouter une question
        </button>
        <button
          onClick={addTextBlock}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white py-3 text-sm font-medium text-zinc-600 hover:border-emerald-400 hover:text-emerald-700"
        >
          <TextIcon />
          Ajouter du texte
        </button>
      </div>

      {/* Conditions d'inscription : affichées en fin de formulaire, acceptation obligatoire. */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <input
            type="checkbox"
            checked={termsEnabled}
            onChange={(e) => setTermsEnabled(e.target.checked)}
          />
          Afficher des conditions d&apos;inscription
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          {"Si l'option est activée, le texte ci-dessous s'affiche en fin de formulaire et le " +
            "répondant doit cocher « J'accepte » pour pouvoir envoyer sa réponse."}
        </p>
        {termsEnabled && (
          <textarea
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
            placeholder="Texte des conditions d'inscription (règlement, assurance, droit à l'image…)"
            rows={6}
            className="mt-3 w-full resize-y rounded-md border border-zinc-200 p-2 text-sm text-zinc-700 outline-none focus:border-emerald-400"
          />
        )}
      </section>


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

// Propriétés communes aux deux types de cartes (déplacement, suppression).
type CardProps = {
  index: number;
  total: number;
  dragging: boolean;
  dragProps: Record<string, unknown>;
  grabProps: Record<string, unknown>;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
};

/// Poignée + flèches + suppression, partagées par les deux éditeurs.
function CardTools({
  index,
  total,
  grabProps,
  onRemove,
  onMove,
}: Pick<CardProps, "index" | "total" | "grabProps" | "onRemove" | "onMove">) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        {...grabProps}
        title="Déplacer (maintenir et glisser)"
        aria-label="Déplacer"
        className="cursor-grab rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
      >
        <GripIcon />
      </span>
      <button
        onClick={() => onMove(-1)}
        disabled={index === 0}
        title="Monter"
        aria-label="Monter"
        className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
      >
        ↑
      </button>
      <button
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        title="Descendre"
        aria-label="Descendre"
        className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
      >
        ↓
      </button>
      <button
        onClick={onRemove}
        title="Supprimer"
        aria-label="Supprimer"
        className="inline-flex items-center justify-center rounded border border-red-200 p-1 text-red-500 hover:bg-red-50"
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/// Classe de la carte, avec l'état visuel pendant le glissement.
function cardClass(dragging: boolean) {
  return `rounded-xl border bg-white p-5 ${
    dragging ? "border-emerald-400 opacity-60 ring-2 ring-emerald-200" : "border-zinc-200"
  }`;
}

function QuestionEditor({
  item,
  number,
  onChange,
  index,
  total,
  dragging,
  dragProps,
  grabProps,
  onRemove,
  onMove,
}: CardProps & {
  item: BuilderItem;
  number: number;
  onChange: (patch: Partial<BuilderItem>) => void;
}) {
  const hasOptions = TYPES_WITH_OPTIONS.includes(item.type);
  const hasFormat = TYPES_WITH_FORMAT.includes(item.type);

  return (
    <section {...dragProps} className={cardClass(dragging)}>
      <div className="flex items-start gap-3">
        <span className="mt-2 text-sm text-zinc-400">{number}.</span>
        <div className="flex-1 space-y-3">
          <input
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Intitulé de la question"
            className="w-full rounded-md border border-zinc-200 p-2 text-sm font-medium text-zinc-900 outline-none focus:border-emerald-400"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="w-56"
              value={item.type}
              onChange={(v) => onChange({ type: v as ItemType })}
              ariaLabel="Type de question"
              options={QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={item.required}
                onChange={(e) => onChange({ required: e.target.checked })}
              />
              Obligatoire
            </label>
          </div>

          {hasFormat && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={item.format !== null}
                  onChange={(e) =>
                    onChange({ format: e.target.checked ? "EMAIL" : null, verifyEmail: false })
                  }
                />
                Format imposé
              </label>
              {item.format !== null && (
                <Select
                  className="w-44"
                  value={item.format}
                  onChange={(v) =>
                    onChange({
                      format: v as QuestionFormat,
                      verifyEmail: v === "EMAIL" ? item.verifyEmail : false,
                    })
                  }
                  ariaLabel="Format imposé"
                  options={QUESTION_FORMATS.map((f) => ({ value: f.value, label: f.label }))}
                />
              )}
              {item.format === "EMAIL" && (
                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={item.verifyEmail}
                    onChange={(e) => onChange({ verifyEmail: e.target.checked })}
                  />
                  Faire vérifier l&apos;adresse par e-mail
                </label>
              )}
            </div>
          )}

          {hasFormat && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
              Champ de contact associé
              <Select
                className="w-48"
                value={item.contactField ?? ""}
                onChange={(v) => onChange({ contactField: (v || null) as ContactField | null })}
                ariaLabel="Champ de contact associé"
                title="Permet de rapprocher la réponse d'une fiche contact du club"
                isSearchable={false}
                options={[
                  { value: "", label: "Aucun" },
                  ...CONTACT_FIELDS.map((f) => ({ value: f.value, label: f.label })),
                ]}
              />
            </div>
          )}

          {hasOptions && (
            <OptionsEditor
              options={item.options}
              actions={item.optionActions}
              onChange={(options, optionActions) => onChange({ options, optionActions })}
            />
          )}
        </div>

        <CardTools index={index} total={total} grabProps={grabProps} onRemove={onRemove} onMove={onMove} />
      </div>
    </section>
  );
}

function TextBlockEditor({
  item,
  onChange,
  index,
  total,
  dragging,
  dragProps,
  grabProps,
  onRemove,
  onMove,
}: CardProps & {
  item: BuilderItem;
  onChange: (patch: Partial<BuilderItem>) => void;
}) {
  return (
    <section {...dragProps} className={cardClass(dragging)}>
      <div className="flex items-start gap-3">
        <TextIcon className="mt-2 h-4 w-4 text-zinc-400" />
        <div className="flex-1">
          <textarea
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Texte affiché dans le formulaire (consigne, information…)"
            rows={3}
            className="w-full resize-y rounded-md border border-zinc-200 p-2 text-sm text-zinc-700 outline-none focus:border-emerald-400"
          />
          <p className="mt-1 text-xs text-zinc-400">
            {"Bloc d'information : aucune réponse n'est demandée."}
          </p>
        </div>

        <CardTools index={index} total={total} grabProps={grabProps} onRemove={onRemove} onMove={onMove} />
      </div>
    </section>
  );
}

function OptionsEditor({
  options,
  actions,
  onChange,
}: {
  options: string[];
  actions: OptionAction[];
  onChange: (options: string[], actions: OptionAction[]) => void;
}) {
  const list = options.length ? options : [""];
  // Effets alignés sur les options (« aucun » par défaut).
  const acts: OptionAction[] = list.map((_, i) => actions[i] ?? "NONE");

  function set(i: number, value: string) {
    const next = [...list];
    next[i] = value;
    onChange(next, acts);
  }
  function setAction(i: number, value: OptionAction) {
    const next = [...acts];
    next[i] = value;
    onChange(list, next);
  }
  function add() {
    onChange([...list, ""], [...acts, "NONE"]);
  }
  function remove(i: number) {
    onChange(
      list.filter((_, idx) => idx !== i),
      acts.filter((_, idx) => idx !== i),
    );
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
          <Select
            className="w-44"
            value={acts[i]}
            onChange={(v) => setAction(i, v as OptionAction)}
            ariaLabel="Effet du choix de cette option"
            title="Effet du choix de cette option"
            isSearchable={false}
            options={OPTION_ACTIONS.map((a) => ({ value: a.value, label: a.label }))}
          />
          <button
            onClick={() => remove(i)}
            className="inline-flex items-center justify-center rounded p-1 text-zinc-400 hover:text-red-500"
            title="Retirer l'option"
            aria-label="Retirer l'option"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button onClick={add} className="text-sm text-emerald-700 hover:underline">
        + Ajouter une option
      </button>
    </div>
  );
}
