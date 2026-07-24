// Jeu d'icônes monochromes (trait, couleur héritée du texte), dans l'esprit sobre
// des boutons de l'application desktop. Taille par défaut : 16 px.

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-4 w-4"}
    >
      {children}
    </svg>
  );
}

/// Aperçu
export function EyeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
    </Svg>
  );
}

/// Modifier
export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
      <path d="m14.5 5.5 4 4" />
    </Svg>
  );
}

/// Réponses
export function ChartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 20h17" />
      <path d="M7 20v-5.5" />
      <path d="M12 20V6" />
      <path d="M17 20v-8.5" />
    </Svg>
  );
}

/// Lien de partage
export function LinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9.5 14.5 5-5" />
      <path d="m11 6.8 1.9-1.9a4.3 4.3 0 0 1 6.1 6.1l-1.9 1.9" />
      <path d="m13 17.2-1.9 1.9a4.3 4.3 0 0 1-6.1-6.1L6.9 11" />
    </Svg>
  );
}

/// Confirmation (lien copié)
export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

/// Supprimer
export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5h16" />
      <path d="M9.5 6.5V4.5h5v2" />
      <path d="M6.5 6.5 7.5 20h9l1-13.5" />
      <path d="M10.5 10v6M13.5 10v6" />
    </Svg>
  );
}

/// Indicateur de chargement (anneau qui tourne)
export function Spinner({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`animate-spin ${className ?? "h-4 w-4"}`}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth={2} opacity={0.25} />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

/// Dupliquer
export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H5.5A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15" />
    </Svg>
  );
}

/// Modèle (enregistrer comme modèle)
export function TemplateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16" />
      <path d="M10 9v11" />
    </Svg>
  );
}

/// Poignée de déplacement (glisser-déposer)
export function GripIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </Svg>
  );
}

/// Bloc de texte
export function TextIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 6.5V5h14v1.5" />
      <path d="M12 5v14" />
      <path d="M9.5 19h5" />
    </Svg>
  );
}

/// Fermer / retirer
export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

/// Image
export function ImageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.25" />
      <path d="m4.5 17.5 5-5 3.5 3.5 2.5-2.5 4 4" />
    </Svg>
  );
}
