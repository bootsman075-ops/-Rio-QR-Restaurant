# RIO load/capacity audit — tijdelijke testbranch

Eenmalige read-only belastingstest. **Niet mergen naar productie.**

- Doel: gescheiden Vercel preview, niet het live domein.
- Geen POST-bestellingen, geen betaaltransacties, geen writes.
- QR-menu gebruikt (voorlopig) dezelfde Supabase als productie; de QR-test wordt daarom bewust beperkt.
- Login-scherm mag in de preview met maximaal 100 parallelle GET's worden getest.
- Foutdetectie met automatische abort op statusfouten, time-outs of te hoge responstijd.
- Resultaat: aantallen, doorvoer, p50/p95/p99, hoogste piek, HTTP codes en testbeperkingen.
- Na de test sluiten we de tijdelijke PR zonder te mergen.
