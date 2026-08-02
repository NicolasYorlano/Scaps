import { create } from 'zustand';

// Cuenta las llamadas en curso para que un único aviso global diga que el
// servidor está tardando, sin que ninguna pantalla lo repita. Render duerme a
// los 15 min sin tráfico y tarda entre 30 y 60s en despertar.
//
// Lo escribe lib/api.ts, no las pantallas.

const SLOW_AFTER_MS = 5000;

type RequestStore = {
  pending: number;
  isSlow: boolean;
  start: () => void;
  finish: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;

export const useRequestStore = create<RequestStore>((set, get) => ({
  pending: 0,
  isSlow: false,

  start: () => {
    const pending = get().pending + 1;
    set({ pending });

    // El reloj no se reinicia con cada llamada nueva: mide cuánto lleva la API
    // sin contestar nada, que es el síntoma del servidor dormido.
    if (pending === 1 && timer === null) {
      timer = setTimeout(() => set({ isSlow: true }), SLOW_AFTER_MS);
    }
  },

  finish: () => {
    const pending = Math.max(0, get().pending - 1);

    if (pending > 0) {
      set({ pending });
      return;
    }

    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    set({ pending, isSlow: false });
  },
}));
