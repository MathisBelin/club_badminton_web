import { Spinner } from "@/components/icons";

// Écran d'attente affiché pendant le rendu d'une page (fallback des fichiers loading.tsx).
export default function PageLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 items-center justify-center px-4 py-20 text-zinc-500"
    >
      <span className="inline-flex items-center gap-3 text-sm">
        <Spinner className="h-5 w-5 text-emerald-600" />
        {label}
      </span>
    </div>
  );
}
