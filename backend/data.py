"""Evidence and recommendations for the first public-research snapshot.

Claims in this file are dated, link-backed observations from public pages. Items
which need owner or crawler access are deliberately represented as unknown.
"""
RESEARCHED_ON = "2026-11-14"

PROFILE = {
    "name": "Piccolo Caratello",
    "address": "8 Rue Audran, 75018 Paris, France",
    "website": "https://pizzacaratello.com/",
    "area": "Abbesses, Montmartre · Paris 18e",
    "cuisine": "Italian · pizza, pasta, risotto",
    "audiences": ["Local residents", "Paris visitors", "International guests"],
    "services": ["Dine in", "Takeaway", "Online ordering", "Table booking"],
    "verified_at": RESEARCHED_ON,
}

SOURCES = [
    {"id": "site-fr", "label": "Restaurant · French home page", "url": "https://pizzacaratello.com/", "kind": "Restaurant website", "checked_at": RESEARCHED_ON},
    {"id": "site-en", "label": "Restaurant · English page", "url": "https://pizzacaratello.com/en", "kind": "Restaurant website", "checked_at": RESEARCHED_ON},
    {"id": "google-seo", "label": "Google Search Central · SEO starter guide", "url": "https://developers.google.com/search/docs/fundamentals/seo-starter-guide", "kind": "Google documentation", "checked_at": RESEARCHED_ON},
    {"id": "google-local", "label": "Google Business Profile · Improve local ranking", "url": "https://support.google.com/business/answer/7091", "kind": "Google documentation", "checked_at": RESEARCHED_ON},
    {"id": "google-schema", "label": "Google Search Central · Local business structured data", "url": "https://developers.google.com/search/docs/appearance/structured-data/local-business", "kind": "Google documentation", "checked_at": RESEARCHED_ON},
    {"id": "gsc", "label": "Google Search Console", "url": "https://search.google.com/search-console/", "kind": "Future data connection", "checked_at": RESEARCHED_ON},
]

OBSERVATIONS = [
    {"id": "title", "category": "Website", "title": "Search snippet and page title", "status": "observed", "observation": "The public page presents the business as a pizzeria in Montmartre / Paris 18e. A browser-level title-tag and description check is still required; search result wording alone does not confirm the HTML metadata.", "evidence": "French and English page headings", "source_ids": ["site-fr", "site-en"]},
    {"id": "content", "category": "Website", "title": "Useful menu and intent content", "status": "observed", "observation": "The French page shows named dishes and prices, order links, a booking path, address, phone and opening hours. This gives visitors several decision and conversion details on one page.", "evidence": "Public home page content", "source_ids": ["site-fr"]},
    {"id": "language", "category": "Website", "title": "English landing page exists", "status": "observed", "observation": "An English page describes the location, dine-in and takeaway, menu sections, selected dishes, hours and booking. Verify language switch links and that every key menu/contact page has a complete English version.", "evidence": "English page content", "source_ids": ["site-en"]},
    {"id": "mobile", "category": "Technical", "title": "Mobile usability", "status": "unknown", "observation": "Not measured in this research snapshot. Check booking, menu PDF, tap targets, text sizing and Core Web Vitals on a real mobile device before making a technical claim.", "evidence": "No mobile lab or field test performed", "source_ids": []},
    {"id": "schema", "category": "Technical", "title": "Restaurant structured data", "status": "unknown", "observation": "JSON-LD / Restaurant markup was not verified from page source. Inspect the rendered HTML and Rich Results Test; add or correct it only after checking the current markup.", "evidence": "Source code not inspected", "source_ids": ["google-schema"]},
    {"id": "gbp", "category": "Local discovery", "title": "Google Business Profile completeness", "status": "partial", "observation": "The site displays a Google review summary, contact details, hours and a map/access link. Profile categories, attributes, photo freshness, menu URL, description and owner access were not independently verified.", "evidence": "Restaurant website only; profile access unavailable", "source_ids": ["site-fr", "google-local"]},
]

KEYWORDS = [
    {"phrase": "pizzeria près du Sacré-Cœur", "language": "FR", "intent": "Nearby visit", "fit": "High", "rationale": "Connects the restaurant's Montmartre location with a clear meal need.", "volume": None, "rank": None},
    {"phrase": "restaurant italien Montmartre", "language": "FR", "intent": "Cuisine + area", "fit": "High", "rationale": "Matches the Italian menu and the neighborhood positioning already used on the site.", "volume": None, "rank": None},
    {"phrase": "pizzeria Paris 18", "language": "FR", "intent": "Local category", "fit": "High", "rationale": "Useful neighborhood/category phrase for the landing page and business profile.", "volume": None, "rank": None},
    {"phrase": "restaurant près de moi Montmartre", "language": "FR", "intent": "Immediate visit", "fit": "Medium", "rationale": "Maps and location signals matter for this local discovery intent.", "volume": None, "rank": None},
    {"phrase": "pizza near Sacré-Cœur", "language": "EN", "intent": "Tourist visit", "fit": "High", "rationale": "Useful English phrasing for visitors exploring the nearby landmark.", "volume": None, "rank": None},
    {"phrase": "Italian restaurant in Montmartre", "language": "EN", "intent": "Cuisine + area", "fit": "High", "rationale": "The existing English page already targets this cuisine and neighborhood pairing.", "volume": None, "rank": None},
    {"phrase": "pizza restaurant Paris 18", "language": "EN", "intent": "Local category", "fit": "Medium", "rationale": "Supports English-language local discovery; validate wording against Search Console queries.", "volume": None, "rank": None},
    {"phrase": "restaurant near Sacré-Cœur", "language": "EN", "intent": "Tourist visit", "fit": "High", "rationale": "A direct landmark + dining need worth covering in helpful location content.", "volume": None, "rank": None},
]

OPPORTUNITIES = [
    {"id": "gbp-checklist", "priority": "High", "opportunity": "Complete the Google Maps decision profile", "observation": "The website displays hours, contact details, map access and a review summary; the live profile's categories, attributes, photos and menu link are unverified.", "recommendation": "With owner access, confirm the primary category and services; add a direct menu and booking link, current exterior/menu photos, holiday hours, and an accurate description in French and English.", "benefit": "Makes it easier for nearby diners and visitors to decide and take the next step. Google says local results mainly reflect relevance, distance and prominence; no ranking outcome is promised.", "effort": "Low", "confidence": "Medium", "source_ids": ["site-fr", "google-local"]},
    {"id": "english-path", "priority": "High", "opportunity": "Strengthen the tourist-to-table path in English", "observation": "An English page exists, with address, hours, menu highlights and booking, alongside a language switch.", "recommendation": "Walk through the full booking, menu and directions journey in English on a phone; give the English page a clear menu/booking CTA and concise landmark directions.", "benefit": "Reduces uncertainty for international visitors already searching in English; measure clicks to booking and directions before and after.", "effort": "Low", "confidence": "Medium", "source_ids": ["site-en"]},
    {"id": "snippets", "priority": "Medium", "opportunity": "Check search snippets and local business markup", "observation": "Public page copy contains cuisine, neighborhood, menu items and contact details, but actual title/description tags and structured data were not verified.", "recommendation": "Inspect page HTML, then write a unique title and description for the home/menu pages and validate Restaurant schema for accurate name, address, phone, hours, menu and languages.", "benefit": "Helps search engines interpret the business and lets searchers see a more useful result; eligibility does not guarantee a rich result or rank change.", "effort": "Medium", "confidence": "Medium", "source_ids": ["site-fr", "google-seo", "google-schema"]},
    {"id": "query-data", "priority": "Medium", "opportunity": "Replace keyword guesses with actual query evidence", "observation": "Search demand and current rankings are unavailable in this public-only review. Keyword phrases below are hypotheses based on location, cuisine and audience.", "recommendation": "Connect Search Console with owner permission; review query impressions, clicks, CTR and landing pages by French/English intent before prioritizing new content.", "benefit": "Keeps time focused on searches the restaurant is actually appearing for; creates a baseline for monitoring.", "effort": "Low", "confidence": "High", "source_ids": ["gsc"]},
    {"id": "conversion", "priority": "Medium", "opportunity": "Measure the path from discovery to booking or order", "observation": "The website offers booking and third-party ordering links, but their click and completion data are not available here.", "recommendation": "Record baseline clicks for booking, phone, directions and delivery partners in GA4 or a privacy-appropriate analytics setup, then review weekly with actual bookings/orders.", "benefit": "Shows whether visibility improvements result in useful customer actions without guessing revenue.", "effort": "Medium", "confidence": "High", "source_ids": ["site-fr"]},
]
