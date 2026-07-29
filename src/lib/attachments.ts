// Pièces jointes publiques d'un formulaire (documents attachés par l'admin, ex. RIB).
// Stockées en JSON sur Form.attachments ; hébergées sur Vercel Blob (accès public).

import { z } from "zod";

export const attachmentSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1),
  contentType: z.string().default(""),
  size: z.number().int().nonnegative().default(0),
});

export type Attachment = z.infer<typeof attachmentSchema>;

export const attachmentsSchema = z.array(attachmentSchema).default([]);

/// Lit en toute sécurité une valeur JSON (colonne Prisma) en liste de pièces jointes.
export function parseAttachments(value: unknown): Attachment[] {
  const r = attachmentsSchema.safeParse(value);
  return r.success ? r.data : [];
}

/// Types de fichiers acceptés pour un document joint (RIB en PDF ou en image).
export const ATTACHMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

/// Taille lisible (ex. « 1,2 Mo ») pour l'affichage.
export function humanSize(bytes: number): string {
  if (bytes <= 0) return "";
  const mo = bytes / (1024 * 1024);
  if (mo >= 1) return `${mo.toFixed(1).replace(".", ",")} Mo`;
  const ko = bytes / 1024;
  return `${Math.max(1, Math.round(ko))} Ko`;
}
