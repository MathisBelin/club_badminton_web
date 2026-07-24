import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";

// Génère les jetons d'upload pour les images d'en-tête (upload direct navigateur → Vercel Blob).
// Réservé aux admins ; le fichier est limité en type et en taille côté serveur.
// Cette route n'est PAS couverte par le proxy d'authentification (voir src/proxy.ts) afin de
// répondre en JSON — le SDK Blob attend du JSON et masque toute autre réponse derrière
// « Failed to retrieve the client token ».
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

/// Vérifie session + rôle admin. Retourne une réponse d'erreur, ou null si tout va bien.
async function guard(): Promise<Response | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return Response.json({ error: "Session expirée : reconnectez-vous." }, { status: 401 });
  if (!isAdmin(email)) return Response.json({ error: "Accès refusé." }, { status: 403 });
  return null;
}

// Diagnostic appelé avant l'upload : permet d'afficher un message clair si le store
// Vercel Blob n'est pas configuré (variable d'env BLOB_READ_WRITE_TOKEN absente).
export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return Response.json({ configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN) });
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Stockage d'images non configuré (BLOB_READ_WRITE_TOKEN manquant)." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
      }),
      // Rien à faire à la fin de l'upload : l'URL est enregistrée avec le formulaire.
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Échec de l'envoi de l'image." },
      { status: 400 },
    );
  }
}
