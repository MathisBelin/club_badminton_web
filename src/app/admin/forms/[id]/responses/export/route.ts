import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";

// Export CSV des réponses d'un formulaire (admin propriétaire uniquement).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const headers = ["E-mail", "Nom", "Envoyé le", "Modifié le", ...form.questions.map((q) => q.title)];
  const lines = [headers.map(csvCell).join(";")];

  for (const r of form.responses) {
    const byQuestion = new Map(r.answers.map((a) => [a.questionId, a.value]));
    const edited = r.lastSubmittedAt.getTime() - r.submittedAt.getTime() > 1000;
    const row = [
      r.respondentEmail,
      r.respondentName ?? "",
      r.submittedAt.toISOString(),
      edited ? r.lastSubmittedAt.toISOString() : "",
      ...form.questions.map((q) => byQuestion.get(q.id) ?? ""),
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
