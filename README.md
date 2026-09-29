# Rio QR Restaurant

Beheerportaal voor restaurants met tafelbeheer, reserveringen, gastnamen, een digitale menukaart en vervangbare QR-codes per tafel.

**Eerste pilot:** Rio, Deventer (25 tafels).

## Techniek

- [Next.js](https://nextjs.org) 16 (App Router), React 19
- TypeScript
- Tailwind CSS 4
- [Supabase](https://supabase.com) (database, authenticatie) — wordt gekoppeld in een volgende fase

## Aan de slag

Vereisten: Node.js 20+ (getest met v24) en npm.

```bash
npm install
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open daarna <http://localhost:3000>.

### Scripts

| Commando        | Doel                         |
| --------------- | ---------------------------- |
| `npm run dev`   | Ontwikkelserver starten      |
| `npm run build` | Productiebuild maken         |
| `npm run start` | Productiebuild draaien       |
| `npm run lint`  | Code controleren met ESLint  |

## Omgevingsvariabelen

Zie `.env.example`. Echte waarden horen alleen in `.env.local`, dat niet in git wordt opgenomen.

| Variabele                              | Waar gebruikt            |
| -------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_SITE_URL`                 | Basis-URL voor QR-links  |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser + server         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server         |
| `SUPABASE_SECRET_KEY`                  | Alleen server-side       |

## Projectstructuur

```
src/
  app/              Routes (App Router), layouts en pagina's
  components/
    ui/             Herbruikbare UI-componenten
  lib/              Hulpfuncties en configuratie (site.ts)
    supabase/       Supabase-clients (volgt in fase 2)
  types/            Gedeelde TypeScript-types
supabase/
  migrations/       SQL-migraties voor het databaseschema
public/             Statische bestanden
```

## Fases

1. **Projectbasis** — Next.js, TypeScript, Tailwind, structuur en documentatie ✅
2. Supabase-koppeling, databaseschema en authenticatie
3. Tafelbeheer en QR-codes (vervangbaar per tafel)
4. Digitale menukaart (gastweergave via QR)
5. Reserveringen en gastnamen
6. Pilot Rio Deventer: inrichting, testen en livegang
