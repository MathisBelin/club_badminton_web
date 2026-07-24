"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { submitResponse } from "@/app/actions/responses";
import { MULTI_SEP, isQuestion, type ItemType, type QuestionType } from "@/lib/questions";
import { CloseIcon } from "@/components/icons";
import CancelResponseButton from "@/components/CancelResponseButton";
import { checkAnswer, checkValue, formatLabel, type QuestionFormat } from "@/lib/formats";

type Question = {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  required: boolean;
  options: string[];
  format: QuestionFormat | null;
  verifyEmail: boolean;
};

const CHECKBOX_SEP = MULTI_SEP;

export default function FillForm({
  formId,
  title,
  description,
  headerImageUrl,
  respondentEmail,
  locked,
  alreadyAnswered,
  termsText,
  termsAlreadyAccepted,
  questions,
  previousAnswers,
}: {
  formId: string;
  title: string;
  description: string;
  headerImageUrl: string | null;
  respondentEmail: string;
  alreadyAnswered: boolean;
  locked: boolean;
  termsText: string;
  termsAlreadyAccepted: boolean;
  questions: Question[];
  previousAnswers: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...previousAnswers }));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Champs déjà quittés par l'utilisateur, et tentative d'envoi : conditionnent
  // l'affichage des encadrés rouges (on n'alerte pas pendant la première frappe).
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(termsAlreadyAccepted);

  function setValue(qid: string, value: string) {
    setValues((v) => ({ ...v, [qid]: value }));
  }

  function markTouched(qid: string) {
    setTouched((t) => (t[qid] ? t : { ...t, [qid]: true }));
  }

  /// Message d'erreur d'une question, ou null. `show` indique s'il doit être affiché.
  function questionError(q: Question): string | null {
    if (q.required && !values[q.id]?.trim()) return "Cette question est obligatoire.";
    const formatError = checkAnswer(q, values[q.id] ?? "");
    return formatError ? `Format attendu : ${formatLabel(q.format ?? "").toLowerCase()}.` : null;
  }

  function toggleCheckbox(qid: string, option: string, checked: boolean) {
    setValues((v) => {
      const current = v[qid] ? v[qid].split(CHECKBOX_SEP).filter(Boolean) : [];
      const next = checked ? [...current, option] : current.filter((o) => o !== option);
      return { ...v, [qid]: next.join(CHECKBOX_SEP) };
    });
  }

  // Les blocs de texte sont purement informatifs : ni obligatoires, ni envoyés.
  const answerable = questions.filter((q) => isQuestion(q.type));

  function submit() {
    setError(null);
    setSubmitted(true);
    for (const q of answerable) {
      if (q.required && !values[q.id]?.trim()) {
        setError(`La question « ${q.title} » est obligatoire.`);
        return;
      }
      // Contrôle du format demandé (e-mail, téléphone, entier, décimal).
      const formatError = checkAnswer(q, values[q.id] ?? "");
      if (formatError) {
        setError(formatError);
        return;
      }
    }
    if (termsText && !termsAccepted) {
      setError("Vous devez accepter les conditions d'inscription.");
      return;
    }
    startTransition(async () => {
      const result = await submitResponse({
        formId,
        termsAccepted,
        answers: answerable.map((q) => ({ questionId: q.id, value: values[q.id] ?? "" })),
      });
      // En cas de succès, l'action redirige. Ici on ne reçoit que les erreurs.
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border-t-4 border-emerald-600 border-x border-b border-zinc-200 bg-white">
        {headerImageUrl && (
          <Image
            src={headerImageUrl}
            alt=""
            width={1200}
            height={300}
            className="h-44 w-full bg-zinc-50 object-contain"
            unoptimized
            priority
          />
        )}
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          {description && <p className="mt-2 whitespace-pre-line text-sm text-zinc-600">{description}</p>}
          <p className="mt-3 text-xs text-zinc-400">Connecté en tant que {respondentEmail}</p>
        </div>
      </div>

      {questions.map((q) => {
        const invalid = isQuestion(q.type) ? questionError(q) : null;
        // On n'alerte qu'après la sortie du champ ou une tentative d'envoi.
        const showError = Boolean(invalid) && (submitted || touched[q.id]);

        return isQuestion(q.type) ? (
          <fieldset
            key={q.id}
            className={`rounded-xl border bg-white p-5 ${
              showError ? "border-red-300" : "border-zinc-200"
            }`}
            disabled={locked}
          >
            <legend className="sr-only">{q.title}</legend>
            <div className="font-medium text-zinc-900">
              {q.title}
              {q.required && <span className="ml-1 text-red-500">*</span>}
            </div>
            {q.description && <p className="mt-1 text-sm text-zinc-500">{q.description}</p>}
            {q.format && (
              <p className="mt-1 text-xs text-zinc-400">
                Format attendu : {formatLabel(q.format).toLowerCase()}
                {q.verifyEmail &&
                  " — à confirmer par e-mail, sauf s'il s'agit de votre adresse de connexion"}
              </p>
            )}
            <div className="mt-3">
              {renderInput(
                { ...q, type: q.type as QuestionType },
                values[q.id] ?? "",
                setValue,
                toggleCheckbox,
                showError,
                () => markTouched(q.id),
              )}
            </div>
            {showError && <p className="mt-2 text-xs text-red-600">{invalid}</p>}
          </fieldset>
        ) : (
          // Bloc de texte informatif.
          <div
            key={q.id}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-4 whitespace-pre-line text-sm text-zinc-700"
          >
            {q.title}
          </div>
        );
      })}

      {questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">
          Ce formulaire ne contient aucune question.
        </div>
      )}

      {/* Conditions d'inscription : texte dépliable + acceptation obligatoire. */}
      {termsText && answerable.length > 0 && (
        <fieldset
          className={`rounded-xl border bg-white p-5 ${
            submitted && !termsAccepted ? "border-red-300" : "border-zinc-200"
          }`}
          disabled={locked}
        >
          <legend className="sr-only">Conditions d&apos;inscription</legend>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-emerald-700 hover:underline">
              Lire les conditions d&apos;inscription
            </summary>
            <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-line rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700">
              {termsText}
            </div>
          </details>
          <label className="mt-4 flex items-start gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              {"J'ai lu et j'accepte les conditions d'inscription"}
              <span className="ml-1 text-red-500">*</span>
            </span>
          </label>
          {submitted && !termsAccepted && (
            <p className="mt-2 text-xs text-red-600">
              {"L'acceptation des conditions est obligatoire pour envoyer votre réponse."}
            </p>
          )}
        </fieldset>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {!locked && answerable.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Modification d'une réponse existante : possibilité de se désinscrire. */}
          {alreadyAnswered && <CancelResponseButton formId={formId} />}
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

// Saisie multi-valeurs : un champ vide s'ajoute automatiquement dès que le dernier
// champ contient du texte (ex. adresses e-mail secondaires).
// Les lignes sont gardées en état local pour rester stables pendant la frappe ;
// seules les valeurs non vides sont remontées, jointes par MULTI_SEP.
function TextListInput({
  value,
  onChange,
  format,
  showError,
  onBlurField,
}: {
  value: string;
  onChange: (value: string) => void;
  format: QuestionFormat | null;
  showError: boolean;
  onBlurField: () => void;
}) {
  const [rows, setRows] = useState<string[]>(() => [
    ...(value ? value.split(MULTI_SEP) : []),
    "",
  ]);
  // Lignes déjà quittées : elles peuvent être signalées en rouge individuellement.
  const [touchedRows, setTouchedRows] = useState<Record<number, boolean>>({});

  /// Une ligne est fautive si son contenu ne respecte pas le format demandé.
  function rowInvalid(index: number): boolean {
    if (!format) return false;
    if (!(showError || touchedRows[index])) return false;
    return checkValue(format, rows[index] ?? "") !== null;
  }

  function publish(next: string[]) {
    setRows(next);
    onChange(next.map((r) => r.trim()).filter(Boolean).join(MULTI_SEP));
  }

  function setRow(index: number, text: string) {
    const next = [...rows];
    next[index] = text;
    if (text.trim()) {
      // Nouveau champ dès que le dernier est renseigné.
      if (index === next.length - 1) next.push("");
    } else if (index + 1 < next.length && !next[index + 1].trim()) {
      // Champ vidé et champ suivant vide : inutile d'en garder deux.
      next.splice(index + 1, 1);
    }
    publish(next);
  }

  /// À la perte du focus : un champ vidé disparaît s'il reste du texte en dessous,
  /// sinon on se contente de retirer les espaces superflus.
  function blurRow(index: number) {
    setTouchedRows((t) => ({ ...t, [index]: true }));
    onBlurField();
    const trimmed = rows[index].trim();
    if (!trimmed && rows.slice(index + 1).some((r) => r.trim())) {
      publish(rows.filter((_, i) => i !== index));
      return;
    }
    if (trimmed !== rows[index]) {
      const next = [...rows];
      next[index] = trimmed;
      publish(next);
    }
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index);
    publish(next.length ? next : [""]);
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={row}
            onChange={(e) => setRow(i, e.target.value)}
            onBlur={() => blurRow(i)}
            aria-invalid={rowInvalid(i)}
            className={`w-full rounded-md border p-2 text-sm outline-none ${
              rowInvalid(i)
                ? "border-red-400 bg-red-50 focus:border-red-500"
                : "border-zinc-300 focus:border-emerald-400"
            }`}
          />
          {rows.length > 1 && i < rows.length - 1 && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              title="Retirer cette ligne"
              aria-label="Retirer cette ligne"
              className="inline-flex items-center justify-center rounded p-1 text-zinc-400 hover:text-red-500"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function renderInput(
  q: Question,
  value: string,
  setValue: (qid: string, value: string) => void,
  toggleCheckbox: (qid: string, option: string, checked: boolean) => void,
  showError: boolean,
  onBlurField: () => void,
) {
  // Bordure rouge (et fond légèrement teinté) quand la saisie est refusée.
  const fieldClass = showError
    ? "border-red-400 bg-red-50 focus:border-red-500"
    : "border-zinc-300 focus:border-emerald-400";

  switch (q.type) {
    case "PARAGRAPH":
      return (
        <textarea
          value={value}
          onChange={(e) => setValue(q.id, e.target.value)}
          onBlur={onBlurField}
          rows={4}
          aria-invalid={showError}
          className={`w-full rounded-md border p-2 text-sm outline-none ${fieldClass}`}
        />
      );
    case "TEXT_LIST":
      return (
        <TextListInput
          value={value}
          onChange={(v) => setValue(q.id, v)}
          format={q.format}
          showError={showError}
          onBlurField={onBlurField}
        />
      );
    case "DATE":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(q.id, e.target.value)}
          onBlur={onBlurField}
          aria-invalid={showError}
          className={`rounded-md border p-2 text-sm outline-none ${fieldClass}`}
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
          onBlur={onBlurField}
          aria-invalid={showError}
          className={`w-full rounded-md border bg-white p-2 text-sm outline-none ${fieldClass}`}
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
          onBlur={onBlurField}
          aria-invalid={showError}
          className={`w-full rounded-md border p-2 text-sm outline-none ${fieldClass}`}
        />
      );
  }
}
