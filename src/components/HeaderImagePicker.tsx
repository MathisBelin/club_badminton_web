"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ImageIcon, TrashIcon } from "@/components/icons";

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo (doit rester aligné avec /api/blob/upload)
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Choix de l'image d'en-tête (bannière) du formulaire : glisser-déposer ou sélection de fichier,
// upload direct vers Vercel Blob. L'URL obtenue est remontée au parent, qui l'enregistre
// avec le formulaire.
export default function HeaderImagePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /// Vérifie que le stockage est configuré AVANT l'upload : sinon le SDK Blob
  /// remonte un « Failed to retrieve the client token » incompréhensible.
  async function storageReady(): Promise<boolean> {
    try {
      const res = await fetch("/api/blob/upload");
      const data = (await res.json()) as { configured?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Envoi d'image indisponible.");
        return false;
      }
      if (!data.configured) {
        setError(
          "Stockage d'images non configuré : créez un store Vercel Blob et renseignez " +
            "BLOB_READ_WRITE_TOKEN (puis redémarrez le serveur en local).",
        );
        return false;
      }
      return true;
    } catch {
      setError("Envoi d'image indisponible (serveur injoignable).");
      return false;
    }
  }

  async function pick(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Format non accepté : choisissez une image PNG, JPEG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image trop lourde (5 Mo maximum).");
      return;
    }
    setBusy(true);
    try {
      if (await storageReady()) {
        const blob = await upload(`forms/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        onChange(blob.url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi de l'image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // Gestion du glisser-déposer (sur la zone vide comme sur l'image déjà présente).
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!dragging) setDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      // Ignore les passages d'un enfant à l'autre à l'intérieur de la zone.
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void pick(e.dataTransfer.files?.[0]);
    },
  };

  return (
    <div className="mb-4">
      {value ? (
        <div
          {...dropHandlers}
          className={`relative overflow-hidden rounded-lg border ${
            dragging ? "border-2 border-dashed border-emerald-500" : "border-zinc-200"
          }`}
        >
          <Image
            src={value}
            alt="Image d'en-tête du formulaire"
            width={1200}
            height={300}
            // object-contain : l'image est affichée entière (un logo en portrait
            // ne doit pas être rogné comme une bannière panoramique).
            className="h-40 w-full bg-zinc-50 object-contain"
            unoptimized
          />
          <div className="absolute right-2 top-2 flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              title="Remplacer l'image"
              aria-label="Remplacer l'image"
              className="inline-flex items-center justify-center rounded-md bg-white/90 p-1.5 text-zinc-600 shadow hover:bg-white hover:text-zinc-900 disabled:opacity-60"
            >
              <ImageIcon />
            </button>
            <button
              onClick={() => onChange(null)}
              disabled={busy}
              title="Retirer l'image"
              aria-label="Retirer l'image"
              className="inline-flex items-center justify-center rounded-md bg-white/90 p-1.5 text-red-600 shadow hover:bg-white disabled:opacity-60"
            >
              <TrashIcon />
            </button>
          </div>
          {(dragging || busy) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-emerald-700">
              {busy ? "Envoi de l'image…" : "Déposez pour remplacer l'image"}
            </div>
          )}
        </div>
      ) : (
        <button
          {...dropHandlers}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-sm disabled:opacity-60 ${
            dragging
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-zinc-300 text-zinc-500 hover:border-emerald-400 hover:text-emerald-700"
          }`}
        >
          {!busy && !dragging && <ImageIcon className="h-5 w-5" />}
          {busy
            ? "Envoi de l'image…"
            : dragging
              ? "Déposez l'image ici"
              : "Ajouter une image d'en-tête — glissez-déposez ou cliquez"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
