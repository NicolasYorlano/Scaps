import { lazy, Suspense } from 'react';

const Visor3D = lazy(() => import('../components/Visor3D'));

export default function Landing() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-950 px-6">
      <div style={{ width: 500, height: 500 }}>
        <Suspense fallback={null}>
          <Visor3D url="https://pub-6128219e47234ffb824474fa3df9636d.r2.dev/cap-vanarsdale.glb" />
        </Suspense>
      </div>
    </main>
  );
}

