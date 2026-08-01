"use client";

import { useEffect } from "react";

// Redirige le navigateur vers une URL EXTERNE (ex. la fenêtre de composition Gmail)
// après une étape interne. On le fait côté client (window.location) car Auth.js
// n'autorise pas une redirection hors origine, et c'est plus fiable qu'une
// redirection serveur pour ouvrir une page Google.
export default function OpenExternal({ url, label }: { url: string; label?: string }) {
  useEffect(() => {
    window.location.href = url;
  }, [url]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">📧</div>
        <p className="mt-3 text-sm text-zinc-600">
          Ouverture de Gmail{label ? <> en tant que <strong>{label}</strong></> : null}…
        </p>
        <a
          href={url}
          rel="noreferrer"
          className="mt-4 inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Si rien ne se passe, cliquez ici pour ouvrir Gmail.
        </a>
      </div>
    </div>
  );
}
