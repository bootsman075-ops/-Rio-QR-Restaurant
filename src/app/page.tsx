import { siteConfig } from "@/lib/site";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl space-y-6">
        <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Fase 1 · Projectbasis
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          {siteConfig.name}
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {siteConfig.description}
        </p>
        <p className="text-sm text-zinc-500">
          Eerste pilot: Rio, Deventer — 25 tafels.
        </p>
      </div>
    </main>
  );
}
