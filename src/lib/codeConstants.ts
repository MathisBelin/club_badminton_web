// Constantes des codes de vérification, partagées client et serveur (aucune dépendance
// serveur ici, contrairement à verificationCode.ts qui utilise node:crypto).

/// Nombre de chiffres du code.
export const CODE_LENGTH = 6;

/// Nombre de saisies erronées tolérées avant d'exiger un nouveau code (anti-force brute).
export const MAX_CODE_ATTEMPTS = 8;

/// Durée de validité d'un code s'il n'est pas utilisé (en minutes).
export const CODE_TTL_MINUTES = 10;

/// Durée de validité d'un code, en millisecondes.
export const CODE_TTL_MS = CODE_TTL_MINUTES * 60 * 1000;
