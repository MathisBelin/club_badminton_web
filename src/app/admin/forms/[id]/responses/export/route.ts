import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";
import { isQuestion } from "@/lib/questions";
import { matchesResponse, searchableQuestionIds } from "@/lib/responseFilter";

// Export CSV des réponses d'un formulaire (admin propriétaire uniquement).
// Le paramètre ?q= reprend le filtre de la page : on n'exporte que les lignes affichées.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAdmin(email)) return new NextResponse("Accès refusé", { status: 403 });

  const { id } = await params;
  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: { orderBy: { submittedAt: "asc" }, include: { answers: true } },
    },
  });
  if (!form || form.ownerEmail.toLowerCase() !== email!.toLowerCase()) {
    return new NextResponse("Formulaire introuvable", { status: 404 });
  }

  // Les blocs de texte informatifs n'attendent pas de réponse : pas de colonne.
  const questions = form.questions.filter((q) => isQuestion(q.type));

  const search = new URL(request.url).searchParams.get("q") ?? "";
  const searchableIds = searchableQuestionIds(form.questions);
  const responses = form.responses.filter((r) => matchesResponse(r, searchableIds, search));

  const headers = ["E-mail", "Nom", "Envoyé le", "Modifié le", ...questions.map((q) => q.title)];
  const lines = [headers.map(csvCell).join(";")];

  for (const r of responses) {
    const byQuestion = new Map(r.answers.map((a) => [a.questionId, a.value]));
    const edited = r.lastSubmittedAt.getTime() - r.submittedAt.getTime() > 1000;
    const row = [
      r.respondentEmail,
      r.respondentName ?? "",
      r.submittedAt.toISOString(),
      edited ? r.lastSubmittedAt.toISOString() : "",
      ...questions.map((q) => byQuestion.get(q.id) ?? ""),
    ];
    lines.push(row.map(csvCell).join(";"));
  }

  // BOM UTF-8 pour qu'Excel ouvre correctement les accents.
  const csv = "﻿" + lines.join("\r\n");
  const safeName = form.title.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || "reponses";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.csv"`,
    },
  });
}

// Échappe une cellule CSV (séparateur « ; »).
function csvCell(value: string): string {
  if (/[";\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
