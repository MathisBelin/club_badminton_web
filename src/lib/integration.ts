// API d'intégration destinée à l'application desktop (lecture seule).
// Authentification par clé partagée : en-tête `x-api-key` = INTEGRATION_API_KEY.

export type IntegrationGuard = { ok: true } | { ok: false; response: Response };

/// Vérifie la clé d'API de la requête.
export function guardIntegration(request: Request): IntegrationGuard {
  const expected = process.env.INTEGRATION_API_KEY;
  if (!expected) {
    return {
      ok: false,
      response: Response.json(
        { error: "API d'intégration non configurée (INTEGRATION_API_KEY)." },
        { status: 503 },
      ),
    };
  }
  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return { ok: false, response: Response.json({ error: "Clé d'API invalide." }, { status: 401 }) };
  }
  return { ok: true };
}
