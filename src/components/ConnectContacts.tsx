"use client";

import { signIn } from "next-auth/react";

// Invitation à autoriser la lecture de Google Contacts (admins). Sans elle, aucun
// formulaire ne peut être créé : le libellé est obligatoire et vient des contacts.
// Une fois l'autorisation donnée, ce bandeau disparaît — les libellés sont relus
// automatiquement à l'ouverture de la fenêtre « Nouveau formulaire ».
export default function ConnectContacts() {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-medium">Google Contacts n&apos;est pas encore connecté.</p>
      <p className="mt-1 text-amber-700">
        Les libellés de vos contacts servent à créer un formulaire et à reconnaître les personnes
        déjà inscrites. Autorisez la lecture (seule) de vos contacts pour continuer.
      </p>
      <button
        onClick={() => signIn("google-contacts", { callbackUrl: "/admin" })}
        className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
      >
        Connecter Google Contacts
      </button>
    </div>
  );
}
