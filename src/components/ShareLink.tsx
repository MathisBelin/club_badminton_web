"use client";

import { useEffect, useState } from "react";
import { CheckIcon, LinkIcon } from "@/components/icons";

// Construit l'URL absolue côté client (l'origine n'est connue qu'au navigateur).
function useAbsoluteUrl(path: string) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);
  return url;
}

async function copyToClipboard(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    window.prompt("Copiez le lien :", url);
    return false;
  }
}

// Bouton compact « Copier le lien » (utilisé dans la liste des formulaires).
// `accessible = false` : le lien est copiable quand même, mais il ne fonctionnera
// pour les répondants qu'une fois le formulaire rendu accessible.
export function CopyLinkButton({ path, accessible = true }: { path: string; accessible?: boolean }) {
  const url = useAbsoluteUrl(path);
  const [copied, setCopied] = useState(false);
  const label = accessible
    ? "Copier le lien de partage"
    : "Copier le lien (il ne fonctionnera qu'une fois le formulaire accessible)";

  async function copy() {
    if (await copyToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={copy}
      disabled={!url}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-md border p-1.5 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 ${
        accessible ? "border-zinc-300 text-zinc-600" : "border-zinc-200 text-zinc-400"
      }`}
    >
      {copied ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <LinkIcon />}
    </button>
  );
}

// Bandeau d'information du constructeur : uniquement le message (le lien lui-même se
// copie depuis la liste des formulaires, bouton 🔗).
export function ShareLinkBar() {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="text-sm font-medium text-emerald-800">
        Lien de partage — toute personne disposant du lien peut répondre (connexion Google requise).
      </div>
    </div>
  );
}
