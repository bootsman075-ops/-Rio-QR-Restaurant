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

## Personeel en Management

Er zijn twee volledig gescheiden omgevingen, elk met een eigen login, eigen sessie-cookie en eigen dashboard. De gedeelde schermen staan in `src/components/dashboard/`; de routes in `src/app/staff` en `src/app/management` zijn dun en controleren zelf het recht.

| Omgeving   | Login               | Wachtwoord                   | Sessie-cookie         | Dashboard     |
| ---------- | ------------------- | ---------------------------- | --------------------- | ------------- |
| Personeel  | `/staff/login`      | `STAFF_DASHBOARD_PASSWORD`   | `rio_staff_session`   | `/staff`      |
| Management | `/management/login` | `MANAGER_DASHBOARD_PASSWORD` | `rio_management_session` | `/management` |

- Elke login accepteert alleen het eigen wachtwoord. Inloggen in de ene omgeving beëindigt een sessie van de andere rol in dezelfde browser.
- De twee wachtwoorden moeten verschillen; zijn ze gelijk, dan weigeren beide logins ("niet correct geconfigureerd").
- Sessietokens zijn versie-gebonden (`src/lib/staff-auth.ts`). Sessies uit eerdere versies, waaronder de oude gedeelde login en de cookie `rio_manager_session`, zijn ongeldig: iedereen logt na die wijziging één keer opnieuw in. Een versielabel ophogen dwingt dat opnieuw af voor die rol.
- Een personeelssessie geeft nooit toegang tot `/management`; personeel wordt dan server-side teruggestuurd naar `/staff`.
- Een managementsessie mag ook alle personeelsfuncties gebruiken (ook via `/staff`).
- Rechtsboven staat "Ingelogd als Personeel" of "Ingelogd als Management", met een knop om uit te loggen.

Routes:

- **Personeel:** `/staff` (tafelverzoeken: "Bediening roepen" en "Rekening aanvragen"), `/staff/reserveringen`.
- **Management:** `/management` (overzicht met cijfers van vandaag), `/management/tafelverzoeken`, `/management/reserveringen`, `/management/menu`. Het oude adres `/staff/menu` verwijst door naar `/management/menu`.
- Nieuwe beheeronderdelen: voeg de route toe onder `src/app/management/`, een recht in `src/lib/permissions.ts` en een menu-item in `src/components/dashboard/areas.ts`.

Reserveringen worden ingevoerd en getoond in de tijdzone van het restaurant (bestaande tabel `reservations`).

| Recht (`src/lib/permissions.ts`) | Wat                                                        | Personeel | Management |
| -------------------------------- | ---------------------------------------------------------- | :-------: | :--------: |
| `requests.handle`                | Tafel- en rekeningverzoeken bekijken en afhandelen         | ✓         | ✓          |
| `reservations.manage`            | Reserveringen bekijken, toevoegen, wijzigen, status, annuleren | ✓     | ✓          |
| `reservations.delete`            | Geannuleerde reserveringen definitief verwijderen          |           | ✓          |
| `management.access`              | De omgeving `/management`                                  |           | ✓          |
| `menu.manage`                    | Volledig menubeheer: gerechten, prijzen, afbeeldingen, allergenen, kenmerken, beschikbaarheid, volgorde, categorieën |  | ✓ |

Management heeft automatisch álle rechten, ook rechten die later worden toegevoegd. Elke pagina, route handler en Server Action controleert het recht op de server met `requirePermission()`; knoppen verbergen is alleen voor het gemak.

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
