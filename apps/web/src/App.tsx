import Visor3D from './components/Visor3D';

export default function App() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6">
<div 
          className="relative flex w-full max-w-5xl flex-col items-center justify-center border-4 border-slate-950 bg-slate-900 shadow-2xl overflow-hidden rounded-3xl" // <--- Agregado rounded-3xl aquí
          style={{ minHeight: '65vh' }}
        >
          {}
          <div className="absolute inset-0 z-0">
            <Visor3D />
          </div>
      </div>
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 text-center shadow-lg">
        <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          Scaffold OK
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-slate-50">Scaps</h1>
        <p className="mt-2 text-sm text-slate-400">
          React + Vite + TypeScript + Tailwind v4
        </p>
      </div>
    </main>
  );
}
