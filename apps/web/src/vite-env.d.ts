/// <reference types="vite/client" />

// Declarar las variables acá las tipa como string en vez de any.
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
