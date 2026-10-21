import { Fragment, useState } from 'react';

// Lo que dice la barra, en orden. Lo que destaca va en Bodoni itálica; el resto, en mayúsculas.
const MESSAGES = [
  { text: 'Scaps', highlight: true },
  { text: 'Proyecto demo' },
];

// Cada tira repite los mensajes hasta pasar el ancho de la pantalla más ancha. La animación
// corre una tira y vuelve a empezar: la segunda copia hace que no se note el salto.
const REPEAT = 12;

// Si la pausan, sigue pausada al pasar del catálogo a la ficha (hasta recargar).
let pausedByUser = false;

function Sparkle() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      className="size-2.25 shrink-0 fill-current text-scaps-text-annotation"
    >
      <path d="M5 0C5.5 3.2 6.8 4.5 10 5C6.8 5.5 5.5 6.8 5 10C4.5 6.8 3.2 5.5 0 5C3.2 4.5 4.5 3.2 5 0Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 fill-current">
      <rect x="2" y="1.5" width="2.5" height="9" rx="0.5" />
      <rect x="7.5" y="1.5" width="2.5" height="9" rx="0.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 fill-current">
      <path d="M3 1.5v9L10.5 6z" />
    </svg>
  );
}

function Strip() {
  return (
    <div className="flex shrink-0 items-center gap-7 pr-7">
      {Array.from({ length: REPEAT }, (_, i) =>
        MESSAGES.map((m) => (
          <Fragment key={`${i}-${m.text}`}>
            <span
              className={
                m.highlight
                  ? 'font-display text-lg leading-none font-semibold text-scaps-text italic'
                  : 'text-[0.6875rem] leading-none font-medium tracking-[0.24em] text-scaps-text-secondary uppercase'
              }
            >
              {m.text}
            </span>
            <Sparkle />
          </Fragment>
        )),
      )}
    </div>
  );
}

/** Texto en movimiento debajo del navbar. Se frena con el mouse encima o con su botón;
 *  con "reducir movimiento" queda quieto y sin botón. */
export default function Marquee() {
  const [paused, setPaused] = useState(pausedByUser);

  const toggle = () => {
    pausedByUser = !paused;
    setPaused(pausedByUser);
  };

  return (
    <div className="relative h-10 overflow-hidden border-b border-scaps-border-row bg-scaps-page">
      {/* El lector de pantalla lo lee una vez, no cada repetición. */}
      <p className="sr-only">{MESSAGES.map((m) => m.text).join(' · ')}</p>
      <div
        aria-hidden="true"
        className="group/marquee flex h-full items-center"
      >
        <div
          className={`flex w-max animate-marquee whitespace-nowrap group-hover/marquee:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:pl-6 lg:motion-reduce:pl-12 ${paused ? '[animation-play-state:paused]' : ''}`}
        >
          <Strip />
          <Strip />
        </div>
      </div>
      {/* El texto se esfuma antes del botón. */}
      <div className="pointer-events-none absolute inset-y-0 right-11 w-8 bg-linear-to-r from-transparent to-scaps-page motion-reduce:hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? 'Reanudar la animación' : 'Pausar la animación'}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center bg-scaps-page text-scaps-text-secondary transition-colors hover:text-scaps-text focus-visible:-outline-offset-4 motion-reduce:hidden"
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  );
}
