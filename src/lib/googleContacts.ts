import { prisma } from "@/lib/prisma";

// Lecture des libellés Google Contacts (People API) avec l'autorisation d'un admin.
// Le jeton de rafraîchissement est stocké en base (modèle GoogleAccount) lors de
// « Connecter Google Contacts » : le serveur peut donc consulter les libellés même
// quand la page est visitée par un répondant.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PEOPLE_URL = "https://people.googleapis.com/v1";

// people:batchGet accepte 200 ressources par appel ; on reste large sous la limite.
const BATCH_SIZE = 100;

/// Erreur lisible (affichée telle quelle dans l'interface).
export class GoogleContactsError extends Error {}

/// L'admin a-t-il autorisé la lecture de ses contacts ?
export async function hasContactsAuthorization(email: string): Promise<boolean> {
  const account = await prisma.googleAccount.findUnique({
    where: { email: email.toLowerCase() },
    select: { email: true },
  });
  return account !== null;
}

/// Jeton d'accès frais, obtenu à partir du jeton de rafraîchissement de l'admin.
async function getAccessToken(email: string): Promise<string> {
  const account = await prisma.googleAccount.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!account) {
    throw new GoogleContactsError(
      "Google Contacts n'est pas encore autorisé pour ce compte : cliquez sur « Connecter Google Contacts ».",
    );
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleContactsError("Identifiants Google absents (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET).");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    // Autorisation révoquée ou expirée (compte de test Google : ~7 jours).
    await prisma.googleAccount.delete({ where: { email: account.email } }).catch(() => {});
    throw new GoogleContactsError(
      "Autorisation Google Contacts expirée ou révoquée : reconnectez Google Contacts.",
    );
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new GoogleContactsError("Réponse Google inattendue (jeton absent).");
  return data.access_token;
}

async function callPeople<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${PEOPLE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 403 && body.includes("People API")) {
      throw new GoogleContactsError(
        "L'API Google People n'est pas activée sur le projet Google Cloud du site.",
      );
    }
    throw new GoogleContactsError(`Google Contacts a refusé la demande (${response.status}).`);
  }
  return (await response.json()) as T;
}

type ContactGroup = { resourceName?: string; name?: string; groupType?: string };

/// Libellés créés par l'utilisateur (un seul appel : ni membres, ni contacts).
async function fetchLabelNames(token: string): Promise<{ resourceName: string; name: string }[]> {
  const groups: ContactGroup[] = [];
  let pageToken = "";
  do {
    const page = await callPeople<{ contactGroups?: ContactGroup[]; nextPageToken?: string }>(
      token,
      `/contactGroups?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`,
    );
    groups.push(...(page.contactGroups ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);

  // Les groupes système (« Mes contacts », « Favoris »…) ne sont pas des libellés.
  return groups
    .filter((g) => g.groupType === "USER_CONTACT_GROUP" && g.resourceName && g.name)
    .map((g) => ({ resourceName: g.resourceName!, name: g.name! }));
}

/// Rafraîchit la liste des libellés (noms seulement) depuis Google Contacts.
/// Les membres ne sont PAS lus ici : c'est la partie coûteuse, faite à la demande
/// par `isRegistered` quand il faut savoir si quelqu'un est déjà inscrit.
export async function syncLabels(email: string): Promise<{ resourceName: string; name: string }[]> {
  const token = await getAccessToken(email);
  const labels = await fetchLabelNames(token);
  const owner = email.toLowerCase();
  const keep = labels.map((l) => l.resourceName);

  await prisma.$transaction([
    // Les libellés supprimés chez Google disparaissent aussi ici (le formulaire
    // qui pointait dessus retombe sans libellé, cf. onDelete: SetNull).
    prisma.clubLabel.deleteMany({
      where: { ownerEmail: { equals: owner, mode: "insensitive" }, resourceName: { notIn: keep } },
    }),
    ...labels.map((l) =>
      prisma.clubLabel.upsert({
        where: { resourceName: l.resourceName },
        create: { resourceName: l.resourceName, name: l.name, ownerEmail: owner },
        update: { name: l.name, ownerEmail: owner },
      }),
    ),
  ]);

  return labels;
}

/// Durée de validité de la liste des membres d'un libellé avant relecture chez Google.
/// Court volontairement : une personne dissociée doit pouvoir répondre de nouveau très vite
/// (bloquer quelqu'un à tort est plus gênant qu'un appel People API de plus).
const MEMBERS_TTL_MS = 60 * 1000;

/// Relit les membres d'UN libellé chez Google et remplace le cache.
async function refreshMembers(ownerEmail: string, labelResource: string): Promise<void> {
  const token = await getAccessToken(ownerEmail);
  const detail = await callPeople<{ memberResourceNames?: string[] }>(
    token,
    `/${labelResource}?maxMembers=10000`,
  );
  const people = detail.memberResourceNames ?? [];
  const emails = new Set<string>();

  for (let i = 0; i < people.length; i += BATCH_SIZE) {
    const chunk = people.slice(i, i + BATCH_SIZE);
    const query = chunk.map((r) => `resourceNames=${encodeURIComponent(r)}`).join("&");
    const batch = await callPeople<{
      responses?: { person?: { emailAddresses?: { value?: string }[] } }[];
    }>(token, `/people:batchGet?personFields=emailAddresses&${query}`);

    for (const item of batch.responses ?? []) {
      for (const address of item.person?.emailAddresses ?? []) {
        if (address.value) emails.add(address.value.trim().toLowerCase());
      }
    }
  }

  await prisma.$transaction([
    prisma.clubLabelMember.deleteMany({ where: { labelResource } }),
    prisma.clubLabelMember.createMany({
      data: [...emails].map((member) => ({ labelResource, email: member })),
      skipDuplicates: true,
    }),
    prisma.clubLabel.update({
      where: { resourceName: labelResource },
      data: { membersSyncedAt: new Date() },
    }),
  ]);
}

/// Cette personne est-elle déjà inscrite (membre du libellé du formulaire) ?
/// On ne bloque QUE sur une liste de membres à jour : si le cache est périmé et que la
/// relecture chez Google échoue (autorisation expirée, People API indisponible…), on
/// répond « non » plutôt que de bloquer sur des données peut-être obsolètes — bloquer à
/// tort une personne dissociée serait plus gênant que laisser passer une réponse.
export async function isRegistered(labelResource: string, personEmail: string): Promise<boolean> {
  const label = await prisma.clubLabel.findUnique({
    where: { resourceName: labelResource },
    select: { ownerEmail: true, membersSyncedAt: true },
  });
  if (!label) return false;

  const fresh =
    !!label.membersSyncedAt && Date.now() - label.membersSyncedAt.getTime() <= MEMBERS_TTL_MS;

  if (!fresh) {
    try {
      await refreshMembers(label.ownerEmail, labelResource);
    } catch {
      // Impossible de vérifier chez Google : on ne bloque pas (liste de membres non fiable).
      return false;
    }
  }

  const found = await prisma.clubLabelMember.count({
    where: { labelResource, email: personEmail.toLowerCase() },
  });
  return found > 0;
}
