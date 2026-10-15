# Rio QR – Beveiligingscontrole en criteria voor livegang
Datum: 2026-10-15

## Vastgesteld in de code
- Persoonlijke Supabase Auth-accounts, restaurantrollen en platform_admin zijn uitgewerkt op `security/multitenant-hardening`.
- Login op `/login` leidt naar `/security/mfa`, waarna een geverifieerde `aal2`-sessie toegang krijgt tot de beheercontext.
- `/forgot-password` vraagt herstel per e-mail aan; `/auth/callback` staat uitsluitend `/reset-password` of `/auth/set-password` toe.
- `/reset-password` laat gebruikers een nieuw wachtwoord van minimaal 12 tekens instellen en meldt ze na de wijziging af.
- De nieuwe SQL-migratie verplicht `aal2` op afgeschermde tabellen voor de `authenticated`-rol, aanvullend op restaurant- en rolbeperkingen.
- Gasten met de `anon`-rol blijven via QR-codes en de toegestane publieke menu-API toegang houden; de echte werking moet met de database getest worden.
- Een tweede authenticator is de door Supabase officieel ondersteunde MFA-herstelmethode. Recovery codes worden door Supabase Auth **niet** ondersteund. Er is daarom geen knop of schakelaar voor onbewezen herstelcodes.

## Niet bewezen / blokkades
1. Het gekoppelde Supabase-project `tiylplysdpvikexptedp` meldt status `INACTIVE`; database-RLS, accountlijst en echte authenticatiestromen kunnen niet integraal worden geverifieerd.
2. Controleer of Vercel-productie naar dezelfde Supabase-omgeving verwijst; alleen servicenaam en de juiste geheime omgevingsvariabelen controleren, nooit sleutels kopiëren in PR of chat.
3. Stel in Supabase Auth Site URL, toegestane callback-URL(s), e-mailsjablonen, SMTP, e-mailbevestiging, password policy en rate limits in.
4. Vergelijk bestaande gebruikers en rollen vóór migraties of nieuwe uitnodigingen; wijzig de enige platformbeheerder niet blindelings.
5. Supabase's `MFA`- en `RLS`-onderdelen kunnen pas end-to-end getest worden als het project bereikbaar is.
6. Een geslaagde Vercel-build bewijst niet dat inloggen, e-mail of databasebeveiliging werken.

## Tests verplicht vóór productie
| Test | Verwacht |
|---|---|
| Platformbeheerder: e-mail + wachtwoord | Alleen login, nog geen platformgegevens |
| Platformbeheerder: TOTP 6 cijfers | Geldige code geeft `aal2` en toegang `/platform` |
| Platformbeheerder: foutieve TOTP / verlopen sessie | Geen toegang en geen uitlek van data |
| Restaurant-eigenaar / manager (restaurant A) | Eigen menukaart, reserveringen en tafelverzoeken; geen data van B |
| Personeel (restaurant A) | Eigen operationele taken, geen platform- of menubeheer |
| Gebruiker restaurant B | Geen toegang tot alle privégegevens van A, ook niet via REST/RPC |
| AAL1 token direct naar PostgREST | Geen privédata zichtbaar of wijzigbaar |
| Gast zonder login met geldige QR | Publieke menukaart en tafelactie werken |
| Ongeldige / ingetrokken QR | Geen toegang of nieuwe tafelverzoeken |
| Reset voor bestaand account | Geldige mail, terugkeer naar juiste URL, nieuw wachtwoord, oude niet meer geldig |
| Reset voor onbekend e-mailadres | Geen account-enumeratie via de UI |
| Verlopen/hergebruikte resetlink | Geen wijziging mogelijk |
| MFA backup authenticator | Tweede factor toevoegen na AAL2 en zelfstandig testen op ander apparaat |
| Verlies alle authenticators | Alleen gecontroleerd herstel na identiteitsverificatie door bevoegde beheerder; nog uit te werken |
| Account geblokkeerd / restaurant gedeactiveerd | Toegang geweigerd na tokenverversing en op gevoelige acties |
| Systeem bij database-uitval | Geen privileged access; duidelijke foutmeldingen |
| CI | Lint en Next.js-build zonder fouten |
| Productiecontrole | Geen secrets in frontend; geen ongecontroleerde secret-key routes; passende headers en back-up |

## Publicatiebesluit
**NO-GO.** Niet mergen naar productie of database migreren totdat de database actief en gekoppeld is, account- en RLS-tests zijn uitgevoerd, de herstelmails zijn geverifieerd en alle drie de gebruikersrollen getest zijn.

Wijzigingen bevinden zich alleen op `security/account-recovery-mfa-20261015` en worden als draft PR aangeboden.


## Gecontroleerde resultaten (2026-10-15)
- GitHub Actions lint: **geslaagd**.
- Next.js productiebouw incl. TypeScript: **geslaagd**.
- Vercel security-branch preview: **READY**; dit is geen bewijs dat de browserlogin of database werkt.
- `npm audit --omit=dev --audit-level=high`: **geslaagd**, geen hoge kwetsbaarheden in de geïnstalleerde productieafhankelijkheden.
- `npm audit --audit-level=high`: **niet geslaagd**, 5 hoge meldingen via `eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces@3.0.3`. De keten is `dev: true` in het lockbestand. Officieel is er nog geen gepatchte `braces`-versie; een voorgestelde force-downgrade van de Next-lintconfiguratie is bewust niet toegepast. Audit blijft daarom falen zodat dit zichtbaar is.
- Framework `next` en `eslint-config-next` bijgewerkt van 16.3.7 naar 16.4.1; `source-map-js` staat nu op 1.2.2.
- Het tijdelijke workflow-bestand voor de dependency-update is na de geslaagde lockfilewijziging verwijderd.

### Aanvullende testbehoefte
- Voer een echte database-RLS-test uit met `aal1` en `aal2` JWT's, twee restaurants en alle rollen.
- Verifieer dat een gast zonder account een geldige QR-code kan gebruiken, dat ongeldige QR-codes worden geweigerd en dat misbruik van publieke tafelverzoeken is begrensd.
- Controleer herstelmails en de e-mail-SMTP, plus zowel geldige als verlopen herstel- en uitnodigingslinks.
- Test het registreren van twee authenticatoren op afzonderlijke apparaten; standaard herstelcodes zijn niet door Supabase Auth ondersteund.
- Een administratieve herstelprocedure bij verlies van alle authenticators vereist strenge identiteitsverificatie, logging en notificatie; deze procedure is nog niet gebouwd en mag niet worden voorgesteld als werkend.

**Livebesluit blijft NO-GO:** de status van Supabase is `INACTIVE`, de databasewijziging is niet toegepast en een echte browser-/accounttest met de drie rollen ontbreekt.


## Hercontrole 15 oktober 2026 – account recovery en database
- Het herstelverzoek voor het bestaande Supabase-project `tiylplysdpvikexptedp` is **geaccepteerd** (`success: true`). De laatst geobserveerde status was `COMING_UP`, dus dit is **nog geen bevestiging** dat de database weer bruikbaar is.
- Zolang het project niet `ACTIVE` is, zijn lege tabellijsten, lege migratielijsten en security-advisor-resultaten **geen sluitend bewijs** over het databasemodel of de beveiliging.
- Vercel toont een `READY`-preview voor commit `4b27a5571eb7b089c292d7ad4d29525cc33bbb55` op de beveiligingstak; `target: null` betekent geen bevestigde productie-uitrol.
- GitHub Actions op dezelfde commit: `npm ci`, ESLint, Next.js-build en productieafhankelijkhedenaudit geslaagd; **volledige dependency-audit gefaald** op ontwikkelafhankelijkheden. CI blijft rood; niet stilzwijgend negeren.
- **Nieuw gevonden blocker:** `/reset-password` laat `updateUser({ password })` ook toe als slechts een bestaande gebruikerssessie is vastgesteld (`getUser()`), zonder bewijs van een *recente* geldige herstelactie of AAL2. De serveractie `/auth/set-password/actions.ts` laat eveneens een bestaande sessie met AAL1 toe. Daardoor is de wachtwoordwijziging niet aantoonbaar met MFA of een eenmalige, specifiek voor herstel bedoelde capability afgeschermd. Herontwerp en test beide routes (inclusief geldige/verlopen/hergebruikte resetlink, invites, bestaande gebruikers, MFA, sessiediefstal) vóór livegang.
- **NO-GO blijft van kracht**: geen migraties of account-/rolwijzigingen toepassen voordat herstel en tests van de echte database, veilige recovery flows en autorisatie aantoonbaar slagen.
