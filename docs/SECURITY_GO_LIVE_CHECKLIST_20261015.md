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
