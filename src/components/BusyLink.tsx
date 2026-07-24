"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "@/components/icons";
import { NAV_START } from "@/components/NavigationProgress";

// Lien de navigation qui affiche un indicateur de chargement tant que la page
// destination n'est pas prête (listes de réponses et constructeur sont des pages
// serveur : le clic peut prendre une seconde ou deux).
export default function BusyLink({
  href,
  title,
  className,
  children,
}: {
  href: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-busy={pending}
      disabled={pending}
      onClick={() => {
        // Barre de progression dès le clic, sans attendre la réponse du serveur.
        window.dispatchEvent(new Event(NAV_START));
        startTransition(() => router.push(href));
      }}
      className={className}
    >
      {pending ? <Spinner /> : children}
    </button>
  );
}
