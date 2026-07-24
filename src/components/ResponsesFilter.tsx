"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/icons";

// État « recherche en cours » partagé entre le champ de saisie et le tableau :
// le tableau se cache et laisse la place à l'indicateur de chargement.
const SearchPendingContext = createContext<{
  loading: boolean;
  setLoading: (value: boolean) => void;
}>({ loading: false, setLoading: () => {} });

/// À placer autour du champ de recherche ET du tableau.
export function SearchPendingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  return (
    <SearchPendingContext.Provider value={{ loading, setLoading }}>
      {children}
    </SearchPendingContext.Provider>
  );
}

/// Zone de résultats : masquée pendant la recherche, remplacée par le chargement.
export function SearchResults({ children }: { children: ReactNode }) {
  const { loading } = useContext(SearchPendingContext);
  if (!loading) return <>{children}</>;
  return (
    <div
      role="status"
      aria-label="Recherche en cours"
      className="flex items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-10 text-sm text-zinc-500"
    >
      <Spinner className="h-5 w-5" />
      Recherche en cours…
    </div>
  );
}

// Champ de recherche du tableau des réponses : écrit le terme dans l'URL (?q=)
// pour que la page (rendue côté serveur) et l'export CSV filtrent la même chose.
export default function ResponsesFilter({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setLoading } = useContext(SearchPendingContext);
  const [term, setTerm] = useState(initial);
  const firstRender = useRef(true);
  // Lu au moment du déclenchement seulement : mettre `searchParams` en dépendance de
  // l'effet relancerait celui-ci à chaque navigation (boucle de chargement infinie).
  const paramsRef = useRef(searchParams);
  useEffect(() => {
    paramsRef.current = searchParams;
  }, [searchParams]);
  // Deux temps : la pause de saisie, puis le re-rendu serveur.
  const [waiting, setWaiting] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Pas de navigation au premier rendu : l'URL porte déjà le terme initial.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Rien à faire si l'URL porte déjà ce terme (retour arrière, re-rendu…).
    const next = term.trim();
    if (next === (paramsRef.current.get("q") ?? "")) {
      setWaiting(false);
      return;
    }

    setWaiting(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams(paramsRef.current.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
      // La transition prend le relais de l'attente de saisie.
      setWaiting(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [term, pathname, router]);

  useEffect(() => {
    setLoading(waiting || pending);
  }, [waiting, pending, setLoading]);

  return (
    <input
      type="search"
      value={term}
      onChange={(e) => setTerm(e.target.value)}
      placeholder="Rechercher (e-mail, nom, prénom)…"
      aria-label="Rechercher une réponse"
      className="w-72 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
    />
  );
}
