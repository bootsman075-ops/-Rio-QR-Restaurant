# Rio gastreserveringen — ontwerp en veilige livegang (17 november 2026)

## Doel
Gastgerichte, mobiele boekingsflow in de stijl van de aangeleverde mockup:
donkere culinaire hero, R.I.O.-merk, serif-kop, zandkleurig formulier, twee rustige stappen,
subtiele animaties en duidelijke knop.

URL: `/reserveren/rio-deventer`.
De bestaande restaurantbeheer-reserveringen blijven ongewijzigd.
De Rio QR-menukaart krijgt een link naar de reserveringspagina.

## Gedrag
1. Gast kiest datum, tijd en maximaal 12 personen.
2. Gast voert naam, e-mail, telefoon en optionele toelichting in.
3. Server valideert uitsluitend restaurant-slug `rio-deventer`, actieve restaurantstatus,
   datum, tijd, lengte, telefoon, e-mail en eenvoudige honeypot.
4. Server controleert dubbele aanvragen met hetzelfde e-mailadres/tijdstip binnen tien minuten.
5. Server schrijft **pending** in bestaande `reservations` tabel, zonder tafel toe te wijzen.
6. De gast ziet uitsluitend **aanvraag ontvangen** en dat bevestiging door R.I.O. moet volgen.
7. Restaurant ziet de aanvraag via bestaand managementdashboard.

## Geen bewezen beschikbaarheid
Er is nog geen openingstijdenconfiguratie, tafelcapaciteit per tijdslot,
auto-acceptatie, gastmail of bevestigingsmail. Daarom: geen claim 'plek beschikbaar'
of 'tafel bevestigd'. De datum- en tijdselectie zijn voorkeuren.

## Nog noodzakelijk vóór productie
- Supabase project `tiylplysdpvikexptedp` is op 17 november INACTIVE.
  Formulier is fail-closed: knop wordt uitgeschakeld als restaurant niet bereikbaar is.
- Database herstellen en E2E testen met echte testaanvraag, zichtbaarheid op management,
  statuswijziging en controle op tenant-isolatie.
- Robuuste IP-gebaseerde rate-limiting/CAPTCHA, capaciteit/restauranturen en anti-spam
  toevoegen vóór publieke lancering. Honeypot plus duplicate window is onvoldoende.
- Verifieer toestemming/privacytekst/retentie van naam, telefoon, e-mail.
- Fotografie: standaard gebruikt een Unsplash-fallback. Vervang die voor livegang
  door een door de restauranthouder goedgekeurde eigen culinaire foto.
- Bestaande security PR #2 en wachtwoordherstelproblemen blijven afzonderlijke NO-GO's.
- Niet mergen naar main of publiceren voor klant zonder gebruikers- en beveiligingstest.
