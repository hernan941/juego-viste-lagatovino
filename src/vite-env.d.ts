/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Where "Volver a Lagatovino" goes (ADR 0023). Optional: defaults to https://lagatovino.com/ */
    readonly VITE_HOME_URL?: string;
}
