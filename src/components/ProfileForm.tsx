"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/account";

const field =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

// Modification du prénom / nom (compte interne).
export default function ProfileForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="p-firstName" className="mb-1 block text-sm font-medium text-zinc-700">
            Prénom
          </label>
          <input id="p-firstName" name="firstName" defaultValue={firstName} required className={field} />
        </div>
        <div>
          <label htmlFor="p-lastName" className="mb-1 block text-sm font-medium text-zinc-700">
            Nom
          </label>
          <input id="p-lastName" name="lastName" defaultValue={lastName} required className={field} />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Modifications enregistrées.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
