"use client";

import { useEffect, useRef } from "react";

// Défilement automatique pendant un glisser-déposer : plus la souris approche du
// haut ou du bas de la fenêtre, plus la page défile vite (accélération quadratique).
const EDGE = 140; // hauteur de la zone sensible, en pixels
const MIN_SPEED = 3; // px par image, à l'entrée de la zone
const MAX_SPEED = 30; // px par image, tout en haut / tout en bas

export function useDragAutoScroll(active: boolean) {
  const pointerY = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    function onDragOver(event: DragEvent) {
      pointerY.current = event.clientY;
      // Autorise le survol de toute la page (sinon les zones hors cartes
      // n'émettent pas d'événement et le défilement se fige).
      event.preventDefault();
    }
    function onDrop(event: DragEvent) {
      event.preventDefault();
    }

    /// Vitesse (px/image) selon la position du curseur : négative vers le haut.
    function speed(y: number): number {
      const height = window.innerHeight;
      if (y < EDGE) {
        const ratio = Math.min(1, (EDGE - y) / EDGE);
        return -(MIN_SPEED + (MAX_SPEED - MIN_SPEED) * ratio * ratio);
      }
      if (y > height - EDGE) {
        const ratio = Math.min(1, (y - (height - EDGE)) / EDGE);
        return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * ratio * ratio;
      }
      return 0;
    }

    function step() {
      const y = pointerY.current;
      if (y !== null) {
        const delta = speed(y);
        if (delta !== 0) window.scrollBy(0, delta);
      }
      frame.current = requestAnimationFrame(step);
    }

    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    frame.current = requestAnimationFrame(step);

    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      pointerY.current = null;
    };
  }, [active]);
}
