"""Automated check of the restaurant's public website.

Fetches every page listed in the sitemap and records what is actually there:
titles, descriptions, languages, structured data, links guests rely on.
Nothing is guessed; a check that cannot be verified is reported as "unknown".

Run from the repository root:

    python -m backend.collect.site_check

The result is written to backend/snapshot/site_check.json, which the API and
the dashboard both read. Only the Python standard library is used.
"""
from __future__ import annotations

import json
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

SNAPSHOT_DIR = Path(__file__).resolve().parent.parent / "snapshot"
USER_AGENT = "Mozilla/5.0 (compatible; RestaurantGrowthCheck/1.0)"
# Some delivery platforms answer 404 to anything that does not look like a browser.
BROWSER_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
TIMEOUT_SECONDS = 20

# Sites that answer automated requests with these codes are usually blocking
# robots, not broken. We report them as "unknown" instead of raising an alarm.
BLOCKED_CODES = {401, 403, 405, 429, 999}

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAYS_FR = dict(zip(DAYS, ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]))


def t(en: str, fr: str) -> dict[str, str]:
    return {"en": en, "fr": fr}


@dataclass
class Response:
    url: str
    status: int | None
    ms: int
    body: bytes = b""
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.status == 200


def fetch(url: str, read_body: bool = True, user_agent: str = USER_AGENT) -> Response:
    started = time.perf_counter()
    request = Request(url, headers={"User-Agent": user_agent, "Accept-Language": "fr,en;q=0.8",
                                    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"})
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as reply:
            body = reply.read() if read_body else b""
            return Response(reply.geturl(), reply.status, _elapsed(started), body)
    except HTTPError as error:
        return Response(url, error.code, _elapsed(started), error=str(error.reason))
    except Exception as error:  # DNS failure, timeout, TLS problem…
        return Response(url, None, _elapsed(started), error=type(error).__name__)


def fetch_link(url: str, attempts: int = 3) -> Response:
    """Checks an outgoing link, retrying before calling it broken.

    Delivery and review platforms sometimes answer automated requests with a
    404 even though the page works in a browser (seen with Uber Eats). A link
    only counts as broken when every attempt fails the same way.
    """
    reply = fetch(url, read_body=False)
    for _ in range(attempts - 1):
        if reply.ok or reply.status in BLOCKED_CODES:
            break
        time.sleep(1.5)
        reply = fetch(url, read_body=False, user_agent=BROWSER_USER_AGENT)
    return reply


def _elapsed(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)


class PageParser(HTMLParser):
    """Collects the handful of tags the checks need."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.lang: str | None = None
        self.title = ""
        self.meta: dict[str, str] = {}
        self.links: list[dict[str, str]] = []
        self.h1: list[str] = []
        self.images = 0
        self.images_without_alt = 0
        self.jsonld: list[dict] = []
        self.hrefs: list[str] = []
        self._capturing: str | None = None
        self._buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key: value or "" for key, value in attrs}
        if tag == "html":
            self.lang = attributes.get("lang") or None
        elif tag == "meta":
            key = attributes.get("name") or attributes.get("property")
            if key and "content" in attributes:
                self.meta.setdefault(key.lower(), attributes["content"])
        elif tag == "link":
            self.links.append(attributes)
        elif tag == "img":
            self.images += 1
            if "alt" not in attributes:
                self.images_without_alt += 1
        elif tag == "a" and attributes.get("href"):
            self.hrefs.append(attributes["href"])

        if tag in ("title", "h1"):
            self._capturing, self._buffer = tag, []
        elif tag == "script" and attributes.get("type") == "application/ld+json":
            self._capturing, self._buffer = "jsonld", []

    def handle_data(self, data: str) -> None:
        if self._capturing:
            self._buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        expected = "script" if self._capturing == "jsonld" else self._capturing
        if not self._capturing or tag != expected:
            return
        text = " ".join("".join(self._buffer).split())
        if self._capturing == "title" and not self.title:
            self.title = text
        elif self._capturing == "h1":
            self.h1.append(text)
        elif self._capturing == "jsonld":
            try:
                parsed = json.loads("".join(self._buffer))
            except json.JSONDecodeError:
                parsed = None
            for item in parsed if isinstance(parsed, list) else [parsed]:
                if isinstance(item, dict):
                    self.jsonld.extend(item.get("@graph", [item]))
        self._capturing = None


@dataclass
class Page:
    url: str
    response: Response
    parsed: PageParser = field(default_factory=PageParser)

    @property
    def path(self) -> str:
        return urlparse(self.url).path or "/"

    @property
    def restaurant_schema(self) -> dict | None:
        for item in self.parsed.jsonld:
            kinds = item.get("@type")
            kinds = kinds if isinstance(kinds, list) else [kinds]
            if any(kind in ("Restaurant", "FoodEstablishment", "LocalBusiness") for kind in kinds):
                return item
        return None

    def link(self, rel: str) -> list[dict[str, str]]:
        return [link for link in self.parsed.links if rel in link.get("rel", "").split()]


def load_page(url: str) -> Page:
    response = fetch(url)
    page = Page(url, response)
    if response.ok:
        page.parsed.feed(response.body.decode("utf-8", errors="replace"))
    return page


def same_url(a: str, b: str) -> bool:
    return a.rstrip("/") == b.rstrip("/")


def format_hours(schema: dict | None) -> list[str]:
    """Turns openingHoursSpecification into one readable line per day."""
    if not schema:
        return []
    slots: dict[str, list[str]] = {day: [] for day in DAYS}
    specs = schema.get("openingHoursSpecification") or []
    for spec in specs if isinstance(specs, list) else [specs]:
        days = spec.get("dayOfWeek") or []
        for day in days if isinstance(days, list) else [days]:
            name = str(day).rsplit("/", 1)[-1]
            if name in slots and spec.get("opens") and spec.get("closes"):
                slots[name].append(f"{spec['opens']}–{spec['closes']}")
    return [f"{day}: {', '.join(sorted(times))}" for day, times in slots.items() if times]


def hours_evidence(lines: list[str], prefix: str = "") -> list[dict[str, str]]:
    """Hours as shown to the owner, in both languages."""
    result = []
    for line in lines:
        day, times = line.split(": ", 1)
        result.append(t(f"{prefix}{day}: {times}", f"{prefix}{DAYS_FR.get(day, day)} : {times}"))
    return result


def run(site: str, expected_name: str) -> dict:
    site = site.rstrip("/") + "/"
    checks: list[dict] = []

    def add(check_id: str, group: str, status: str, title: dict, detail: dict,
            fix: dict | None = None, evidence: list[str | dict[str, str]] | None = None) -> None:
        checks.append({
            "id": check_id, "group": group, "status": status, "title": title, "detail": detail,
            "fix": fix if status in ("warn", "fail") else None, "evidence": evidence or [],
        })

    # --- robots.txt and sitemap -------------------------------------------
    robots = fetch(urljoin(site, "robots.txt"))
    robots_text = robots.body.decode("utf-8", errors="replace") if robots.ok else ""
    sitemap_urls = re.findall(r"(?im)^sitemap:\s*(\S+)", robots_text) or [urljoin(site, "sitemap.xml")]
    sitemap = fetch(sitemap_urls[0])
    listed = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", sitemap.body.decode("utf-8", errors="replace")) if sitemap.ok else []
    page_urls = list(dict.fromkeys([site, *listed]))

    if robots.ok and sitemap.ok and listed:
        add("robots_sitemap", "findability", "pass",
            t("Search engines are given a map of the site", "Les moteurs de recherche disposent d’un plan du site"),
            t(f"robots.txt is reachable and points to a sitemap listing {len(listed)} pages.",
              f"Le fichier robots.txt est accessible et renvoie vers un sitemap de {len(listed)} pages."),
            evidence=[sitemap_urls[0], *listed])
    else:
        add("robots_sitemap", "findability", "warn",
            t("Search engines are not given a full map of the site", "Les moteurs de recherche n’ont pas de plan complet du site"),
            t("robots.txt or the sitemap could not be read, so new or changed pages may be discovered more slowly.",
              "Le fichier robots.txt ou le sitemap est illisible ; les pages nouvelles ou modifiées peuvent être découvertes plus lentement."),
            t("Publish a sitemap.xml listing every public page and reference it from robots.txt.",
              "Publiez un sitemap.xml listant chaque page publique et référencez-le dans robots.txt."),
            [f"robots.txt → {robots.status or robots.error}", f"sitemap → {sitemap.status or sitemap.error}"])

    pages = [load_page(url) for url in page_urls]
    live = [page for page in pages if page.response.ok]
    home = pages[0]

    # --- every page opens ---------------------------------------------------
    broken = [page for page in pages if not page.response.ok]
    add("reachable", "guest_path", "fail" if broken else "pass",
        t("Every page opens", "Toutes les pages s’ouvrent") if not broken
        else t("Some pages do not open", "Certaines pages ne s’ouvrent pas"),
        t(f"All {len(pages)} pages listed in the sitemap load correctly.",
          f"Les {len(pages)} pages du sitemap se chargent correctement.") if not broken
        else t(f"{len(broken)} of {len(pages)} pages returned an error. A guest who lands there cannot book or see the menu.",
               f"{len(broken)} pages sur {len(pages)} renvoient une erreur. Un client qui y arrive ne peut ni réserver ni voir le menu."),
        t("Restore the pages below or remove them from the sitemap.", "Rétablissez les pages ci-dessous ou retirez-les du sitemap."),
        [f"{page.path} → {page.response.status or page.response.error} · {page.response.ms} ms" for page in pages])

    if not home.response.ok:
        return finish(site, pages, checks)

    # --- titles -------------------------------------------------------------
    titles = {page.path: page.parsed.title for page in live}
    missing = [path for path, title in titles.items() if not title]
    long_titles = [path for path, title in titles.items() if len(title) > 65]
    duplicates = sorted({path for path, title in titles.items() if title and list(titles.values()).count(title) > 1})
    title_evidence = [f"{path} → “{title}” ({len(title)})" for path, title in titles.items()]
    if missing:
        add("titles", "findability", "fail",
            t("Some pages have no title", "Certaines pages n’ont pas de titre"),
            t("The title is the blue link people see in Google. Pages without one are shown with a guess.",
              "Le titre est le lien bleu affiché dans Google. Sans titre, Google en improvise un."),
            t(f"Add a title to: {', '.join(missing)}.", f"Ajoutez un titre à : {', '.join(missing)}."), title_evidence)
    elif duplicates or long_titles:
        problems_en, problems_fr = [], []
        if duplicates:
            problems_en.append(f"{len(duplicates)} pages share the same title ({', '.join(duplicates)})")
            problems_fr.append(f"{len(duplicates)} pages partagent le même titre ({', '.join(duplicates)})")
        if long_titles:
            problems_en.append(f"{len(long_titles)} titles are longer than 65 characters and may be cut off ({', '.join(long_titles)})")
            problems_fr.append(f"{len(long_titles)} titres dépassent 65 caractères et risquent d’être tronqués ({', '.join(long_titles)})")
        add("titles", "findability", "warn",
            t("Page titles could say more", "Les titres de page peuvent être plus précis"),
            t("; ".join(problems_en) + ". Each page should tell searchers what that page offers.",
              " ; ".join(problems_fr) + ". Chaque page doit indiquer ce qu’elle propose."),
            t("Give each page its own short title, e.g. “Menu — pizzas, pasta, risotto | Montmartre”.",
              "Donnez à chaque page un titre court et distinct, par ex. « Carte — pizzas, pâtes, risottos | Montmartre »."),
            title_evidence)
    else:
        add("titles", "findability", "pass",
            t("Every page has its own title", "Chaque page a son propre titre"),
            t("Titles are present, distinct and short enough to be shown in full in search results.",
              "Les titres sont présents, distincts et assez courts pour s’afficher en entier dans les résultats."),
            evidence=title_evidence)

    # --- descriptions -------------------------------------------------------
    descriptions = {page.path: page.parsed.meta.get("description", "") for page in live}
    no_description = [path for path, text in descriptions.items() if not text]
    off_length = [path for path, text in descriptions.items() if text and not 70 <= len(text) <= 165]
    description_evidence = [f"{path} → {len(text)} characters" if text else f"{path} → none" for path, text in descriptions.items()]
    if no_description:
        add("descriptions", "findability", "warn",
            t("Some pages have no search description", "Certaines pages n’ont pas de description"),
            t("The description is the two grey lines under the title in Google. It is the restaurant’s chance to say why to click.",
              "La description correspond aux deux lignes grises sous le titre dans Google : l’occasion de donner envie de cliquer."),
            t(f"Write a 1–2 sentence description for: {', '.join(no_description)}.",
              f"Rédigez une description d’une à deux phrases pour : {', '.join(no_description)}."), description_evidence)
    elif off_length:
        add("descriptions", "findability", "warn",
            t("Some search descriptions may be cut off or too thin", "Certaines descriptions sont trop longues ou trop courtes"),
            t("Descriptions between 70 and 165 characters are usually shown in full.",
              "Les descriptions de 70 à 165 caractères s’affichent généralement en entier."),
            t(f"Adjust the description length on: {', '.join(off_length)}.", f"Ajustez la longueur de la description sur : {', '.join(off_length)}."),
            description_evidence)
    else:
        add("descriptions", "findability", "pass",
            t("Every page has a search description", "Chaque page a une description"),
            t("Descriptions are present and a good length for search results.",
              "Les descriptions sont présentes et d’une longueur adaptée aux résultats de recherche."),
            evidence=description_evidence)

    # --- canonical ----------------------------------------------------------
    canonical_problems = []
    for page in live:
        canonical = (page.link("canonical") or [{}])[0].get("href", "")
        if not canonical or not same_url(urljoin(page.url, canonical), page.url):
            canonical_problems.append(f"{page.path} → {canonical or 'none'}")
    add("canonical", "findability", "warn" if canonical_problems else "pass",
        t("Each page declares its official address", "Chaque page déclare son adresse officielle") if not canonical_problems
        else t("Some pages do not declare their official address", "Certaines pages ne déclarent pas leur adresse officielle"),
        t("Canonical links are in place, so search engines do not split the page between duplicate addresses.",
          "Les liens canoniques sont en place : les moteurs ne dispersent pas la page entre plusieurs adresses.") if not canonical_problems
        else t("A missing or different canonical link can make search engines index the wrong address.",
               "Un lien canonique absent ou différent peut faire indexer la mauvaise adresse."),
        t("Add a canonical link pointing to the page’s own address.", "Ajoutez un lien canonique vers l’adresse de la page elle-même."),
        canonical_problems)

    # --- one main heading ---------------------------------------------------
    heading_problems = [f"{page.path} → {len(page.parsed.h1)} main headings" for page in live if len(page.parsed.h1) != 1]
    add("headings", "findability", "warn" if heading_problems else "pass",
        t("Each page has one clear main heading", "Chaque page a un titre principal clair") if not heading_problems
        else t("Some pages have no single main heading", "Certaines pages n’ont pas un titre principal unique"),
        t("One main heading per page tells guests and search engines what the page is about.",
          "Un titre principal par page indique aux clients et aux moteurs le sujet de la page."),
        t("Use exactly one main heading (H1) on each page listed below.", "Utilisez un seul titre principal (H1) sur chaque page ci-dessous."),
        heading_problems or [f"{page.path} → “{page.parsed.h1[0]}”" for page in live])

    # --- structured data ----------------------------------------------------
    schema = home.restaurant_schema
    if not schema:
        add("schema", "findability", "fail",
            t("Google is not told this is a restaurant", "Google ne sait pas qu’il s’agit d’un restaurant"),
            t("No Restaurant structured data was found on the home page. This is how Google reads the address, hours and menu reliably.",
              "Aucune donnée structurée Restaurant sur la page d’accueil. C’est ainsi que Google lit de façon fiable l’adresse, les horaires et le menu."),
            t("Add Restaurant JSON-LD with name, address, phone, opening hours and menu link.",
              "Ajoutez un JSON-LD Restaurant avec nom, adresse, téléphone, horaires et lien du menu."))
    else:
        essential = {"name": t("name", "nom"), "address": t("address", "adresse"), "telephone": t("phone", "téléphone"),
                     "openingHoursSpecification": t("opening hours", "horaires")}
        recommended = {"hasMenu": t("menu link", "lien du menu"), "servesCuisine": t("cuisine", "type de cuisine"),
                       "priceRange": t("price range (priceRange)", "gamme de prix (priceRange)"), "image": t("photo (image)", "photo (image)"),
                       "geo": t("map coordinates (geo)", "coordonnées GPS (geo)")}

        def declared(key: str) -> bool:
            return bool(schema.get(key)) or (key == "hasMenu" and bool(schema.get("menu")))

        def listing(labels: list[dict[str, str]], lang: str) -> str:
            return ", ".join(label[lang] for label in labels)

        missing_essential = [label for key, label in essential.items() if not declared(key)]
        missing_recommended = [label for key, label in recommended.items() if not declared(key)]
        all_keys = [*essential, *recommended]
        evidence = [f"✓ {', '.join(key for key in all_keys if declared(key))}"]
        if missing_essential or missing_recommended:
            evidence.append(f"✗ {', '.join(key for key in all_keys if not declared(key))}")
        if missing_essential:
            add("schema", "findability", "fail",
                t("Restaurant details for Google are incomplete", "Les informations du restaurant pour Google sont incomplètes"),
                t(f"The structured data is missing: {listing(missing_essential, 'en')}.",
                  f"Les données structurées n’indiquent pas : {listing(missing_essential, 'fr')}."),
                t("Complete the Restaurant JSON-LD with the missing fields.", "Complétez le JSON-LD Restaurant avec les champs manquants."), evidence)
        elif missing_recommended:
            add("schema", "findability", "warn",
                t("Restaurant details for Google are almost complete", "Les informations du restaurant pour Google sont presque complètes"),
                t(f"Name, address, phone and hours are declared. Still missing: {listing(missing_recommended, 'en')}. Google recommends these for restaurant listings.",
                  f"Nom, adresse, téléphone et horaires sont déclarés. Il manque encore : {listing(missing_recommended, 'fr')}. Google recommande ces champs pour les restaurants."),
                t(f"Ask the web developer to add to the Restaurant JSON-LD: {listing(missing_recommended, 'en')}.",
                  f"Demandez au développeur du site d’ajouter au JSON-LD Restaurant : {listing(missing_recommended, 'fr')}."), evidence)
        else:
            add("schema", "findability", "pass",
                t("Google is told everything about the restaurant", "Google reçoit toutes les informations du restaurant"),
                t("Name, address, phone, hours, menu, cuisine, price range, photo and coordinates are all declared.",
                  "Nom, adresse, téléphone, horaires, menu, cuisine, gamme de prix, photo et coordonnées sont déclarés."), evidence=evidence)

        # --- name consistency ----------------------------------------------
        site_name = str(schema.get("name", "")).strip()
        if site_name and site_name.casefold() != expected_name.casefold():
            add("name_match", "findability", "warn",
                t("The site uses a different restaurant name", "Le site utilise un autre nom de restaurant"),
                t(f"The website and its data for Google say “{site_name}”; this workspace is set up for “{expected_name}”. "
                  "Guests and Google should see one name everywhere (site, Maps, delivery apps).",
                  f"Le site et ses données pour Google indiquent « {site_name} » ; cet espace est configuré pour « {expected_name} ». "
                  "Les clients et Google doivent voir un seul nom partout (site, Maps, applications de livraison)."),
                t("Confirm with the owner which name this address, website and Google listing belong to, then use it everywhere.",
                  "Confirmez avec le propriétaire à quel nom correspondent cette adresse, ce site et la fiche Google, puis utilisez-le partout."),
                [f"site: {site_name}", f"workspace: {expected_name}"])
        else:
            add("name_match", "findability", "pass",
                t("The restaurant name is consistent", "Le nom du restaurant est cohérent"),
                t(f"The website declares the name “{site_name}”.", f"Le site déclare le nom « {site_name} »."))

    # --- opening hours ------------------------------------------------------
    hours = format_hours(schema)
    english = next((page for page in live if page.path.rstrip("/") == "/en"), None)
    english_hours = format_hours(english.restaurant_schema) if english else []
    if not hours:
        add("hours", "guest_path", "warn",
            t("Opening hours are not declared for Google", "Les horaires ne sont pas déclarés pour Google"),
            t("Hours are visible to people but not declared in the page data search engines read.",
              "Les horaires sont visibles mais absents des données lues par les moteurs."),
            t("Add opening hours to the Restaurant JSON-LD.", "Ajoutez les horaires au JSON-LD Restaurant."))
    elif english_hours and english_hours != hours:
        add("hours", "guest_path", "fail",
            t("French and English pages give different hours", "Les pages française et anglaise n’indiquent pas les mêmes horaires"),
            t("A guest could arrive when the restaurant is closed.", "Un client pourrait se présenter alors que le restaurant est fermé."),
            t("Make the hours identical on both language versions.", "Alignez les horaires sur les deux versions."),
            [*hours_evidence(hours, "FR · "), *hours_evidence(english_hours, "EN · ")])
    else:
        add("hours", "guest_path", "pass",
            t("Opening hours are declared and consistent", "Les horaires sont déclarés et cohérents"),
            t("These are the hours the site gives to Google. The owner should confirm they match the Google Maps listing and holiday closures.",
              "Voici les horaires transmis à Google. Le propriétaire doit confirmer qu’ils correspondent à la fiche Google Maps et aux fermetures exceptionnelles."),
            evidence=hours_evidence(hours))

    # --- languages ----------------------------------------------------------
    language_problems: list[str] = []
    wrong_pages: list[str] = []
    for page in live:
        expected = "en" if page.path.rstrip("/").startswith("/en") else "fr"
        declared = (page.parsed.lang or "").lower()
        if not declared.startswith(expected):
            language_problems.append(f"{page.path} → lang=\"{declared or '—'}\" ≠ {expected}")
            wrong_pages.append(page.path)
    add("language", "languages", "warn" if language_problems else "pass",
        t("Each page declares its language", "Chaque page déclare sa langue") if not language_problems
        else t("Some pages declare the wrong language", "Certaines pages déclarent la mauvaise langue"),
        t("Browsers and Google know which pages are French and which are English.",
          "Les navigateurs et Google savent quelles pages sont en français et lesquelles en anglais.") if not language_problems
        else t(f"{', '.join(wrong_pages)}: the content and the declared language do not match. "
               "Browsers may offer to translate the English page into English, and Google may treat it as French.",
               f"{', '.join(wrong_pages)} : le contenu et la langue déclarée ne correspondent pas. "
               "Le navigateur peut proposer de traduire la page anglaise en anglais, et Google peut la considérer comme française."),
        t("Ask the web developer to declare the right language in the page’s <html lang> tag (en for English pages).",
          "Demandez au développeur du site de déclarer la bonne langue dans la balise <html lang> (en pour les pages anglaises)."),
        language_problems)

    def alternates(page: Page) -> dict[str, str]:
        return {link.get("hreflang", "").lower(): urljoin(page.url, link.get("href", "")) for link in page.link("alternate") if link.get("hreflang")}

    home_alternates = alternates(home)
    english_alternates = alternates(english) if english else {}
    hreflang_evidence = [f"/ → {code}: {url}" for code, url in home_alternates.items()] + [f"/en → {code}: {url}" for code, url in english_alternates.items()]
    if not english:
        add("hreflang", "languages", "unknown",
            t("No English page was found to compare", "Aucune page anglaise à comparer"),
            t("The sitemap does not list an /en page.", "Le sitemap ne mentionne pas de page /en."))
    elif "en" in home_alternates and "fr" in english_alternates and same_url(home_alternates["en"], english.url) and same_url(english_alternates["fr"], home.url):
        add("hreflang", "languages", "pass",
            t("French and English versions point to each other", "Les versions française et anglaise se référencent mutuellement"),
            t("Google can show the English page to visitors searching in English and the French page to locals.",
              "Google peut proposer la page anglaise aux visiteurs anglophones et la page française aux habitants."),
            evidence=hreflang_evidence)
    else:
        add("hreflang", "languages", "warn",
            t("French and English versions are not linked for Google", "Les versions française et anglaise ne sont pas reliées pour Google"),
            t("Without matching language links, tourists searching in English may be shown the French page.",
              "Sans liens de langue réciproques, les touristes anglophones peuvent voir la page française."),
            t("Add hreflang links on both pages, each pointing to the other.", "Ajoutez des liens hreflang réciproques sur les deux pages."),
            hreflang_evidence)

    # --- mobile -------------------------------------------------------------
    not_mobile = [page.path for page in live if "width=device-width" not in page.parsed.meta.get("viewport", "")]
    add("viewport", "mobile_sharing", "fail" if not_mobile else "pass",
        t("Pages are set up for phone screens", "Les pages sont prévues pour les écrans de téléphone") if not not_mobile
        else t("Some pages are not set up for phone screens", "Certaines pages ne sont pas prévues pour les téléphones"),
        t("Every page adapts its width to the phone. This is a setup check only; tap comfort and speed still need a real-phone test.",
          "Chaque page adapte sa largeur au téléphone. Vérification de configuration uniquement : le confort tactile et la vitesse restent à tester sur un vrai téléphone.") if not not_mobile
        else t("Most restaurant searches happen on a phone; these pages would appear zoomed out.",
               "La plupart des recherches de restaurant se font sur téléphone ; ces pages apparaîtraient dézoomées."),
        t("Add a responsive viewport tag.", "Ajoutez une balise viewport adaptative."), not_mobile)

    # --- image descriptions -------------------------------------------------
    alt_evidence = [f"{page.path} → {page.parsed.images_without_alt} of {page.parsed.images} images" for page in live if page.parsed.images_without_alt]
    total_missing = sum(page.parsed.images_without_alt for page in live)
    add("image_alt", "mobile_sharing", "warn" if total_missing else "pass",
        t("Every photo has a description", "Chaque photo a une description") if not total_missing
        else t("Some photos have no description", "Certaines photos n’ont pas de description"),
        t("Image descriptions help Google Images and guests using screen readers.",
          "Les descriptions d’images aident Google Images et les clients utilisant un lecteur d’écran.") if not total_missing
        else t(f"{total_missing} images have no description. Dish photos with a description can appear in Google Images.",
               f"{total_missing} images n’ont pas de description. Les photos de plats décrites peuvent apparaître dans Google Images."),
        t("Describe each photo in a few words, e.g. “Pizza Parma with rocket and parmesan”.",
          "Décrivez chaque photo en quelques mots, par ex. « Pizza Parma, roquette et parmesan »."), alt_evidence)

    # --- link preview when shared ------------------------------------------
    preview_fields = {"og:title": "title", "og:description": "description", "og:image": "image"}
    preview_missing = [label for key, label in preview_fields.items() if not home.parsed.meta.get(key)]
    preview_fr = {"title": "titre", "description": "description", "image": "image"}
    add("social_preview", "mobile_sharing", "warn" if preview_missing else "pass",
        t("Shared links show a full preview", "Les liens partagés affichent un aperçu complet") if not preview_missing
        else t("Shared links show no photo", "Les liens partagés n’affichent pas de photo") if preview_missing == ["image"]
        else t("Shared links have an incomplete preview", "Les liens partagés ont un aperçu incomplet"),
        t("When someone shares the site on WhatsApp, Instagram or Facebook, a title, text and photo appear.",
          "Quand quelqu’un partage le site sur WhatsApp, Instagram ou Facebook, un titre, un texte et une photo apparaissent.") if not preview_missing
        else t(f"When a guest shares the site on WhatsApp, Instagram or Facebook, the preview has no {' or '.join(preview_missing)}. "
               "A food photo is what makes friends tap the link.",
               f"Quand un client partage le site sur WhatsApp, Instagram ou Facebook, l’aperçu n’a {' ni '.join(('pas d’' if preview_fr[item][0] in 'aeiou' else 'pas de ') + preview_fr[item] for item in preview_missing)}. "
               "Une photo de plat est ce qui donne envie de cliquer."),
        t("Add a share image (og:image, about 1200×630 px) showing the restaurant’s best dish.",
          "Ajoutez une image de partage (og:image, environ 1200×630 px) montrant le meilleur plat du restaurant."),
        [f"{key} → {home.parsed.meta.get(key) or 'none'}" for key in preview_fields])

    # --- server speed -------------------------------------------------------
    # Best of three requests, so one slow network moment does not raise an alarm.
    ms = min([home.response.ms, *(reply.ms for reply in (fetch(site), fetch(site)) if reply.ok)])
    kilobytes = round(len(home.response.body) / 1024)
    speed_status = "pass" if ms < 800 else "warn" if ms < 2000 else "fail"
    add("speed", "mobile_sharing", speed_status,
        t("The home page answers quickly", "La page d’accueil répond rapidement") if speed_status == "pass"
        else t("The home page is slow to answer", "La page d’accueil met du temps à répondre"),
        t(f"The server answered in {ms} ms ({kilobytes} KB of HTML). This is one request from one location, not a full phone-speed test.",
          f"Le serveur a répondu en {ms} ms ({kilobytes} Ko de HTML). Il s’agit d’une seule requête depuis un seul endroit, pas d’un test complet sur téléphone."),
        t("Run PageSpeed Insights on the home page and review hosting and image sizes.",
          "Lancez PageSpeed Insights sur la page d’accueil et vérifiez l’hébergement et le poids des images."),
        [f"{ms} ms", f"{kilobytes} KB"])

    # --- ways to contact ----------------------------------------------------
    hrefs = list(dict.fromkeys(href for page in live for href in page.parsed.hrefs))
    phone_links = [href for href in hrefs if href.startswith("tel:")]
    mail_links = [href for href in hrefs if href.startswith("mailto:")]
    add("contact", "guest_path", "pass" if phone_links else "warn",
        t("Guests can call with one tap", "Les clients peuvent appeler en un geste") if phone_links
        else t("The phone number cannot be tapped to call", "Le numéro de téléphone n’est pas cliquable"),
        t("The phone number is a tappable link, which matters for last-minute bookings from a phone.",
          "Le numéro est un lien cliquable, utile pour les réservations de dernière minute depuis un téléphone.") if phone_links
        else t("On a phone, guests have to copy the number by hand.", "Sur téléphone, les clients doivent recopier le numéro à la main."),
        t("Make the phone number a tel: link.", "Transformez le numéro en lien tel:."), [*phone_links, *mail_links])

    # --- links guests rely on ----------------------------------------------
    host = urlparse(site).netloc
    outbound = [href for href in hrefs if href.startswith("http") and urlparse(href).netloc != host]
    link_evidence: list[str | dict[str, str]] = []
    dead: list[str] = []
    unverified: list[str] = []
    for href in outbound:
        reply = fetch_link(href)
        label = urlparse(href).netloc.removeprefix("www.")
        if reply.ok:
            link_evidence.append(f"{label} → OK")
        elif reply.status in BLOCKED_CODES:
            unverified.append(label)
            link_evidence.append(t(f"{label} → not verifiable ({reply.status}): the site blocks automated checks",
                                     f"{label} → non vérifiable ({reply.status}) : le site bloque les contrôles automatiques"))
        else:
            dead.append(label)
            link_evidence.append(f"{href} → {reply.status or reply.error}")
    verified = len(outbound) - len(dead) - len(unverified)
    if dead:
        add("links", "guest_path", "fail",
            t("Some outgoing links are broken", "Certains liens sortants sont cassés"),
            t(f"{len(dead)} of {len(outbound)} links to the menu, delivery or review sites {'does' if len(dead) == 1 else 'do'} not open: "
              f"{', '.join(dead)}. A guest who taps it lands on an error page instead of ordering.",
              f"{len(dead)} {'lien' if len(dead) == 1 else 'liens'} sur {len(outbound)} vers le menu, la livraison ou les avis "
              f"{'ne s’ouvre pas' if len(dead) == 1 else 'ne s’ouvrent pas'} : {', '.join(dead)}. "
              "Un client qui clique arrive sur une page d’erreur au lieu de commander."),
            t(f"Check that the restaurant is still listed on {', '.join(dead)}. If so, replace the link with the current listing address; if not, remove it from the site.",
              f"Vérifiez que le restaurant est toujours présent sur {', '.join(dead)}. Si oui, remplacez le lien par l’adresse actuelle de la fiche ; sinon, retirez-le du site."),
            link_evidence)
    elif outbound:
        add("links", "guest_path", "pass",
            t("Menu, delivery and review links open", "Les liens menu, livraison et avis fonctionnent"),
            t(f"{verified} of {len(outbound)} outgoing links were opened successfully."
              + (f" {len(unverified)} could not be verified because those sites block automated checks; open them by hand once." if unverified else ""),
              f"{verified} liens sortants sur {len(outbound)} ont été ouverts avec succès."
              + (f" {len(unverified)} n’ont pas pu être vérifiés car ces sites bloquent les contrôles automatiques ; ouvrez-les une fois à la main." if unverified else "")),
            evidence=link_evidence)

    return finish(site, pages, checks)


def read_reputation(pages: list[Page]) -> dict | None:
    """Google rating and review count, as published in the site's own structured data.

    Restaurant site builders such as Localisr copy these from Google every day,
    which gives a free daily reading of the two numbers the owner cares most about.
    """
    home = pages[0] if pages and pages[0].response.ok else None
    rating = ((home.restaurant_schema if home else None) or {}).get("aggregateRating") or {}
    try:
        return {"rating": round(float(rating["ratingValue"]), 2), "reviews": int(rating["reviewCount"]),
                "source": home.url if home else None}
    except (KeyError, TypeError, ValueError):
        return None


def finish(site: str, pages: list[Page], checks: list[dict]) -> dict:
    summary = {status: sum(check["status"] == status for check in checks) for status in ("pass", "warn", "fail", "unknown")}
    return {
        "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "site": site,
        "pages": [{"url": page.url, "status": page.response.status, "ms": page.response.ms, "title": page.parsed.title} for page in pages],
        "summary": summary,
        "reputation": read_reputation(pages),
        "checks": checks,
    }


PROBLEM = ("warn", "fail")
HISTORY_DAYS = 400


def read_json(path: Path) -> dict | list | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def compare(previous: dict | None, current: dict) -> dict | None:
    """What got fixed and what newly broke since the previous run."""
    if not previous or not previous.get("checks"):
        return None
    before = {check["id"] for check in previous["checks"] if check["status"] in PROBLEM}
    now = {check["id"] for check in current["checks"] if check["status"] in PROBLEM}
    # A previous comparison is kept when this run happens on the same day,
    # so a manual rerun does not hide yesterday's changes.
    if previous["checked_at"][:10] == current["checked_at"][:10] and previous.get("changes"):
        earlier = previous["changes"]
        before = (before - set(earlier["new"])) | set(earlier["resolved"])
        return {"since": earlier["since"], "new": sorted(now - before), "resolved": sorted(before - now)}
    return {"since": previous["checked_at"], "new": sorted(now - before), "resolved": sorted(before - now)}


def update_history(history: list | None, current: dict) -> list:
    """One compact line per day, to show trends later without storing every full snapshot."""
    day = current["checked_at"][:10]
    entry = {
        "date": day,
        **current["summary"],
        "problems": sorted(check["id"] for check in current["checks"] if check["status"] in PROBLEM),
    }
    if current.get("reputation"):
        entry["rating"] = current["reputation"]["rating"]
        entry["reviews"] = current["reputation"]["reviews"]
    kept = [item for item in (history or []) if item.get("date") != day]
    return sorted([*kept, entry], key=lambda item: item["date"])[-HISTORY_DAYS:]


def main() -> int:
    profile = json.loads((SNAPSHOT_DIR / "research.json").read_text(encoding="utf-8"))["profile"]
    target = SNAPSHOT_DIR / "site_check.json"
    history_path = SNAPSHOT_DIR / "site_check_history.json"
    previous = read_json(target)

    result = run(profile["website"], profile["name"])
    result["changes"] = compare(previous if isinstance(previous, dict) else None, result)
    history = update_history(read_json(history_path), result)

    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    history_path.write_text(json.dumps(history, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if result["changes"]:
        print(f"Since {result['changes']['since']}: new {result['changes']['new'] or 'none'}, "
              f"fixed {result['changes']['resolved'] or 'none'}")
    summary = result["summary"]
    print(f"{result['site']} · {len(result['pages'])} pages · "
          f"{summary['pass']} ok, {summary['warn']} to improve, {summary['fail']} broken, {summary['unknown']} unknown")
    for check in result["checks"]:
        if check["status"] != "pass":
            print(f"  [{check['status']}] {check['title']['en']}")
    print(f"Saved to {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
