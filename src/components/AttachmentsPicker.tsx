"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { TrashIcon } from "@/components/icons";
import {
  ATTACHMENT_TYPES,
  ATTACHMENT_MAX_BYTES,
  humanSize,
  type Attachment,
} from "@/lib/attachments";

// Documents joints publics du formulaire (ex. RIB) : upload multiple vers Vercel Blob.
// La liste (URL + nom + taille) est remontée au parent, qui l'enregistre avec le formulaire.
export default function AttachmentsPicker({
  value,
  onChange,
}: {
  value: Attachment[];
  onChange: (list: Attachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /// Vérifie que le stockage Blob est configuré avant l'upload (message clair sinon).
  async function storageReady(): Promise<boolean> {
    try {
      const res = await fetch("/api/blob/upload");
      const data = (await res.json()) as { configured?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Envoi de fichier indisponible.");
        return false;
      }
      if (!data.configured) {
        setError(
          "Stockage non configuré : créez un store Vercel Blob et renseignez BLOB_READ_WRITE_TOKEN.",
        );
        return false;
      }
      return true;
    } catch {
      setError("Envoi de fichier indisponible (serveur injoignable).");
      return false;
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    setError(null);

    const chosen = Array.from(files);
    for (const f of chosen) {
      if (!ATTACHMENT_TYPES.includes(f.type)) {
        setError(`« ${f.name} » : format non accepté (PDF ou image).`);
        return;
      }
      if (f.size > ATTACHMENT_MAX_BYTES) {
        setError(`« ${f.name} » : fichier trop lourd (10 Mo maximum).`);
        return;
      }
    }

    setBusy(true);
    try {
      if (await storageReady()) {
        const added: Attachment[] = [];
        for (const f of chosen) {
          const blob = await upload(`forms/docs/${f.name}`, f, {
            access: "public",
            handleUploadUrl: "/api/blob/upload",
          });
          added.push({ url: blob.url, filename: f.name, contentType: f.type, size: f.size });
        }
        onChange([...value, ...added]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi du fichier.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(url: string) {
    onChange(value.filter((a) => a.url !== url));
  }

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 space-y-2">
          {value.map((a) => (
            <li
              key={a.url}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
            >
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-emerald-700 hover:underline"
              >
                📎 {a.filename}
              </a>
              <div className="flex items-center gap-3">
                {a.size > 0 && <span className="text-xs text-zinc-400">{humanSize(a.size)}</span>}
                <button
                  type="button"
                  onClick={() => remove(a.url)}
                  title="Retirer ce document"
                  aria-label="Retirer ce document"
                  className="inline-flex items-center justify-center rounded border border-red-200 p-1 text-red-500 hover:bg-red-50"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full rounded-lg border border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-60"
      >
        {busy ? "Envoi…" : "+ Ajouter un document (PDF ou image, 10 Mo max)"}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_TYPES.join(",")}
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
