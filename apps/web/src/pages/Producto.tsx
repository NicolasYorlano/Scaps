import { useParams } from 'react-router';

export default function Producto() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-950 px-6">
      <h1 className="text-3xl font-semibold text-slate-50">Producto: {slug}</h1>
    </main>
  );
}
