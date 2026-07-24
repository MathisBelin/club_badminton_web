import PageLoader from "@/components/PageLoader";

// Attente du chargement d'un formulaire (et de ses sous-pages : merci, vérification).
export default function Loading() {
  return <PageLoader label="Chargement du formulaire…" />;
}
