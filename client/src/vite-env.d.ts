/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute origin of the API in production (e.g. https://ecosphere-api.vercel.app). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
