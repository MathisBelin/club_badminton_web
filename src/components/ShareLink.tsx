"use client";

import { useEffect, useState } from "react";

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
export function CopyLinkButton({ path }: { path: string }) {
  const url = useAbsoluteUrl(path);
  const [copied, setCopied] = useState(false);

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
      title="Copier le lien de partage"
      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
    >
      {copied ? "✓ Copié" : "🔗 Lien"}
    </button>
  );
}

// Barre de partage : champ en lecture seule + copier + ouvrir (page de configuration).
export function ShareLinkBar({ path }: { path: string }) {
  const url = useAbsoluteUrl(path);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (await copyToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-2 text-sm font-medium text-emerald-800">
        Lien de partage — toute personne disposant du lien peut répondre (connexion Google requise).
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none"
        />
        <button
          onClick={copy}
          disabled={!url}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {copied ? "✓ Copié" : "Copier"}
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100"
          >
            Ouvrir ↗
          </a>
        )}
      </div>
    </div>
  );
}
