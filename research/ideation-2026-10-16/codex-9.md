**(a) What I want before acting**

Give me a trip-specific briefing: origin, destination, transit countries, travel dates and traveller nationality/residency. Tell me what could block entry, invalidate a connection, close an attraction or change the payable total. Every fact needs `source_url`, `checked_at`, `effective_from/to`, geographic scope and an explicit `unknown` state.

**(b) What I lack today**

Your timezone and UK-holiday coverage helps, but I still lack destination closures, traveller-specific entry requirements, disruption intelligence and bookable inventory. A timezone identifier alone doesn’t flag an ambiguous local departure time; a displayed price doesn’t guarantee seats.

**(c) My top five additions**

1. **`entry_and_local_rules`** — passport validity, visas, transit requirements, restricted medicines and local restrictions. **Source:** [GOV.UK Content API](https://www.gov.uk/help/reuse-govuk-content), free, no account, commercial reuse under OGL; advice primarily serves British travellers. Universal nationality coverage: **unknown**.

2. **`destination_calendar`** — regional public holidays, observed dates, school breaks and exceptional closures. Comprehensive global source meeting all three conditions: **unknown**.

3. **`opening_and_access`** — attraction hours, seasonal closures, wheelchair access and reservation requirements. **Source:** [OpenStreetMap](https://wiki.openstreetmap.org/wiki/License/Use_Cases), free, account-free data access, commercial use under ODbL; coverage varies.

4. **`weather_disruption`** — alerts, affected areas and validity windows. **Source:** [US National Weather Service API](https://www.weather.gov/documentation/services-web-api), free, no account, commercial-OK; US coverage.

5. **`live_offer`** — remaining inventory, total taxes/fees, baggage, cancellation terms and quote expiry. Free, no-account, commercial-OK live booking source: **unknown**.