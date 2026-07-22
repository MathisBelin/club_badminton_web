import AppHeader from "@/components/AppHeader";
import { requireAdmin } from "@/lib/session";

// Toutes les pages /admin exigent un compte admin (sinon redirection vers l'accueil).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
