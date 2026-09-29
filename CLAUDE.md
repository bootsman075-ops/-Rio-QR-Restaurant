@AGENTS.md

# Rio QR Restaurant

MVP voor een horeca-beheerportaal: tafels, reserveringen, gastnamen, digitale menukaart en vervangbare QR-codes per tafel. Eerste pilot: Rio in Deventer, 25 tafels.

## Werkwijze

- Werk in fases (zie README.md). Bouw alleen wat in de huidige fase is afgesproken en stop na elke fase met een korte samenvatting zodat de gebruiker kan controleren.
- Installeer geen systeemtools automatisch; meld wat ontbreekt.
- Communiceer met de gebruiker in het Nederlands. Code, identifiers en commits in het Engels; UI-teksten in het Nederlands.

## Stack

- Next.js 16 (App Router, `src/`-map), React 19, TypeScript (strict)
- Tailwind CSS 4 (configuratie via `@theme` in `src/app/globals.css`, geen `tailwind.config`)
- Supabase voor database en auth
- Import-alias: `@/*` → `src/*`
- Package manager: npm

## Structuur

- `src/app` — routes; gebruik route groups `(naam)` om bv. admin- en gastgedeelte te scheiden
- `src/components/ui` — herbruikbare componenten
- `src/lib` — hulpfuncties en config
- `src/lib/supabase` — `client.ts` (browser), `server.ts` (server, cookies, async), `admin.ts` (secret key, omzeilt RLS; alleen voor vertrouwde servercode en altijd zelf op `restaurant_id` filteren)
- `src/types/database.ts` — databasetypes; bij elke schemawijziging bijwerken (of regenereren met `supabase gen types`). Gebruik `type`, geen `interface`
- `src/types/models.ts` — aliassen zoals `Restaurant`, `RestaurantTable`
- `supabase/migrations` — SQL-migraties (`YYYYMMDDHHMMSS_naam.sql`); schemawijzigingen altijd via een nieuwe migratie, bestaande migraties niet aanpassen nadat ze zijn uitgevoerd
- `supabase/seed.sql` — idempotente pilotdata (Rio Deventer, 25 tafels)

## Datamodel-regels

- Multi-tenant: elke tabel heeft `restaurant_id`. Kindtabellen verwijzen via samengestelde FK `(restaurant_id, x_id)` zodat relaties binnen één restaurant blijven.
- Prijzen in centen (`price_cents`), tijden als `timestamptz`.
- QR-codes bevatten een token uit `qr_tokens`; vervangen via `rotate_qr_token(table_id)`.

## Beveiliging

- Nooit wachtwoorden, API-keys of geheimen in bestanden die in git komen. Echte waarden alleen in `.env.local`; nieuwe variabelen documenteren in `.env.example` (leeg) en README.md.
- `SUPABASE_SECRET_KEY` alleen server-side gebruiken; nooit met `NEXT_PUBLIC_`-prefix.
- Row Level Security aan op alle Supabase-tabellen.
- QR-codes verwijzen naar een vervangbare token, niet naar een vast tafel-ID, zodat een code ingetrokken kan worden.

## Commando's

- `npm run dev` — ontwikkelserver
- `npm run build` — productiebuild (gebruik als controle na wijzigingen)
- `npm run lint` — ESLint
