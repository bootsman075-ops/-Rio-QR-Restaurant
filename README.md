# Rio QR Restaurant

Beheerportaal voor restaurants met tafelbeheer, reserveringen, gastnamen, een digitale menukaart en vervangbare QR-codes per tafel.

**Eerste pilot:** Rio, Deventer (25 tafels).

## Techniek

- [Next.js](https://nextjs.org) 16 (App Router), React 19
- TypeScript
- Tailwind CSS 4
- [Supabase](https://supabase.com) (database, authenticatie) via `@supabase/supabase-js` en `@supabase/ssr`

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
| `STAFF_DASHBOARD_PASSWORD`             | Login personeel          |
| `MANAGER_DASHBOARD_PASSWORD`           | Login manager (optioneel) |

## Projectstructuur

```
src/
  app/              Routes (App Router), layouts en pagina's
  components/
    ui/             Herbruikbare UI-componenten
  lib/              Hulpfuncties en configuratie (site.ts)
    supabase/
      client.ts     Browser-client (Client Components, RLS geldt)
      server.ts     Server-client met cookies (namens ingelogde gebruiker, RLS geldt)
      admin.ts      Server-only client met secret key (omzeilt RLS)
      env.ts        Uitlezen en valideren van omgevingsvariabelen
  types/
    database.ts     Databasetypes (later te genereren met de Supabase CLI)
    models.ts       Leesbare aliassen: Restaurant, RestaurantTable, MenuItem, ...
supabase/
  migrations/       SQL-migraties voor het databaseschema
  seed.sql          Pilotdata: Rio Deventer met 25 tafels en QR-tokens
public/             Statische bestanden
```

## Datamodel

Alle tabellen hangen via `restaurant_id` aan een restaurant, zodat meerdere restaurants naast elkaar kunnen bestaan. Samengestelde foreign keys voorkomen dat bijvoorbeeld een QR-token of reservering naar een tafel van een ander restaurant verwijst.

| Tabel           | Inhoud                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| `restaurants`   | Restaurant (slug, naam, plaats, tijdzone)                                |
| `tables`        | Tafels; `number` uniek per restaurant, optioneel label, stoelen, zone    |
| `qr_tokens`     | Vervangbare QR-tokens; max. één actief per tafel, oude worden ingetrokken |
| `menu_sections` | Rubrieken van de menukaart, met volgorde en zichtbaarheid                |
| `menu_items`    | Gerechten/dranken; prijs in centen, allergenen, labels, beschikbaarheid  |
| `reservations`  | Reserveringen met gastnaam, aantal personen, tijd, status, optioneel tafel |

Een QR-code bevat alleen een willekeurige token, nooit het tafel-ID. Met de databasefunctie `rotate_qr_token(table_id)` wordt de oude token ingetrokken en een nieuwe aangemaakt.

Row Level Security staat aan op alle tabellen, nog zonder policies: tot de authenticatie er is, heeft alleen de server (met de secret key) toegang.

### Database opzetten

De migraties in `supabase/migrations/` in volgorde uitvoeren, daarna `supabase/seed.sql` voor de pilotdata. Dit kan via de Supabase CLI (`supabase db push`) of door de bestanden in de SQL Editor van het Supabase-dashboard te plakken. De seed kan veilig vaker gedraaid worden.

## Personeelsdashboard

Inloggen via `/staff/login`. Er zijn twee rollen, bepaald door het wachtwoord:

- **Personeel** — `STAFF_DASHBOARD_PASSWORD`: de dagelijkse operationele functies.
- **Management** — `MANAGER_DASHBOARD_PASSWORD` (optioneel; moet verschillen van het personeelswachtwoord): alles inzien en aanpassen.

De rol staat rechtsboven in het dashboard ("Ingelogd als Personeel/Management"), met een knop om uit te loggen. Het menu bovenaan toont alleen de onderdelen waar de gebruiker recht op heeft:

- **Tafelverzoeken** (`/staff`) — live meldingen "Bediening roepen" en "Rekening aanvragen".
- **Reserveringen** (`/staff/reserveringen`) — reserveringen bekijken, toevoegen, wijzigen, status aanpassen en annuleren; filteren op datum en status. Gebruikt de bestaande tabel `reservations`; datum en tijd worden in de tijdzone van het restaurant ingevoerd en getoond.
- **Menu beheren** (`/staff/menu`) — alleen management; wijzigingen zijn direct zichtbaar op de menukaart voor gasten.

| Recht (`src/lib/permissions.ts`) | Wat                                                        | Personeel | Management |
| -------------------------------- | ---------------------------------------------------------- | :-------: | :--------: |
| `requests.handle`                | Tafel- en rekeningverzoeken bekijken en afhandelen         | ✓         | ✓          |
| `reservations.manage`            | Reserveringen bekijken, toevoegen, wijzigen, status, annuleren | ✓     | ✓          |
| `reservations.delete`            | Geannuleerde reserveringen definitief verwijderen          |           | ✓          |
| `menu.manage`                    | Volledig menubeheer: gerechten, prijzen, afbeeldingen, allergenen, beschikbaarheid, volgorde, categorieën |  | ✓ |

Management heeft automatisch álle rechten, ook rechten die later worden toegevoegd. Elke pagina en elke Server Action controleert het recht op de server met `requirePermission()`; knoppen verbergen is alleen voor het gemak.

Afbeeldingen worden in de browser verkleind (max. 1600 px) en opgeslagen in de Supabase Storage-bucket `menu-images` (migratie `20261001120000_menu_images_bucket.sql`).

| Status in de app | Waarde in de database |
| ---------------- | --------------------- |
| Nieuw            | `pending`             |
| Bevestigd        | `confirmed`           |
| Gearriveerd      | `seated`              |
| Afgerond         | `completed`           |
| Geannuleerd      | `cancelled`           |

## Fases

1. **Projectbasis** — Next.js, TypeScript, Tailwind, structuur en documentatie ✅
2. **A** — Supabase-clients, databaseschema, migraties en types ✅
   **B** — Koppeling met een echt Supabase-project, migraties uitvoeren, authenticatie
3. Tafelbeheer en QR-codes (vervangbaar per tafel)
4. Digitale menukaart (gastweergave via QR)
5. Reserveringen en gastnamen
6. Pilot Rio Deventer: inrichting, testen en livegang
