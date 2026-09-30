import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { MULTI_SEP, TYPES_WITH_OPTIONS, isQuestion } from "@/lib/questions";
import ChoiceDonut, { type DonutSlice } from "@/components/ChoiceDonut";

// Palette catégorielle validée (thème clair) — voir skill dataviz. Assignée dans l'ordre,
// jamais cyclée : au-delà de 8 tranches, le surplus est replié dans « Autres ».
const PALETTE = [
  "#2a78d6", "#eb6834", "#1baf7a", "#eda100",
  "#e87ba4", "#008300", "#4a3aa7", "#e34948",
];
const OTHER_COLOR = "#9aa0a6";

type Slice = DonutSlice;

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: { include: { answers: true } },
    },
  });
  if (!form || form.ownerEmail.toLowerCase() !== user.email.toLowerCase()) notFound();

  const choiceQuestions = form.questions.filter(
    (q) => isQuestion(q.type) && TYPES_WITH_OPTIONS.includes(q.type),
  );

  // Pour chaque question à choix : compter les sélections par option.
  const charts = choiceQuestions.map((q) => {
    const isMulti = q.type === "CHECKBOX";
    const counts = new Map<string, number>(q.options.map((o) => [o, 0]));
    let other = 0;
    let respondents = 0; // nombre de personnes ayant répondu à cette question

    for (const resp of form.responses) {
      const raw = resp.answers.find((a) => a.questionId === q.id)?.value ?? "";
      const values = (isMulti ? raw.split(MULTI_SEP) : [raw])
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length > 0) respondents++;
      for (const v of values) {
        if (counts.has(v)) counts.set(v, counts.get(v)! + 1);
        else other++;
      }
    }

    // Tranches dans l'ordre des options + « Autres » (valeurs hors options).
    const raw: Array<{ label: string; count: number }> = q.options.map((o) => ({
      label: o,
      count: counts.get(o) ?? 0,
    }));
    if (other > 0) raw.push({ label: "Autres", count: other });

    // Au-delà de 8 tranches : replier les moins fréquentes dans « Autres » (couleurs non cyclées).
    let sliced: Slice[];
    if (raw.length <= PALETTE.length) {
      sliced = raw.map((s, i) => ({ ...s, color: s.label === "Autres" ? OTHER_COLOR : PALETTE[i] }));
    } else {
      const sorted = [...raw].sort((a, b) => b.count - a.count);
      const keep = sorted.slice(0, PALETTE.length - 1);
      const foldCount = sorted.slice(PALETTE.length - 1).reduce((s, x) => s + x.count, 0);
      const order = new Map(keep.map((k, i) => [k.label, i]));
      sliced = raw
        .filter((s) => order.has(s.label))
        .map((s) => ({ ...s, color: PALETTE[order.get(s.label)!] }));
      if (foldCount > 0) sliced.push({ label: "Autres", count: foldCount, color: OTHER_COLOR });
    }

    const total = sliced.reduce((s, x) => s + x.count, 0);
    return { question: q, isMulti, respondents, total, slices: sliced };
  });

  return (
    <div>
      <div className="mb-6">
        <Link href={`/admin/forms/${form.id}/responses`}
          className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Retour aux réponses
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Statistiques — {form.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {form.responses.length} réponse{form.responses.length > 1 ? "s" : ""} ·{" "}
          {choiceQuestions.length} question{choiceQuestions.length > 1 ? "s" : ""} à choix
        </p>
      </div>

      {charts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          Ce formulaire n&apos;a aucune question à choix (choix unique, cases à cocher ou liste déroulante).
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {charts.map(({ question, isMulti, respondents, total, slices }) => (
            <div key={question.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="text-base font-semibold text-zinc-900">{question.title}</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {isMulti
                  ? `${respondents} répondant(s) · ${total} sélection(s)`
                  : `${respondents} réponse(s)`}
              </p>

              {total === 0 ? (
                <p className="mt-6 text-sm text-zinc-400">Aucune réponse pour l&apos;instant.</p>
              ) : (
                <div className="mt-4">
                  <ChoiceDonut slices={slices} total={total} unit={isMulti ? "sélections" : "réponses"} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
