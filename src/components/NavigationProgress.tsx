"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Événement à émettre pour les navigations déclenchées par du code
// (router.push, Server Action qui redirige…) : window.dispatchEvent(new Event(NAV_START)).
export const NAV_START = "app:nav-start";

// Retour visuel IMMÉDIAT au clic : barre de progression en haut de l'écran, affichée
// dès l'appui sur un lien et retirée à l'arrivée sur la nouvelle page. Les fichiers
// loading.tsx, eux, n'apparaissent qu'une fois la navigation réellement engagée.
export default function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arrivée sur la nouvelle page : la barre disparaît.
  useEffect(() => {
    const done = setTimeout(() => setActive(false), 0);
    return () => clearTimeout(done);
  }, [pathname]);

  useEffect(() => {
    function start() {
      setActive(true);
      if (timer.current) clearTimeout(timer.current);
      // Filet de sécurité si la navigation n'aboutit pas (annulation, erreur…).
      timer.current = setTimeout(() => setActive(false), 15000);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Même page (ou simple changement de paramètres) : rien à charger.
      if (url.pathname === window.location.pathname) return;

      start();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener(NAV_START, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAV_START, start);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-label="Chargement de la page"
      className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-emerald-100"
    >
      <div className="nav-progress-bar h-full w-full bg-emerald-600" />
    </div>
  );
}
