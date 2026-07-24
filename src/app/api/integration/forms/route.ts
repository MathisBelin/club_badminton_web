import { prisma } from "@/lib/prisma";
import { guardIntegration } from "@/lib/integration";

// Liste des formulaires, éventuellement filtrés par compte propriétaire :
//   GET /api/integration/forms?owner=<e-mail>
export async function GET(request: Request) {
  const guard = guardIntegration(request);
  if (!guard.ok) return guard.response;

  const owner = new URL(request.url).searchParams.get("owner")?.trim();

  const forms = await prisma.form.findMany({
    where: owner ? { ownerEmail: { equals: owner, mode: "insensitive" } } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      ownerEmail: true,
      isPublished: true,
      createdAt: true,
      labelResource: true,
      label: { select: { name: true } },
      _count: { select: { responses: true } },
    },
  });

  return Response.json({
    forms: forms.map((f) => ({
      id: f.id,
      title: f.title,
      ownerEmail: f.ownerEmail,
      isPublished: f.isPublished,
      createdAt: f.createdAt.toISOString(),
      // Libellé Contacts associé au formulaire (choisi à la création, côté site).
      labelResourceName: f.labelResource ?? "",
      labelName: f.label?.name ?? "",
      responseCount: f._count.responses,
    })),
  });
}
