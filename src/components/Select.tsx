"use client";

import { useId } from "react";
import ReactSelect from "react-select";

// Liste déroulante réutilisable « type Select2 » (recherche + menu stylé), basée sur
// react-select et accordée au thème emerald du site. Interface volontairement simple
// (valeur/onChange en string) pour remplacer un <select> natif sans changer la logique.
export type SelectOption = { value: string; label: string };

export default function Select({
  options,
  value,
  onChange,
  onBlur,
  placeholder = "— Sélectionner —",
  isSearchable = true,
  isDisabled = false,
  invalid = false,
  id,
  ariaLabel,
  title,
  className,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  isSearchable?: boolean;
  isDisabled?: boolean;
  /** Bordure rouge (champ en erreur), aligné sur le style natif existant. */
  invalid?: boolean;
  id?: string;
  ariaLabel?: string;
  title?: string;
  /** Largeur du conteneur (ex. "w-full", "w-52"). react-select occupe 100 % du conteneur. */
  className?: string;
}) {
  // instanceId stable côté serveur et client (évite les écarts d'hydratation).
  const instanceId = useId();
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <div className={className} title={title}>
      <ReactSelect<SelectOption>
        instanceId={instanceId}
        inputId={id}
        options={options}
        value={selected}
        onChange={(opt) => onChange(opt ? opt.value : "")}
        onBlur={onBlur}
        placeholder={placeholder}
        isSearchable={isSearchable}
        isDisabled={isDisabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        noOptionsMessage={() => "Aucun résultat"}
        loadingMessage={() => "Chargement…"}
        // Menu porté sur <body> + position fixe : évite qu'il soit tronqué dans les
        // fenêtres modales (et passe au-dessus du fond de modale, z-50).
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        menuPosition="fixed"
        theme={(t) => ({
          ...t,
          borderRadius: 6,
          colors: {
            ...t.colors,
            primary: "#059669", // emerald-600
            primary75: "#10b981", // emerald-500
            primary50: "#a7f3d0", // emerald-200
            primary25: "#ecfdf5", // emerald-50
            danger: "#dc2626",
            dangerLight: "#fecaca",
          },
        })}
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: 38,
            fontSize: "0.875rem",
            backgroundColor: state.isDisabled ? "#f4f4f5" : "white",
            borderColor: invalid ? "#dc2626" : state.isFocused ? "#34d399" : "#d4d4d8",
            boxShadow: state.isFocused ? "0 0 0 1px #34d399" : "none",
            "&:hover": { borderColor: invalid ? "#dc2626" : "#34d399" },
          }),
          valueContainer: (base) => ({ ...base, paddingTop: 1, paddingBottom: 1 }),
          placeholder: (base) => ({ ...base, color: "#a1a1aa" }),
          menu: (base) => ({ ...base, fontSize: "0.875rem" }),
          menuPortal: (base) => ({ ...base, zIndex: 60 }),
        }}
      />
    </div>
  );
}
