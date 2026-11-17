# Rio reserveringsmodule — gecontroleerde release (17 november 2026)

## Gebouwd en gecontroleerd
- Gastpagina /reserveren/rio-deventer: mobiel luxe design, twee stappen, naam/email/telefoon verplicht.
- Iedere nieuwe reservering is een **aanvraag** (pending), nooit direct een gegarandeerde tafel.
- Optionele, expliciete toestemming voor voornaam op de gedeelde tafel-QR. Alleen bij een bevestigde/gearriveerde reservering, gekoppelde tafel en gedurende het bezoek.
- Management/Personeel op één inlogpagina met rollencontrole; switch in beide dashboards. Personeel kan niet via de tab managementrechten verkrijgen.
- Wachtwoordaanmelding zonder MFA voor restaurantaccounts. Platformadministratie vereist MFA.
- Supabase hersteld naar ACTIVE_HEALTHY.
- Supabase-migraties toegepast voor toestemming, QR-greeting, tenant-geïsoleerde AAL1-toegang en service-only atomic rate limiting.
- SQL test met volledig teruggedraaide testreservering verifieerde QR: opt-in zichtbaar, opt-out onzichtbaar, pending onzichtbaar, geen tafel onzichtbaar. Geen blijvende testdata.
- SQL AAL1-tests voor manager en staff + cross-tenant restaurant- en reserveringsisolatie geslaagd.
- Rate-limit transactietest geslaagd, directe RPC niet toegankelijk voor anon of authenticated.
- Security GitHub Actions: contracttests, lint, Next.js build en strenge volledige dependency audit geslaagd.
- Oude ontwikkel-advisory GHSA-vfj7-8cjw-p6xm is officieel door GitHub ingetrokken; uitzondering vervangen door strikte npm-audit.

## Beperkingen en nazorg
- Gastverzoek bevestigt geen beschikbaarheid; management moet aanvraag afhandelen en een tafel toewijzen.
- E-mail/SMS-bevestiging wordt nog niet automatisch verzonden.
- Datum/tijd zijn voorkeuren, restauranturen en automatische capaciteitscontrole nog niet geïntegreerd.
- Formulier toont verwerkingsinformatie, maar voor volledige AVG-informatieplicht moet R.I.O. eigen juridische privacyverklaring/contact- en bewaartermijnen bevestigen.
- Er staan nog geen eigen culinaire menu-afbeeldingen voor Rio in de database; fallback fotografie wordt gebruikt.
- Geen praktijklogin uitgevoerd zonder gebruikerswachtwoorden. Doe een echte management/staff aanmelding en tafel-QR-scantest na publicatie.
- Wijziging geldt voor restaurantmanagement en personeel; platformbeheerders behouden MFA.
