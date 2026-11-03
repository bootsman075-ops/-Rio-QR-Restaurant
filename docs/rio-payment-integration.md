# RIO QR — voorbereiding online betalingen

Status: **NIET geactiveerd**. Er is nog geen provider, account, API-sleutel,
webhook of werkende betaalpagina gekoppeld. **Gasten kunnen niet online betalen.**

## Bestaande situatie
- QR-code identificeert de tafel; gerechten en prijzen worden bij het aanmaken
  van de bestelling server-side uit Supabase gecontroleerd.
- \`qr_orders.payment_status\` blijft **unpaid** totdat een manager handmatig
  \`mark_paid\` gebruikt. Er is geen kassakoppeling.
- Nieuwe databasegrondslag:
  - \`qr_payment_settings\`: per restaurant provider, test/live en schakelaars.
  - \`qr_payment_attempts\`: 1 bestelling kan meerdere gecontroleerde pogingen
    hebben; order-/restaurantkoppeling, bedrag EUR, provider-ID en idempotentiesleutel.
  - \`qr_payment_events\`: alleen *geverifieerde* webhooks, event-ID uniek per provider,
    checksum zonder ruwe kaart- of betalingsgegevens.
- **Geen INSERT/UPDATE/DELETE voor browseraccounts of gasten**, alleen een
  strikt afgeschermde management-SELECT met AAL2 en actieve restaurantrol.
- \`getQrPaymentProvider()\` gooit bewust een fout: geen stilzwijgende fallback.

## Aansluiten zodra een provider gekozen is
1. Controleer betaalprovider, iDEAL/Wero-kaartondersteuning, kosten, refunds,
   test/live merchant account, benodigde callback-URL's en eventuele POS-koppeling.
2. Implementeer een server-only \`QrPaymentProviderAdapter\` voor
   \`createCheckout\`, \`verifyWebhookSignature\` en \`getPaymentStatus\`.
   Bewaar API-sleutels **uitsluitend** als Vercel-serversecret (nooit in database,
   source control of browser). Gebruik afzonderlijke test-/live-credentials.
3. Maak een beveiligde checkout-API die de QR-tafel, restaurantkoppeling,
   bedrag vanuit *de opgeslagen order* en eigenaar van de bestelactie controleert.
   Een publiek order-ID alleen is **geen autorisatiebewijs**. Leg voor checkout
   een aparte niet-radenbare geheime bestelsessie vast. Rate-limit per IP/tafel.
   Gebruik de idempotentiesleutel voor retries en geen checkout voor geannuleerde
   of al betaalde bestellingen.
4. Maak daarna provider-specifieke webhookroute(s) met **ruwe payload**,
   verplichte cryptografische handtekeningcontrole, API-herbevestiging waar nodig,
   uniek event-ID en atomaire transactie. Controleer tenant, order, currency,
   exact bedrag, bestaande eerdere betalingen en statusovergang.
   **Een terugkeer naar de success-URL is nooit betalingsbevestiging.**
5. Alleen een **bevestigd** (geauthenticeerd) betaalresultaat markeert
   \`qr_payment_attempts.status='succeeded'\` en
   \`qr_orders.payment_status='paid'\` inclusief \`paid_at\`, atomair.
   Maak afzonderlijke refundverwerking en consistentie met rapportages.
   Vermijd dubbele \`paid\` markeringen en overlap met bestaande handmatige
   markeringen. Test dubbele events, retries, late callbacks, refunds,
   mislukte betalingen, verkeerde bedragen en tenantgrenzen.
6. Activeer pas na een volledige sandbox- en echte minimale betaalproef,
   controles van de opbrengsten en expliciete operationele toestemming.
   Laat het afgeschermde management scherm provider, mode, status en
   betaalpogingen tonen. \`checkout_enabled\` blijft nu bewust \`false\`.

## Niet klaar / niet inbegrepen
- Geen gekozen betaalprovider; geen betaallink, QR-betalingsknop of webhook.
- Geen online afschrijving, facturen, pinapparaat of restaurant-kassakoppeling.
- Bestaande handmatig gemarkeerde betalingen zijn geen geverifieerde afschrijvingen.

Opzet is multi-tenant. Nieuwe betaalpogingen en events kunnen later uitsluitend
vanuit een server-side providerkoppeling (service role) geschreven worden.
