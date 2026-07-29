import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import AccountsTable, { type AccountRow } from "@/components/AccountsTable";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

// Gestion des comptes (admin) : liste, réinitialisation de mot de passe, suppression.
export default async function ComptesPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      provider: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  const rows: AccountRow[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? "",
    provider: u.provider,
    verified: u.emailVerifiedAt != null,
    createdAt: dateFmt.format(u.createdAt),
    isSelf: u.email.toLowerCase() === admin.email.toLowerCase(),
    isAdmin: isAdmin(u.email),
  }));

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Gestion des comptes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {users.length} compte{users.length > 1 ? "s" : ""}. Réinitialisez un mot de passe interne
            pour dépanner un membre, ou supprimez un compte.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          ← Tableau de bord
        </Link>
      </div>

      <AccountsTable accounts={rows} />
    </>
  );
}
