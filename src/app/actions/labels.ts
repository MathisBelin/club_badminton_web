"use server";

import { requireAdmin } from "@/lib/session";
import { GoogleContactsError, syncLabels } from "@/lib/googleContacts";

export type ClubLabelOption = { resourceName: string; name: string };

export type SyncLabelsResult =
  | { ok: true; labels: ClubLabelOption[] }
  | { ok: false; error: string };

/// Relit la liste des libellés depuis Google Contacts (noms seulement, appel léger).
/// Appelée à l'ouverture de la fenêtre « Nouveau formulaire ».
export async function syncLabelsFromGoogle(): Promise<SyncLabelsResult> {
  const user = await requireAdmin();
  try {
    const labels = await syncLabels(user.email);
    return { ok: true, labels: labels.sort((a, b) => a.name.localeCompare(b.name, "fr")) };
  } catch (error) {
    if (error instanceof GoogleContactsError) return { ok: false, error: error.message };
    throw error;
  }
}
