import type { ReactNode } from 'react';

// Atribuciones que exige la licencia CC BY, tal cual docs/glb/Creditos_Modelos_3D_Scaps.pdf.
// Si se suma un modelo, se actualizan el PDF, esta lista y el README.
const MODEL_CREDITS: { title: string; author: string; url: string }[] = [
  {
    title: 'Baseball Cap',
    author: 'Scott VanArsdale',
    url: 'https://skfb.ly/6sEqr',
  },
  {
    title: 'Low Poly Game ready simple cap',
    author: 'DanlyVostok',
    url: 'https://skfb.ly/prEVB',
  },
  {
    title: 'Baseball Cap',
    author: 'FilipMatlak',
    url: 'https://skfb.ly/oEUOq',
  },
  {
    title: 'Baseball Cap',
    author: 'FilipMatlak',
    url: 'https://skfb.ly/oCGSF',
  },
];

// El texto se muestra como en el PDF; el enlace va directo a https.
const LICENSE_TEXT = 'http://creativecommons.org/licenses/by/4.0/';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary"
    >
      {children}
    </a>
  );
}

export default function Creditos() {
  return (
    <main className="flex-1 bg-scaps-canvas px-6 py-12 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-heading text-scaps-text">
          Créditos de los modelos 3D
        </h1>
        <p className="mt-3 text-sm text-scaps-text-secondary">
          Las gorras en 3D, y las fotos del catálogo que salen de ellas, son
          modelos de terceros publicados en Sketchfab bajo licencia Creative
          Commons Attribution 4.0 (CC BY 4.0).
        </p>

        <ol className="mt-6 flex flex-col gap-4">
          {MODEL_CREDITS.map((credit) => (
            <li
              key={credit.url}
              className="rounded-scaps border border-scaps-border bg-scaps-card p-4 text-sm leading-relaxed wrap-break-word text-scaps-text-secondary sm:p-6"
            >
              "{credit.title}" (
              <ExternalLink href={credit.url}>{credit.url}</ExternalLink>) by{' '}
              {credit.author} is licensed under Creative Commons Attribution (
              <ExternalLink href={LICENSE_URL}>{LICENSE_TEXT}</ExternalLink>).
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
