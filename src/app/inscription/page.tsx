import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RegisterForm from "@/components/RegisterForm";

// Page de création d'un compte interne (publique).
export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { callbackUrl } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">🏸</div>
          <h1 className="mt-3 text-xl font-semibold text-zinc-900">Créer un compte</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pour les membres sans adresse Gmail. Sinon, connectez-vous avec Google.
          </p>
        </div>

        <RegisterForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
