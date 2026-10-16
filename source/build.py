#!/usr/bin/env python3
"""Generate the Tripelago website.

    python source/build.py

writes every HTML page, data.js, the 404 page and the deploy files (robots.txt,
site.webmanifest, _headers) into the website folder. Edit source/data.py to change
prices, destinations or rules, then run the command again.

Folder layout (in the website folder):
    index.html        home page
    404.html          page not found
    pages/            every other page (destinations, plans, about, contact, sign-in, app, cart, checkout, account, faq, terms)
    trips/            one page per destination
    assets/css        styles.css, the one stylesheet
    assets/js         shared scripts (config.js, data.js, site.js); assets/js/pages has one script per page
    assets/img        brand icons, app mockups and destination photos
    assets/video      the home page background video

Destination photos come from source/photos/<id>.webp (1600x1000). The build writes the
web sizes to assets/img/destinations/ when Pillow is installed (pip install pillow).
"""
import base64
import hashlib
import html
import json
import os
import sys

BUILD_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BUILD_DIR)
from data import SITE, RULES, PROMOS, PLANS, TOURS, FAQ, DEALS  # noqa: E402

# The website sits next to this folder (TRIPELAGO_WEBSITE/website)
SITE_ROOT = os.path.join(os.path.dirname(BUILD_DIR), "website")
PLAN = {p["id"]: p for p in PLANS}
TOUR = {t["id"]: t for t in TOURS}

# Web sizes written for each destination photo (160 is the Where-panel thumbnail); the About photo skips 160
PHOTO_WIDTHS = [160, 480, 960, 1600]
ABOUT_WIDTHS = [480, 960, 1600]
# Attribute snippets used inside f-strings (kept out of them so the build runs on Python 3.8+)
POPULAR_TAG = '<span class="plan-ribbon">Most popular</span>'
SHARED_JS = ["assets/js/config.js", "assets/js/data.js", "assets/js/site.js"]


def plan_inclusions(p):
    """What a plan includes, as shown on trip pages (tour.js renders the same list)."""
    insurance = "Travel insurance" if p["insuranceIncluded"] else f"Optional travel insurance, {peso(RULES['insurancePrice'])} per traveler"
    return [f"{p['days']} days, {p['nights']} nights"] + p["inclusions"] + [insurance]


def trip_url(t):
    return f"trips/{t['id']}.html"


def photo(name, width):
    return f"assets/img/destinations/{name}-{width}.webp"


def e(text):
    return html.escape(str(text), quote=True)


def peso(n, decimals=0):
    return "₱" + f"{n:,.{decimals}f}"


def plural(n, word):
    return f"{n} {word}{'' if n == 1 else 's'}"


def from_price(t):
    return min(t["prices"].values())


def unit(t, plan_id):
    return t["prices"][plan_id]


# ---------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------
IMG_VARIANTS = {
    "card": ([480, 960], 960, "(max-width: 44rem) calc(100vw - 2.5rem), (max-width: 58rem) calc(50vw - 3rem), 380px"),
    "hero": ([960, 1600], 1600, "(max-width: 74rem) calc(100vw - 2.5rem), 1184px"),
    "thumb": ([480], 480, "(max-width: 44rem) 45vw, 200px"),
    "about": ([480, 960, 1600], 960, "(max-width: 58rem) calc(100vw - 2.5rem), 448px"),
}


def img(t, variant, alt=None, cls="", lazy=True):
    widths, default, sizes = IMG_VARIANTS[variant]
    alt_text = t["alt"] if alt is None else alt
    attrs = f' class="{cls}"' if cls else ""
    if lazy:
        loading = ' loading="lazy" decoding="async"'
    else:
        loading = ' fetchpriority="high"' if variant == "hero" else ""
    srcset = ", ".join(f"{photo(t['id'], w)} {w}w" for w in widths)
    return (f'<img{attrs} src="{photo(t["id"], default)}" srcset="{srcset}" sizes="{sizes}" '
            f'alt="{e(alt_text)}" width="1600" height="1000"{loading}>')


def og_image(t=None):
    photo = t["photo"] if t else TOUR["palawan"]["photo"]
    return f"https://images.unsplash.com/{photo}?auto=format&fit=crop&w=1200&h=630&q=80"


# ---------------------------------------------------------------------------
# Shared chrome
# ---------------------------------------------------------------------------
REGIONS = ["Asia", "Europe", "Africa", "Oceania"]

NAV = [
    ("index.html", "Home"),
    ("pages/destinations.html", "Destinations"),
    ("pages/plans.html", "Plans"),
    ("pages/about.html", "About us"),
]

CART_SVG = ('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
            '<path d="M6 7h12l-1 12.2a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path></svg>')
MENU_SVG = ('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 8h16M4 16h16"></path></svg>')
HEART_SVG = ('<svg width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke-linejoin="round" aria-hidden="true" focusable="false">'
             '<path d="M19.5 12.6 12 20l-7.5-7.4A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 7.5 6.4z"></path></svg>')
PAUSE_SVG = ('<svg class="icon-pause" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><rect x="2" y="1" width="3" height="10" rx="1"></rect><rect x="7" y="1" width="3" height="10" rx="1"></rect></svg>'
             '<svg class="icon-play" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3 1.5v9l7.5-4.5z"></path></svg>')

ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"'
CHEVRON_L = f'<svg width="18" height="18" {ICON_ATTRS} stroke-width="2.4"><path d="M15 5l-7 7 7 7"></path></svg>'
CHECK_SVG = f'<svg width="16" height="16" {ICON_ATTRS} stroke-width="2.6"><path d="M5 12.5l4.2 4.2L19 7"></path></svg>'
PLUS_SVG = f'<svg width="16" height="16" {ICON_ATTRS} stroke-width="2.6"><path d="M12 6v12M6 12h12"></path></svg>'
DASH_SVG = f'<svg width="16" height="16" {ICON_ATTRS} stroke-width="2.6"><path d="M7 12h10"></path></svg>'
CHEVRON_R = f'<svg width="18" height="18" {ICON_ATTRS} stroke-width="2.4"><path d="M9 5l7 7-7 7"></path></svg>'


def header(active, current=None):
    def attrs(href):
        if href != active:
            return ""
        return ' class="header-active-link"' + (' aria-current="page"' if href == current else "")
    links = "".join(f'\n            <a href="{href}"{attrs(href)}>{label}</a>' for href, label in NAV)
    cart_cls = " header-active-link" if active == "pages/cart.html" else ""
    cart_current = ' aria-current="page"' if active == "pages/cart.html" else ""
    return f'''    <header>
        <a class="header-brand" href="index.html" aria-label="{e(SITE["name"])}, home">
            <img src="assets/img/brand/logo-mark.png" alt="" width="96" height="96">
            <span class="header-brand-name" aria-hidden="true">{e(SITE["name"])}</span>
        </a>
        <nav id="site-nav" aria-label="Main">{links}
        </nav>
        <div class="header-actions">
            <a class="header-cart{cart_cls}" href="pages/cart.html" aria-label="Cart"{cart_current}>{CART_SVG}<span class="header-cart-count" aria-hidden="true">0</span></a>
            <a class="header-cta" href="pages/sign-in.html" data-auth-cta>Sign in</a>
            <button class="header-menu" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav">{MENU_SVG}</button>
        </div>
    </header>'''


def footer():
    return f'''    <footer class="site-footer slim">
        <div class="footer-bottom">
            <span>© <span data-year>2026</span> {e(SITE["name"])}</span>
            <span class="footer-links"><a href="pages/contact.html">Contact us</a><a href="pages/faq.html">Help</a><a href="pages/terms.html">Terms</a><a href="pages/terms.html#privacy">Privacy</a></span>
        </div>
    </footer>'''


def jsonld_tag(obj):
    text = json.dumps(obj, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return f'\n    <script type="application/ld+json">\n{text}\n    </script>'


def write(filename, content):
    path = os.path.join(SITE_ROOT, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)


def page(filename, title, description, body, active=None, scripts=(), body_attrs="", noindex=False,
         og=None, jsonld=(), canonical=None, after_main="", head_extra=""):
    script_tags = "".join(f'\n    <script src="{s}" defer></script>' for s in SHARED_JS + [f"assets/js/pages/{x}" for x in scripts])
    nested = "/" in filename
    # Pages in a sub-folder (trips/) resolve every link from the site root
    base_tag = '\n    <base href="../">' if nested else ""
    ld = "".join(jsonld_tag(obj) for obj in jsonld)
    full_title = title if title.endswith(SITE["name"]) else f"{title} · {SITE['name']}"
    meta = f'''    <title>{e(full_title)}</title>{base_tag}
    <meta name="description" content="{e(description)}">{chr(10) + '    <meta name="robots" content="noindex">' if noindex else ""}{chr(10) + f'    <link rel="canonical" href="{canonical}">' if canonical else ""}
    <meta name="theme-color" content="#f4f8f9">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="{e(SITE["name"])}">
    <meta property="og:title" content="{e(full_title)}">
    <meta property="og:description" content="{e(description)}">
    <meta property="og:image" content="{e(og or og_image())}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" href="assets/img/brand/brand-favicon.ico" sizes="any">
    <link rel="apple-touch-icon" href="assets/img/brand/apple-touch-icon.png">
    <link rel="manifest" href="site.webmanifest">
    <link rel="stylesheet" href="assets/css/styles.css">{head_extra}{ld}'''
    current = filename
    chrome = f'''    <a class="skip-link" href="#main">Skip to main content</a>
{header(active, current)}
    <noscript><p class="noscript">Booking, the cart and accounts need JavaScript. Please turn it on to book a trip.</p></noscript>

    <main id="main" tabindex="-1">
{body}
    </main>
{after_main}{footer()}{script_tags}'''
    content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
{meta}
</head>
<body{body_attrs}>
{chrome}
</body>
</html>
'''
    if nested:
        # In-page links (#book, #main) must name the page, because <base> points at the root
        content = content.replace('href="#', f'href="{filename}#')
    write(filename, content)
    print("wrote", filename)


# ---------------------------------------------------------------------------
# Reusable blocks
# ---------------------------------------------------------------------------
def tour_card(t, i, heading="h3"):
    return f'''                <article class="tour-card" data-id="{t["id"]}" data-name="{e(t["name"])}" data-country="{e(t["country"])}" data-region="{t["region"]}" data-price="{from_price(t)}" data-order="{i}">
                    <div class="tour-card-media">
                        {img(t, "card")}
                        <span class="chip continent region-{t["region"].lower()}">{t["region"]}</span>
                        <button class="save-btn" type="button" data-save="{t["id"]}" aria-pressed="false" aria-label="Save {e(t["name"])} to saved trips">{HEART_SVG}</button>
                    </div>
                    <div class="tour-card-body">
                        <span class="tour-card-country continent region-{t["region"].lower()}">{e(t["country"])}</span>
                        <{heading} class="tour-card-title"><a class="tour-card-link" href="{trip_url(t)}">{e(t["name"])}</a></{heading}>
                        <p>{e(t["tagline"])}</p>
                        <div class="tour-card-foot">
                            <div><span class="from">From</span><strong class="card-price">{peso(from_price(t))}</strong></div>
                            <span class="card-go" aria-hidden="true">{CHEVRON_R}</span>
                        </div>
                    </div>
                </article>'''


def itinerary(t, plan):
    days = []
    if plan["transfers"] == "Not included":
        days.append(f"Arrive in {t['arrive']} and check in to your hotel. Meet your guide for an evening welcome walk.")
    else:
        days.append(f"Arrive in {t['arrive']}. Your transfer takes you to the hotel, then an evening welcome walk with your guide.")
    for d in range(2, plan["days"]):
        i = d - 2
        days.append(t["highlights"][i] + "." if i < len(t["highlights"]) else
                    "Free day to explore on your own, or ask your guide about optional excursions.")
    days.append("Check out and make your own way to the airport." if plan["transfers"] == "Not included"
                else "Slow morning, then your transfer to the airport.")
    return days


AGENCY_LD = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "name": SITE["name"],
    "description": SITE["tagline"],
    "email": SITE["email"],
    "telephone": SITE["phone"],
    "priceRange": f"{peso(min(from_price(t) for t in TOURS))}–{peso(max(max(t['prices'].values()) for t in TOURS))}",
    "address": {"@type": "PostalAddress", "streetAddress": SITE["address"][0], "addressLocality": "Pasig City",
                "postalCode": "1605", "addressCountry": SITE["country"]},
    "openingHoursSpecification": [
        {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "18:00"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "13:00"},
    ],
}


# ---------------------------------------------------------------------------
# Home (index.html)
# ---------------------------------------------------------------------------
# Self-hosted clip in assets/video: WebM first, MP4 for Safari
HERO_SOURCES = [("assets/video/hero.webm", "video/webm"), ("assets/video/hero.mp4", "video/mp4")]
HERO_POSTER = "assets/video/hero-poster.jpg"


def deal_price(deal):
    rule = PROMOS[deal["code"]]
    plan = PLAN[deal["plan"]]
    n = rule.get("minTravelers", 1)
    was = plan["price"] * n
    now = was - rule["value"] if rule["type"] == "fixed" else round(was * (100 - rule["value"]) / 100)
    unit = "per person" if n == 1 else f"for {n} travelers"
    return was, now, unit


def deals_grid(heading="h3"):
    cards = []
    for d in DEALS:
        plan = PLAN[d["plan"]]
        was, now, unit = deal_price(d)
        cards.append(f'''
                <article class="deal-card tone-{d["tone"]}">
                    <p class="deal-plan">{e(plan["name"])} plan · {plan["days"]} days</p>
                    <{heading} class="deal-title">{e(d["title"])}</{heading}>
                    <p class="deal-headline">{e(d["headline"])}</p>
                    <p class="deal-text">{e(d["text"])}</p>
                    <p class="deal-price">From <s><span class="visually-hidden">was </span>{peso(was)}</s> <strong>{peso(now)}</strong> {unit}</p>
                    <div class="deal-actions">
                        <span class="deal-code">Code <strong>{d["code"]}</strong></span>
                        <a class="btn small{"" if d["tone"] == "sun" else " ghost"}" href="pages/destinations.html?plan={plan["id"]}&amp;deal={d["code"]}" aria-label="Use the {e(d["title"])} deal, {e(PROMOS[d["code"]]["label"])}">Use this deal</a>
                    </div>
                </article>''')
    return "".join(cards)


def plan_deal_line(p):
    """One short line about the plan's deal (the full deals live on the Plans page)."""
    deal = next((d for d in DEALS if d["plan"] == p["id"]), None)
    if not deal:
        return ""
    return f'\n                    <p class="plan-deal"><a href="pages/plans.html#deals">{e(deal["headline"])} with code <strong>{deal["code"]}</strong></a></p>'


def home_body():
    carousel = "".join(
        f'\n                    <a class="hero-card" href="{trip_url(t)}">{img(t, "thumb", alt="", lazy=True)}'
        f'<span class="hero-card-caption"><span>{e(t["country"])}</span><strong>{e(t["name"])}</strong></span></a>'
        for i, t in enumerate(TOURS)
    )
    def where_group(region):
        opts = "".join(
            f'<button type="button" class="where-opt" data-dest="{t["id"]}" data-label="{e(t["name"])}, {e(t["country"])}" aria-pressed="false">'
            f'<img src="{photo(t["id"], 160)}" alt="" width="160" height="100" loading="lazy">'
            f'<span><strong>{e(t["name"])}</strong><small>{e(t["country"])} · from {peso(from_price(t))}</small></span></button>'
            for t in TOURS if t["region"] == region)
        return f'\n                                <div class="where-group"><h3 class="continent region-{region.lower()}">{region}</h3>{opts}</div>'
    # Two balanced columns, regions kept in order within each
    cols, heights = [[], []], [0, 0]
    for region in REGIONS:
        i = 0 if heights[0] <= heights[1] else 1
        cols[i].append(region)
        heights[i] += 1 + sum(1 for t in TOURS if t["region"] == region)
    where_groups = "".join(
        '\n                            <div class="where-col">' + "".join(where_group(r) for r in col) + '\n                            </div>'
        for col in cols)
    qty_options = "".join(f'<option value="{n}"{" selected" if n == 2 else ""}>{plural(n, "traveler")}</option>' for n in range(1, RULES["maxPerDeparture"] + 1))
    plans_strip = "".join(f'''
                <article class="card plan-mini{" dark" if p.get("featured") else ""}">
                    <p class="eyebrow">{p["label"]}</p>
                    <h3>{p["name"]}</h3>
                    <p class="price"><span class="price-from">Starting from</span>{peso(p["price"])} <small>/ person · {p["days"]} days</small></p>
                    <p class="muted">{p["summary"]}</p>{plan_deal_line(p)}
                    <a class="btn{" accent" if p.get("featured") else " ghost"}" href="pages/destinations.html?plan={p["id"]}">Book with {p["name"]}</a>
                </article>''' for p in PLANS)
    source_tags = "".join(f'\n                    <source src="{e(src)}" type="{kind}">' for src, kind in HERO_SOURCES)
    days = " and ".join(f"{d}{'th' if d not in (1, 21, 31) else 'st'}" for d in RULES["departureDays"])
    return f'''        <section class="hero-video" aria-labelledby="home-title">
            <div class="hero-media" style="background-image: url('{HERO_POSTER}')">
                <video class="hero-video-el" muted loop playsinline preload="none" poster="{HERO_POSTER}" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1" data-hero-video>{source_tags}
                </video>
            </div>
            <button class="hero-video-toggle" type="button" data-video-toggle hidden>{PAUSE_SVG}<span class="visually-hidden" data-video-toggle-label>Pause background video</span></button>
            <div class="hero-inner">
                <h1 id="home-title"><strong class="heading-strong-primary">Feel more of every place</strong></h1>
                <p class="heading-description">Hand-picked trips across four continents, led by local guides.</p>
            </div>

            <form class="trip-finder" id="trip-finder" action="pages/destinations.html" method="get" aria-label="Find a trip">
                <div class="finder-field finder-where">
                    <span class="finder-label" id="tf-dest-label">Where</span>
                    <button class="finder-btn" type="button" id="tf-dest-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="where-panel" aria-describedby="tf-dest-label"><span id="tf-dest-value">Anywhere</span></button>
                    <input type="hidden" name="dest" id="tf-dest" value="">
                    <div class="finder-panel where-panel" id="where-panel" role="dialog" aria-modal="false" aria-labelledby="where-title" hidden>
                        <div class="panel-head">
                            <h2 class="panel-title" id="where-title">Where to?</h2>
                            <button type="button" class="where-opt where-any" data-dest="" data-label="Anywhere" aria-pressed="true">Anywhere</button>
                        </div>
                        <div class="where-groups">{where_groups}
                        </div>
                    </div>
                </div>
                <div class="finder-field finder-when">
                    <span class="finder-label" id="tf-when-label">When</span>
                    <button class="finder-btn" type="button" id="tf-when" aria-haspopup="dialog" aria-expanded="false" aria-controls="when-panel" aria-describedby="tf-when-label"><span id="tf-when-value">Any date</span></button>
                    <input type="hidden" name="date" id="tf-date" disabled>
                    <div class="finder-panel when-panel" id="when-panel" role="dialog" aria-modal="false" aria-labelledby="when-title" hidden>
                        <div class="panel-head">
                            <h2 class="panel-title" id="when-title">Pick a departure date</h2>
                        </div>
                        <div class="when-dates">
                            <div class="cal-nav">
                                <button type="button" class="cal-arrow" data-cal-prev aria-label="Previous month">{CHEVRON_L}</button>
                                <button type="button" class="cal-arrow" data-cal-next aria-label="Next month">{CHEVRON_R}</button>
                            </div>
                            <div class="cal-months" data-cal-months></div>
                            <p class="when-note">Trips leave on the {days} of every month. Pick a highlighted date.</p>
                        </div>
                        <div class="when-foot">
                            <button type="button" class="link-btn" data-when-clear>Any date</button>
                            <button type="button" class="btn small" data-when-done>Done</button>
                        </div>
                    </div>
                </div>
                <div class="finder-field">
                    <label for="tf-qty">Travelers</label>
                    <select id="tf-qty" name="qty">{qty_options}</select>
                </div>
                <button class="finder-go" type="submit">Find my trip</button>
            </form>
        </section>
        <p class="finder-alt">Not sure yet? <a href="pages/plans.html">Compare plans</a> or <a href="pages/destinations.html">see all destinations</a>.</p>

        <section class="home-section strip-section" aria-labelledby="strip-title">
            <div class="section-head">
                <div><h2 id="strip-title">Where to next?</h2><p>{len(TOURS)} places, one small group at a time.</p></div>
                <a class="section-link" href="pages/destinations.html">See all destinations</a>
            </div>
            <div class="hero-carousel">
                <button class="carousel-toggle" type="button" data-carousel-toggle>{PAUSE_SVG}<span class="carousel-toggle-label">Pause</span><span class="visually-hidden"> destination slideshow</span></button>
                <div class="hero-gallery" id="country-carousel" data-country-carousel>{carousel}
                </div>
            </div>
        </section>

        <section class="home-section" aria-labelledby="how-title">
            <div class="section-head">
                <div><h2 id="how-title">How booking works</h2><p>Three steps from daydream to departure.</p></div>
            </div>
            <ol class="how-grid">
                <li class="card how-step"><span class="step-no" aria-hidden="true">1</span><h3>Pick a plan</h3><p>Wander, Discover or Explore More. Each sets your trip length, hotel level and how many guided experiences are included.</p></li>
                <li class="card how-step"><span class="step-no" aria-hidden="true">2</span><h3>Choose a destination</h3><p>{len(TOURS)} hand-picked places across Asia, Europe, Africa and Oceania. Each has its own price per plan, shown before you book.</p></li>
                <li class="card how-step"><span class="step-no" aria-hidden="true">3</span><h3>Book and relax</h3><p>Pick a departure date, add it to your cart and check out. A trip specialist takes it from there, visa checklist included.</p></li>
            </ol>
        </section>

        <section class="home-section" aria-labelledby="plans-title">
            <div class="section-head">
                <div><h2 id="plans-title">Plans at a glance</h2><p>Every destination is available on all three plans.</p></div>
                <a class="section-link" href="pages/plans.html">Compare plans</a>
            </div>
            <div class="plans-strip">{plans_strip}
            </div>
        </section>'''


HOME_TITLE = f"{SITE['name']}"
NOSCRIPT_CAROUSEL = "\n    <noscript><style>.hero-gallery { opacity: 1; overflow-x: auto; }</style></noscript>"
HOME_DESC = f"Small-group journeys to {len(TOURS)} hand-picked destinations. Pick a plan, choose a destination and book online in minutes."


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
def build_pages():
    # 1. Home ------------------------------------------------------------------
    page("index.html", HOME_TITLE, HOME_DESC, home_body(), "index.html", ("prelim.js", "home.js"), jsonld=[AGENCY_LD],
         head_extra=NOSCRIPT_CAROUSEL)

    # 2. Sign in ----------------------------------------------------------------
    login_body = '''        <section class="auth-section">
            <div class="auth-content">
                <h1 class="page-title">Sign in</h1>
                <p class="heading-description">Create an account to keep your bookings in one place, check out faster, and pick up where you left off.</p>

                <div class="auth-feature">
                    <div class="auth-feature-icon" aria-hidden="true">&#10022;</div>
                    <div class="auth-feature-text">
                        <h2>All your bookings, one page</h2>
                        <p>Every order placed with your email shows up in your account with its reference, dates and payment status.</p>
                    </div>
                </div>
                <div class="auth-feature">
                    <div class="auth-feature-icon" aria-hidden="true">&#10022;</div>
                    <div class="auth-feature-text">
                        <h2>Faster checkout</h2>
                        <p>Your name and email are filled in for you, so booking your next trip takes less than a minute.</p>
                    </div>
                </div>
            </div>

            <div class="auth-card-wrapper">
                <div class="auth-card">
                    <h2 id="auth-title">Welcome back</h2>
                    <div class="auth-tabs" role="tablist" aria-label="Sign in or create an account">
                        <button type="button" role="tab" id="tab-signin" data-tab="signin" aria-controls="form-signin" aria-selected="true" class="active">Sign in</button>
                        <button type="button" role="tab" id="tab-signup" data-tab="signup" aria-controls="form-signup" aria-selected="false" tabindex="-1">Create account</button>
                    </div>

                    <form class="form" id="form-signin" role="tabpanel" aria-labelledby="tab-signin" novalidate>
                        <div class="field">
                            <label for="si-email">Email</label>
                            <input class="contact-input" id="si-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" aria-required="true">
                            <span class="field-error"></span>
                        </div>
                        <div class="field">
                            <label for="si-pass">Password</label>
                            <div class="password-wrap">
                                <input class="contact-input" id="si-pass" name="password" type="password" autocomplete="current-password" aria-required="true">
                                <button class="password-toggle" type="button" data-toggle-password="si-pass" aria-label="Show password">Show</button>
                            </div>
                            <span class="field-error"></span>
                        </div>
                        <p class="notice bad form-message" role="alert" hidden></p>
                        <button class="btn block" type="submit">Sign in</button>
                        <button class="link-btn" type="button" id="forgot-toggle" aria-expanded="false" aria-controls="forgot-note">Forgot your password?</button>
                        <div class="notice forgot-note" id="forgot-note" hidden>
                            <p>Accounts are saved in this browser, so we can't email a reset link. You can remove the account from this device and create it again with a new password. Bookings made with that email will still be there.</p>
                            <p><button class="link-btn" type="button" id="forgot-remove">Remove the account for the email above</button></p>
                            <p class="forgot-result" id="forgot-result" role="status"></p>
                        </div>
                    </form>

                    <form class="form" id="form-signup" role="tabpanel" aria-labelledby="tab-signup" novalidate hidden>
                        <div class="field">
                            <label for="su-name">Full name</label>
                            <input class="contact-input" id="su-name" name="name" type="text" autocomplete="name" placeholder="Juan Dela Cruz" aria-required="true">
                            <span class="field-error"></span>
                        </div>
                        <div class="field">
                            <label for="su-email">Email</label>
                            <input class="contact-input" id="su-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" aria-required="true">
                            <span class="field-error"></span>
                        </div>
                        <div class="field">
                            <label for="su-pass">Password <span class="hint">(at least 8 characters)</span></label>
                            <div class="password-wrap">
                                <input class="contact-input" id="su-pass" name="password" type="password" autocomplete="new-password" minlength="8" aria-required="true">
                                <button class="password-toggle" type="button" data-toggle-password="su-pass" aria-label="Show password">Show</button>
                            </div>
                            <span class="field-error"></span>
                        </div>
                        <div class="field">
                            <label for="su-confirm">Confirm password</label>
                            <input class="contact-input" id="su-confirm" name="confirm" type="password" autocomplete="new-password" aria-required="true">
                            <span class="field-error"></span>
                        </div>
                        <div class="field">
                            <label class="check"><input type="checkbox" id="su-terms" name="terms"> <span>I agree to the <a href="pages/terms.html">terms of service and privacy policy</a>.</span></label>
                            <span class="field-error"></span>
                        </div>
                        <p class="notice bad form-message" role="alert" hidden></p>
                        <button class="btn block" type="submit">Create account</button>
                    </form>

                    <p class="auth-disclaimer">Your account is stored in this browser. Use the same device to see your bookings later.</p>
                </div>
            </div>
        </section>'''
    page("pages/sign-in.html", "Sign in", "Sign in or create a Tripelago account to keep your bookings and saved trips in one place.",
         login_body, None, ("login.js",), noindex=True)

    # 3. About ------------------------------------------------------------------
    about_img = img({"id": "about", "alt": "A traveler with a backpack walking down a narrow old-town street"}, "about")
    about_body = f'''        <section class="philosophy-section">
            <div class="philosophy-intro">
                <h1 class="page-title">About us</h1>
                <p class="heading-description">We believe travel should be more than checking off landmarks. It's about genuine connection, unhurried exploration, and leaving a positive footprint.</p>

                <div class="philosophy-image">
                    {about_img}
                </div>

                <a class="btn" href="pages/plans.html">Compare plans</a>
                <p class="philosophy-note">Every departure is limited to {RULES["maxPerDeparture"]} travelers to keep it personal.</p>
            </div>

            <div class="philosophy-pillars">
                <article class="pillar-item">
                    <h2><span class="pillar-icon" aria-hidden="true"><svg width="20" height="20" {ICON_ATTRS}><circle cx="9" cy="8" r="3.2"></circle><path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6"></path><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.6c1.9.6 3.1 2.4 3.5 5.4"></path></svg></span>Small groups</h2>
                    <p>No crowds, no umbrellas to follow. Just you and a few fellow curious travelers experiencing a place naturally.</p>
                </article>
                <article class="pillar-item">
                    <h2><span class="pillar-icon" aria-hidden="true"><svg width="20" height="20" {ICON_ATTRS}><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg></span>Local guides</h2>
                    <p>Discover hidden gems and authentic stories directly from the people who proudly call the destination home.</p>
                </article>
                <article class="pillar-item">
                    <h2><span class="pillar-icon" aria-hidden="true"><svg width="20" height="20" {ICON_ATTRS}><path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"></path><circle cx="7" cy="10.5" r="1.8"></circle></svg></span>Thoughtful stays</h2>
                    <p>We skip the giant chains for smaller hotels with character, from curated 3-star stays on Wander to boutique hotels on Explore More.</p>
                </article>
                <article class="pillar-item">
                    <h2><span class="pillar-icon" aria-hidden="true"><svg width="20" height="20" {ICON_ATTRS}><circle cx="6" cy="18" r="2.5"></circle><circle cx="18" cy="6" r="2.5"></circle><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"></path></svg></span>Seamless journeys</h2>
                    <p>We plan the route, the timing and the guides. On Discover and Explore More we handle your airport transfers too, so you can focus on the moment.</p>
                </article>
                <article class="pillar-item">
                    <h2><span class="pillar-icon" aria-hidden="true"><svg width="20" height="20" {ICON_ATTRS}><path d="M3 12V4h8l10 10-8 8z"></path><circle cx="7.5" cy="8.5" r="1.4"></circle></svg></span>Honest pricing</h2>
                    <p>One clear price per person for each destination and plan, shown before you book. No resort fees and no surprise add-ons at the airport.</p>
                </article>
            </div>
        </section>'''
    page("pages/about.html", "About us", "Small groups, local guides, thoughtful stays and honest pricing: how Tripelago designs its journeys.",
         about_body, "pages/about.html")

    # 4. Plans ------------------------------------------------------------------
    # What each plan includes: (status, text). yes = included, extra = optional add-on, no = not included.
    # Every card lists the same topics in the same order so the rows line up across plans;
    # the topics a plan can leave out (insurance, transfers, breakfast) come last.
    features = [
        lambda p: ("yes", p["hotel"]),
        lambda p: ("yes", p["experiences"]),
        lambda p: ("yes", p["specialist"]),
        lambda p: ("yes", "Free date changes up to 30 days before"),
        lambda p: ("yes", "Travel insurance included") if p["insuranceIncluded"] else ("extra", f"Optional travel insurance, {peso(RULES['insurancePrice'])} / person"),
        lambda p: ("no", "No airport transfers") if p["transfers"] == "Not included" else ("yes", p["transfers"]),
        lambda p: ("no", "No breakfast") if p["breakfast"] == "Not included" else ("yes", p["breakfast"]),
    ]
    marks = {"yes": CHECK_SVG, "extra": PLUS_SVG, "no": DASH_SVG}

    def plan_column(p):
        feat = p.get("featured")
        listed = [f(p) for f in features]
        items = "".join(
            f'\n                        <li class="plan-row is-{st}"><span class="mark" aria-hidden="true">{marks[st]}</span>{e(txt)}</li>'
            for st, txt in listed)
        return f'''
                <article class="plan-col{" featured" if feat else ""}" aria-labelledby="plan-{p["id"]}">
                    <div class="plan-col-head">
                        {POPULAR_TAG if feat else ""}
                        <p class="plan-col-label">{p["label"]}</p>
                        <h2 id="plan-{p["id"]}">{p["name"]}</h2>
                        <p class="plan-col-price"><span class="price-from">Starting from</span><strong>{peso(p["price"])}</strong> <small>/ person</small></p>
                        <p class="plan-len"><span>{p["days"]} days</span><span>{p["nights"]} nights</span></p>
                        <p class="plan-col-summary">{p["summary"]}</p>
                        <a class="btn block{" accent" if feat else " ghost"}" href="pages/destinations.html?plan={p["id"]}">Choose {p["name"]}</a>
                    </div>
                    <ul class="plan-col-list" aria-label="What {p["name"]} includes">{items}
                    </ul>
                </article>'''

    def plan_range(p):
        prices = [t["prices"][p["id"]] for t in TOURS]
        return f'{p["name"]} {peso(min(prices))}–{peso(max(prices))}'
    plans_body = f'''        <section class="page plans-page" id="compare" aria-labelledby="plans-title">
            <div class="section-head plans-head">
                <div><h1 id="plans-title">Plans</h1><p>Three ways to travel, available for every destination. Compare what's included, then choose a destination.</p></div>
                <a class="section-link" href="pages/faq.html">Booking questions</a>
            </div>

            <div class="plan-matrix">
{"".join(plan_column(p) for p in PLANS)}
            </div>

            <p class="pricing-note">Prices are per person (twin share) and depend on where you go: {", ".join(plan_range(p) for p in PLANS)}. Every destination page shows its exact price. Airfare is not included.</p>
        </section>

        <section class="page" id="deals" aria-labelledby="deals-title">
            <div class="section-head">
                <div><h2 id="deals-title">This season's plan deals</h2><p>One code per booking. Deals stack with the 10% group discount and don't apply to travel insurance.</p></div>
            </div>
            <div class="deal-grid">{deals_grid()}
            </div>
        </section>'''
    page("pages/plans.html", "Plans", "Compare the Wander, Discover and Explore More plans: trip length, hotels, transfers, guided experiences and price.",
         plans_body, "pages/plans.html")

    # 5. Mobile app -------------------------------------------------------------
    download_body = f'''        <section class="download-section">
            <div class="download-content">
                <h1 class="page-title">Mobile app</h1>
                <p class="heading-description">Access your daily itineraries, chat with your local guide, and use offline maps for hidden gems on the go with the Tripelago mobile app. We're putting the finishing touches on it now.</p>

                <ul class="app-features">
                    <li><span><strong>Daily itinerary</strong> with times, meeting points and what to bring</span></li>
                    <li><span><strong>Guide chat</strong> that works on hotel wifi and roaming data</span></li>
                    <li><span><strong>Offline maps</strong> with your guide's favorite spots pinned</span></li>
                </ul>

                <form class="form waitlist-form" id="waitlist-form" novalidate>
                    <div class="field">
                        <label for="wl-email">Join the launch waitlist</label>
                        <div class="inline-form">
                            <input class="contact-input" id="wl-email" name="email" type="email" placeholder="you@example.com" autocomplete="email" aria-required="true" aria-describedby="wl-hint">
                            <button class="btn" type="submit">Notify me</button>
                        </div>
                        <span class="field-error"></span>
                        <span class="hint" id="wl-hint">Coming to the App Store and Google Play. One email on launch day, nothing else.</span>
                    </div>
                </form>
                <p class="notice good waitlist-done" id="waitlist-done" tabindex="-1" hidden>You're on the list. We'll email <strong id="waitlist-email"></strong> on launch day.</p>
                <div class="notice waitlist-done" id="waitlist-mail" tabindex="-1" hidden>
                    <p>One more step: send us a quick email from <strong id="waitlist-mail-email"></strong> to join the list.</p>
                    <p><a class="btn small" id="waitlist-mail-link" href="mailto:{SITE["email"]}">Email us to join</a></p>
                    <p class="small-note">Or write to {e(SITE["email"])} with the subject "App waitlist".</p>
                </div>
            </div>

            <div class="download-mockups">
                <img src="assets/img/app/mockup-desktop.webp" alt="Preview of Tripelago on a laptop" class="mockup-desktop" width="1200" height="781" loading="lazy">
                <img src="assets/img/app/mockup-mobile.webp" alt="Preview of the Tripelago app on a phone" class="mockup-mobile" width="540" height="1140" loading="lazy">
            </div>
        </section>'''
    page("pages/app.html", "Mobile app", "Join the waitlist for the Tripelago mobile app: daily itineraries, guide chat and offline maps.",
         download_body, None, ("waitlist.js",))

    # 6. Contact ----------------------------------------------------------------
    hours_rows = "".join(f"<li><span>{e(d)}</span><span>{e(t)}</span></li>" for d, t in SITE["hours"])
    contact_body = f'''        <section class="contact-section">
            <div class="contact-info">
                <h1 class="page-title">Contact us</h1>

                <div class="contact-detail-item">
                    <div class="contact-detail-icon" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" focusable="false"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <div class="contact-detail-text">
                        <h2>Trip specialists</h2>
                        <a href="mailto:{SITE["email"]}">{e(SITE["email"])}</a><br>
                        <a href="tel:{SITE["phone_href"]}">{e(SITE["phone"])}</a>
                    </div>
                </div>

                <div class="contact-detail-item">
                    <div class="contact-detail-icon" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" focusable="false"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </div>
                    <div class="contact-detail-text">
                        <h2>Main office</h2>
                        {"<br>".join(e(line) for line in SITE["address"])}
                    </div>
                </div>

                <div class="contact-detail-item">
                    <div class="contact-detail-icon" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" focusable="false"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
                    </div>
                    <div class="contact-detail-text contact-hours">
                        <h2>Office hours</h2>
                        <ul class="hours">{hours_rows}</ul>
                    </div>
                </div>

                <p class="contact-detail-text">Looking for a quick answer? Check the <a href="pages/faq.html">booking FAQ</a> first.</p>
            </div>

            <div class="contact-form-wrapper">
                <div class="contact-card">
                    <h2>Send us a message</h2>
                    <form class="form" id="contact-form" novalidate>
                        <div class="form-row">
                            <div class="field">
                                <label for="name">Name</label>
                                <input type="text" id="name" name="name" class="contact-input" autocomplete="name" aria-required="true">
                                <span class="field-error"></span>
                            </div>
                            <div class="field">
                                <label for="email">Email</label>
                                <input type="email" id="email" name="email" class="contact-input" autocomplete="email" aria-required="true">
                                <span class="field-error"></span>
                            </div>
                        </div>
                        <div class="field">
                            <label for="topic">Topic</label>
                            <select id="topic" name="topic" class="contact-input" aria-required="true">
                                <option value="">Choose one…</option>
                                <option value="booking">A booking I've made</option>
                                <option value="planning">Help planning a trip</option>
                                <option value="group">Group or corporate travel</option>
                                <option value="other">Something else</option>
                            </select>
                            <span class="field-error"></span>
                        </div>
                        <div class="field">
                            <label for="message">Message</label>
                            <textarea id="message" name="message" class="contact-input" rows="5" placeholder="Tell us where you'd like to go, your dates, and anything else that helps." aria-required="true"></textarea>
                            <span class="field-error"></span>
                        </div>
                        <p class="notice bad" id="contact-failure" tabindex="-1" hidden>We couldn't send your message just now. Please try again, or email us at {e(SITE["email"])}.</p>
                        <button type="submit" class="btn">Send message</button>
                        <p class="form-footnote">We reply within one business day.</p>
                    </form>
                    <div class="contact-form-success" id="contact-success" tabindex="-1" hidden>
                        <h3>Thanks, <span id="contact-success-name">there</span>!</h3>
                        <p>Your message is in. A trip specialist will reply within one business day.</p>
                        <button class="btn ghost" type="button" id="contact-again">Send another message</button>
                    </div>
                    <div class="contact-form-success" id="contact-ready" tabindex="-1" hidden>
                        <h3>Your message is ready to send</h3>
                        <p>Send it from your email app and a trip specialist will reply within one business day.</p>
                        <div class="actions centered">
                            <a class="btn" id="contact-mail" href="mailto:{SITE["email"]}">Open my email app</a>
                            <button class="btn ghost" type="button" id="contact-copy">Copy message</button>
                        </div>
                        <textarea class="contact-input copy-fallback" id="contact-copy-text" rows="6" aria-label="Your message, ready to copy" hidden></textarea>
                        <p class="small-note">Or email {e(SITE["email"])} directly.</p>
                        <button class="link-btn" type="button" id="contact-edit">Edit my message</button>
                    </div>
                </div>
            </div>
        </section>'''
    page("pages/contact.html", "Contact us", f"Talk to a Tripelago trip specialist by email, phone or message. Office in Ortigas Center, Pasig City. {SITE['hours_short']}.",
         contact_body, "pages/contact.html", ("contact.js",), jsonld=[AGENCY_LD])

    # 8. Destinations -----------------------------------------------------------
    regions = REGIONS
    cards = "\n".join(tour_card(t, i) for i, t in enumerate(TOURS))
    dest_body = f'''        <section class="page">
            <div class="page-head">
                <h1>Destinations</h1>
                <p>{len(TOURS)} places across four continents, each available on every plan.</p>
            </div>

            <div class="filter-panel">
                <div class="filter-top">
                    <div class="filter-search">
                        <label class="visually-hidden" for="search">Search destinations</label>
                        <svg class="filter-search-icon" width="18" height="18" {ICON_ATTRS}><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M20 20l-4.6-4.6"></path></svg>
                        <input class="contact-input" id="search" type="search" placeholder="Search a city or country" autocomplete="off">
                    </div>
                    <div class="filter-pill filter-plan">
                        <label for="price-plan">Prices for</label>
                        <select id="price-plan">{"".join(f'<option value="{p["id"]}">{p["name"]} · {p["days"]} days</option>' for p in PLANS)}</select>
                    </div>
                    <div class="filter-pill filter-sort">
                        <label for="sort">Sort</label>
                        <select id="sort">
                            <option value="recommended">Recommended</option>
                            <option value="price-asc">Price: low to high</option>
                            <option value="price-desc">Price: high to low</option>
                            <option value="name">Name A–Z</option>
                        </select>
                    </div>
                    <button type="button" class="region-chip saved-chip" data-region="saved" aria-pressed="false"><span class="chip-heart">{HEART_SVG}</span>Saved <span class="chip-count" data-saved-count>0</span></button>
                </div>
                <div class="region-tabs" role="group" aria-label="Region">
                    <button type="button" class="region-chip region-tab active" data-region="all" aria-pressed="true">All <span class="tab-count">{len(TOURS)}</span></button>{"".join(f'<button type="button" class="region-chip region-tab continent region-{r.lower()}" data-region="{r}" aria-pressed="false">{r} <span class="tab-count">{sum(1 for t in TOURS if t["region"] == r)}</span></button>' for r in regions)}
                </div>
            </div>
            <p class="result-count" id="result-count" role="status">Showing all {len(TOURS)} destinations</p>

            <h2 class="visually-hidden">Destinations</h2>
            <div class="tour-grid" id="tour-grid">
{cards}
            </div>
            <div class="card empty-card" id="empty-results" hidden>
                <h3 id="empty-title">No matches</h3>
                <p id="empty-text">Try another spelling, or clear the filters to see every destination.</p>
                <button class="btn ghost" type="button" id="clear-filters">Show all destinations</button>
            </div>
        </section>'''
    page("pages/destinations.html", "Destinations", f"Browse {len(TOURS)} hand-picked destinations across Asia, Europe, Africa and Oceania, from {peso(from_price(TOURS[0]))} per person.",
         dest_body, "pages/destinations.html", ("destinations.js",))

    # 9. Trip pages -------------------------------------------------------------
    incl_rows = [
        ("Trip length", lambda p: f'{p["days"]}D{p["nights"]}N', None),
        ("Accommodation", lambda p: p["hotel"], None),
        ("Transfers", lambda p: p["transfers"], lambda p: p["transfers"] != "Not included"),
        ("Guided experiences", lambda p: p["experiences"], None),
        ("Breakfast", lambda p: p["breakfast"], lambda p: p["breakfast"] != "Not included"),
        ("Travel insurance", lambda p: "Included" if p["insuranceIncluded"] else f"+{peso(RULES['insurancePrice'])} / person", lambda p: p["insuranceIncluded"]),
        ("Trip specialist", lambda p: p["specialist"], lambda p: p["id"] == "explore"),
    ]
    default_plan = PLAN["discover"]
    for t in TOURS:
        plan_opts = "".join(f'''
                            <label class="plan-option{" checked" if p.get("featured") else ""}">
                                <input type="radio" name="plan" value="{p["id"]}"{" checked" if p.get("featured") else ""}>
                                <span><strong>{p["name"]}</strong><small>{p["days"]} days, {p["nights"]} nights</small></span>
                                <b>{peso(unit(t, p["id"]))}</b>
                            </label>''' for p in PLANS)
        table_rows = ""
        for label, fn, yes in incl_rows:
            cells = ""
            for p in PLANS:
                cls = ("yes" if yes(p) else "no") if yes is not None else ""
                cur = " current" if p.get("featured") else ""
                cells += f'<td class="{(cls + cur).strip()}" data-plan-col="{p["id"]}">{fn(p)}</td>'
            table_rows += f'\n                            <tr><th scope="row">{label}</th>{cells}</tr>'

        others = [o for o in TOURS if o["region"] == t["region"] and o["id"] != t["id"]][:3]
        if len(others) < 3:
            others += [o for o in TOURS if o["id"] != t["id"] and o not in others][: 3 - len(others)]
        related = "\n".join(tour_card(o, i) for i, o in enumerate(others))
        days = itinerary(t, default_plan)
        itin = "".join(f'<li><span class="day">Day {i + 1}</span><span>{e(text)}</span></li>' for i, text in enumerate(days))
        u = unit(t, "discover")

        tour_body = f'''        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a> <span aria-hidden="true">/</span> <a href="pages/destinations.html">Destinations</a> <span aria-hidden="true">/</span> <span aria-current="page">{e(t["name"])}</span></nav>
        <div class="tour-hero">
            {img(t, "hero", lazy=False)}
            <button class="save-btn save-btn-lg" type="button" data-save="{t["id"]}" aria-pressed="false" aria-label="Save {e(t["name"])} to saved trips">{HEART_SVG}<span class="save-label">Save</span></button>
            <div class="tour-hero-text">
                <span class="chip continent region-{t["region"].lower()}">{e(t["country"])} · {t["region"]}</span>
                <h1>{e(t["name"])}</h1>
                <p>{e(t["tagline"])}</p>
            </div>
        </div>

        <section class="page tour-page">
            <div class="tour-layout">
                <div class="tour-body">
                    <dl class="tour-facts">
                        <div class="fact"><dt>Best time to go</dt><dd>{e(t["best_time"])}</dd></div>
                        <div class="fact"><dt>Pace</dt><dd>{t["pace"]}</dd></div>
                        <div class="fact"><dt>Getting there</dt><dd>{e(t["flight"])}</dd></div>
                    </dl>

                    <h2>About this trip</h2>
                    <p>{e(t["description"])}</p>

                    <h2>Highlights</h2>
                    <ul class="highlights">{"".join(f"<li>{e(h)}</li>" for h in t["highlights"])}</ul>
                    <p class="small-note">How many highlights you visit depends on your plan. The sample itinerary below updates when you change plans.</p>

                    <h2>Sample itinerary <span class="h2-note">(<span data-plan-days>{default_plan["days"]} days, {default_plan["nights"]} nights</span>)</span></h2>
                    <ol class="itinerary" id="itinerary">{itin}</ol>
                    <p class="small-note">The order of days may change with weather and local events. Your final itinerary is confirmed 14 days before departure.</p>

                    <h2>What's included <span class="h2-note">(<span data-plan-name>{default_plan["name"]}</span> plan)</span></h2>
                    <ul class="highlights" id="plan-inclusions">{"".join(f"<li>{e(x)}</li>" for x in plan_inclusions(default_plan))}</ul>
                    <p><a class="section-link" href="pages/plans.html#compare">Compare plans</a></p>
                    <p class="small-note">Not included on any plan: international and domestic airfare, visa fees, meals not listed and personal expenses. Our specialists can book flights for you at cost.</p>
                </div>

                <aside class="card book-widget" id="book" tabindex="-1" aria-labelledby="book-title">
                    <form id="book-form" novalidate>
                        <h2 id="book-title">Book {e(t["name"])}</h2>
                        <p class="from-price">From <strong>{peso(from_price(t))}</strong> per person, twin share · airfare not included</p>

                        <fieldset class="plan-options">
                            <legend class="field-legend">Plan</legend>{plan_opts}
                        </fieldset>

                        <div class="field">
                            <label for="date">Departure date</label>
                            <select class="contact-input" id="date" name="date" aria-required="true"><option value="">Choose a date…</option></select>
                            <span class="field-error"></span>
                        </div>

                        <div class="field qty-field">
                            <span class="field-label" id="qty-label">Travelers <span class="hint">(up to {RULES["maxPerDeparture"]})</span></span>
                            <div class="qty-stepper" role="group" aria-labelledby="qty-label">
                                <button type="button" id="qty-minus" aria-label="One fewer traveler" disabled>−</button>
                                <input type="number" id="qty" inputmode="numeric" min="1" max="{RULES["maxPerDeparture"]}" value="1" aria-labelledby="qty-label">
                                <button type="button" id="qty-plus" aria-label="One more traveler">+</button>
                            </div>
                        </div>

                        <label class="check insurance-row" id="insurance-row" hidden><input type="checkbox" id="insurance"> <span>Add travel insurance, {peso(RULES["insurancePrice"])} per traveler</span></label>
                        <p class="included-note" id="insurance-included">Travel insurance is included with this plan.</p>

                        <div class="price-lines" aria-live="polite">
                            <div><span id="p-unit">{peso(u)} × 1</span><span id="p-gross">{peso(u)}</span></div>
                            <div class="discount" id="p-discount-row" hidden><span>Group discount (10%)</span><span id="p-discount">−₱0.00</span></div>
                            <div id="p-insurance-row" hidden><span>Travel insurance</span><span id="p-insurance">₱0.00</span></div>
                            <div class="total"><span>Total</span><b id="p-total">{peso(u)}</b></div>
                        </div>
                        <p class="promo-hint" id="promo-hint">Add <strong>2 more travelers</strong> to get 10% off this trip.</p>

                        <button class="btn block" type="submit">Add to cart</button>
                        <p class="notice in-cart" id="in-cart" hidden></p>
                        <p class="book-note">No payment now. We confirm your seats and send payment instructions within one business day.</p>
                    </form>
                </aside>
            </div>
        </section>

        <section class="page related" aria-labelledby="related-title">
            <div class="section-head">
                <div><h2 id="related-title">You might also like</h2></div>
                <a class="section-link" href="pages/destinations.html">See all destinations</a>
            </div>
            <div class="tour-grid three">
{related}
            </div>
        </section>'''

        book_bar = f'''    <div class="book-bar" id="book-bar">
        <div class="book-bar-price"><span id="book-bar-plan">{default_plan["name"]}</span><strong id="book-bar-price">{peso(u)}</strong><small>per person</small></div>
        <a class="btn" href="#book">Book this trip</a>
    </div>
'''
        trip_ld = {
            "@context": "https://schema.org",
            "@type": "TouristTrip",
            "name": f"{t['name']}, {t['country']}",
            "description": t["tagline"],
            "touristType": "Small-group travelers",
            "itinerary": {"@type": "ItemList", "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": h} for i, h in enumerate(t["highlights"])]},
            "offers": [{"@type": "Offer", "name": f"{p['name']} plan ({p['days']} days)", "price": str(unit(t, p["id"])),
                        "priceCurrency": "PHP", "availability": "https://schema.org/InStock"} for p in PLANS],
            "provider": {"@type": "TravelAgency", "name": SITE["name"]},
        }
        page(trip_url(t), f"{t['name']}, {t['country']}",
             f"{t['tagline']} Small-group trips from {peso(from_price(t))} per person, 3 to 8 days.",
             tour_body, "pages/destinations.html", ("tour.js",), f' data-tour="{t["id"]}"', og=og_image(t), jsonld=[trip_ld],
             after_main=book_bar)

    # 10. Cart ------------------------------------------------------------------
    cart_body = f'''        <section class="page">
            <div class="page-head">
                <h1>Your cart</h1>
                <p>Review your trips, then continue to checkout.</p>
            </div>

            <div class="card empty-card cart-empty" id="cart-empty">
                <h2 id="cart-empty-title" tabindex="-1">Your cart is empty</h2>
                <p>Pick a destination and a plan to get started. Saved trips stay on the Destinations page.</p>
                <div class="actions">
                    <a class="btn" href="pages/destinations.html">Browse destinations</a>
                    <a class="btn ghost" href="pages/destinations.html?view=saved">See saved trips</a>
                </div>
            </div>

            <div class="cart-layout" id="cart-layout" hidden>
                <div class="card cart-panel">
                    <h2 class="visually-hidden">Trips in your cart</h2>
                    <p class="notice bad" id="cart-issues" tabindex="-1" hidden>A departure date in your cart is no longer open for booking. Choose a new date for the highlighted trip to continue.</p>
                    <ul class="cart-lines" id="cart-lines"></ul>
                    <div class="cart-foot">
                        <a class="section-link back" href="pages/destinations.html">Add another trip</a>
                        <button class="btn ghost small" type="button" id="clear-cart">Clear cart</button>
                        <div class="clear-confirm" id="clear-confirm" hidden>
                            <span>Remove every trip from your cart?</span>
                            <button class="btn small" type="button" id="clear-yes">Yes, clear cart</button>
                            <button class="btn ghost small" type="button" id="clear-no">Keep my trips</button>
                        </div>
                    </div>
                </div>

                <aside class="card dark summary-card" aria-labelledby="summary-title">
                    <h2 id="summary-title">Summary</h2>
                    <form class="promo-form" id="promo-form">
                        <label class="visually-hidden" for="promo">Promo code</label>
                        <input class="contact-input" id="promo" name="promo" type="text" placeholder="Promo code" autocomplete="off" autocapitalize="characters" spellcheck="false">
                        <button class="btn accent small" type="submit">Apply</button>
                    </form>
                    <p class="notice" id="promo-message" role="status" hidden></p>
                    <button class="link-btn on-dark" type="button" id="promo-remove" hidden>Remove promo code</button>
                    <div class="price-lines">
                        <div><span>Travelers</span><span id="s-travelers">0</span></div>
                        <div><span>Subtotal</span><span id="s-subtotal">₱0.00</span></div>
                        <div class="discount" id="s-group-row" hidden><span>Group discount</span><span id="s-group">−₱0.00</span></div>
                        <div id="s-insurance-row" hidden><span>Travel insurance</span><span id="s-insurance">+₱0.00</span></div>
                        <div class="discount" id="s-code-row" hidden><span id="s-code-label"></span><span id="s-code">−₱0.00</span></div>
                        <div class="total"><span>Total</span><b id="s-total" aria-live="polite">₱0.00</b></div>
                    </div>
                    <a class="btn accent block" id="to-checkout" href="pages/checkout.html">Proceed to checkout</a>
                    <p class="summary-note" id="summary-note">First trip with us? Use <strong>FIRSTTRIP</strong> for 5% off.</p>
                </aside>
            </div>
        </section>'''
    page("pages/cart.html", "Your cart", "Review the trips in your cart, change dates or travelers, add insurance and apply a promo code.",
         cart_body, "pages/cart.html", ("cart.js",), noindex=True)

    # 11. Checkout --------------------------------------------------------------
    checkout_body = f'''        <section class="page">
            <div class="card empty-card" id="checkout-empty" hidden>
                <h1 class="empty-title">Nothing to check out yet</h1>
                <p>Your cart is empty. Add a trip first.</p>
                <a class="btn" href="pages/destinations.html">Browse destinations</a>
            </div>

            <div id="checkout-layout">
                <div class="page-head">
                    <h1>Checkout</h1>
                    <p>Enter the lead traveler's details and place your order.</p>
                </div>

                <div class="checkout-layout">
                    <form class="form" id="checkout-form" novalidate>
                        <div class="card checkout-section">
                            <h2>Lead traveler</h2>
                            <p class="notice" id="signin-prompt">Have an account? <a id="signin-link" href="pages/sign-in.html?next=pages/checkout.html">Sign in</a> to fill this in and keep the booking in your account.</p>
                            <div class="form">
                                <div class="field">
                                    <label for="co-name">Full name <span class="hint">(as on passport)</span></label>
                                    <input class="contact-input" id="co-name" name="name" type="text" autocomplete="name" aria-required="true">
                                    <span class="field-error"></span>
                                </div>
                                <div class="form-row">
                                    <div class="field">
                                        <label for="co-email">Email</label>
                                        <input class="contact-input" id="co-email" name="email" type="email" autocomplete="email" aria-required="true">
                                        <span class="field-error"></span>
                                    </div>
                                    <div class="field">
                                        <label for="co-phone">Mobile number</label>
                                        <input class="contact-input" id="co-phone" name="phone" type="tel" autocomplete="tel" placeholder="0917 123 4567" aria-required="true">
                                        <span class="field-error"></span>
                                    </div>
                                </div>
                                <div class="field">
                                    <label for="co-requests">Special requests <span class="hint">(optional)</span></label>
                                    <textarea class="contact-input" id="co-requests" name="requests" rows="3" placeholder="Dietary needs, accessibility, celebrating something?"></textarea>
                                </div>
                                <p class="small-note" id="c-passport">We'll ask for each traveler's passport details after payment.</p>
                            </div>
                        </div>

                        <div class="card checkout-section">
                            <h2>Payment method</h2>
                            <p class="small-note">No payment is taken on this site. Within one business day we email instructions for the method you choose, and we hold your seats for {RULES["holdBusinessDays"]} business days after that.</p>
                            <fieldset class="pay-options">
                                <legend class="visually-hidden">Payment method</legend>
                                <label class="pay-option"><input type="radio" name="payment" value="gcash" checked><span><strong>GCash</strong><small>Instant confirmation once paid</small></span></label>
                                <label class="pay-option"><input type="radio" name="payment" value="card"><span><strong>Credit or debit card</strong><small>Secure payment link sent by email</small></span></label>
                                <label class="pay-option"><input type="radio" name="payment" value="bank"><span><strong>Bank transfer</strong><small>BPI or BDO, 1–2 business days to clear</small></span></label>
                            </fieldset>
                        </div>

                        <div class="card checkout-section">
                            <div class="field">
                                <label class="check"><input type="checkbox" id="co-terms" name="terms"> <span>I've read the <a href="pages/terms.html">booking terms</a>, including the cancellation policy, and the traveler details are correct.</span></label>
                                <span class="field-error"></span>
                            </div>
                            <p class="notice bad" id="checkout-issues" tabindex="-1" hidden>A departure date in your cart is no longer open for booking. <a href="pages/cart.html">Choose a new date in your cart</a> to continue.</p>
                            <p class="notice bad" id="checkout-error" tabindex="-1" hidden>We couldn't reach our booking system, so nothing was booked. Your cart is saved. Please try again in a minute.</p>
                            <p class="place-total">Total <strong id="c-total-inline"></strong></p>
                            <button class="btn block place-order" type="submit" id="place-order">Place order</button>
                        </div>
                    </form>

                    <aside class="card dark summary-card" aria-labelledby="order-title">
                        <h2 id="order-title">Your order</h2>
                        <ul class="summary-lines" id="summary-lines"></ul>
                        <div class="price-lines">
                            <div><span>Travelers</span><span id="c-travelers">0</span></div>
                            <div><span>Subtotal</span><span id="c-subtotal"></span></div>
                            <div class="discount" id="c-group-row" hidden><span>Group discount</span><span id="c-group"></span></div>
                            <div id="c-insurance-row" hidden><span>Travel insurance</span><span id="c-insurance"></span></div>
                            <div class="discount" id="c-code-row" hidden><span id="c-code-label"></span><span id="c-code"></span></div>
                            <div class="total"><span>Total</span><b id="c-total"></b></div>
                        </div>
                        <p class="notice" id="c-code-note" hidden></p>
                        <a class="section-link back on-dark" href="pages/cart.html">Edit cart</a>
                    </aside>
                </div>
            </div>

            <div class="confirmation" id="confirmation" hidden>
                <span class="mark" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M20 6 9 17l-5-5"></path></svg></span>
                <h1 id="conf-heading" tabindex="-1">Thank you, <span id="conf-name"></span>!</h1>
                <p>Your booking reference is</p>
                <p class="ref" id="conf-ref"></p>

                <div id="conf-sent" hidden>
                    <p>We've received your booking. A trip specialist will email <strong class="conf-email"></strong> with <span class="conf-payment"></span> instructions within one business day, and we'll hold your seats for {RULES["holdBusinessDays"]} business days after that.</p>
                </div>

                <div class="card send-card" id="conf-unsent" hidden>
                    <h2>One more step: send us your booking</h2>
                    <p>Email your booking to our trip specialists so they can confirm your seats and send <span class="conf-payment"></span> instructions to <strong class="conf-email"></strong>.</p>
                    <div class="actions centered">
                        <a class="btn" id="conf-mail" href="mailto:{SITE["email"]}">Email my booking</a>
                        <button class="btn ghost" type="button" id="conf-copy">Copy booking details</button>
                    </div>
                    <textarea class="contact-input copy-fallback" id="conf-copy-text" rows="8" aria-label="Booking details, ready to copy" hidden></textarea>
                    <p class="small-note">Or email the details to {e(SITE["email"])}. We reply within one business day.</p>
                </div>

                <div class="card">
                    <h2 class="eyebrow">Order summary</h2>
                    <ul class="summary-lines light" id="conf-lines"></ul>
                    <div class="price-lines conf-total"><div class="total"><span>Total</span><b id="conf-total"></b></div></div>
                </div>

                <div class="card">
                    <h2 class="eyebrow">What happens next</h2>
                    <ol class="next-steps" id="conf-steps"></ol>
                </div>

                <p class="small-note" id="conf-other-account" hidden>This booking used a different email from the account you're signed in with, so it won't appear on your account page.</p>
                <div class="actions centered">
                    <a class="btn" id="conf-account" href="pages/account.html" hidden>View my bookings</a>
                    <span id="conf-signup" hidden><a class="btn" id="conf-signup-link" href="pages/sign-in.html?tab=signup&amp;next=pages/account.html">Create an account to track this</a></span>
                    <a class="btn ghost" href="pages/destinations.html">Book another trip</a>
                    <button class="btn ghost" type="button" data-print>Print</button>
                </div>
            </div>
        </section>'''
    page("pages/checkout.html", "Checkout", "Enter the lead traveler's details, choose a payment method and place your order.",
         checkout_body, None, ("checkout.js",), noindex=True)

    # 12. Account ---------------------------------------------------------------
    account_body = '''        <section class="page">
            <div class="page-head">
                <h1>My account</h1>
                <p>Your bookings and saved trips.</p>
            </div>
            <div class="account-layout">
                <aside class="card profile" aria-label="Profile">
                    <span class="avatar" id="acct-initial" aria-hidden="true"></span>
                    <h2 id="acct-name"></h2>
                    <p id="acct-email"></p>
                    <p id="acct-since"></p>
                    <div class="profile-links">
                        <a href="#bookings-title">Bookings</a>
                        <a href="#saved-title">Saved trips</a>
                        <a href="pages/contact.html?topic=booking">Get help</a>
                    </div>
                    <button class="btn ghost small" type="button" id="logout">Sign out</button>
                </aside>
                <div class="account-main">
                    <section aria-labelledby="bookings-title">
                        <div class="section-head">
                            <div><h2 id="bookings-title">Booking history</h2><p id="booking-count"></p></div>
                            <a class="section-link" href="pages/destinations.html">Book a new trip</a>
                        </div>
                        <div id="bookings"></div>
                    </section>
                    <section aria-labelledby="saved-title" class="saved-section">
                        <div class="section-head">
                            <div><h2 id="saved-title">Saved trips</h2><p id="saved-count"></p></div>
                            <a class="section-link" href="pages/destinations.html?view=saved">Open in destinations</a>
                        </div>
                        <div class="saved-grid" id="saved-grid"></div>
                    </section>
                </div>
            </div>
        </section>'''
    page("pages/account.html", "My account", "Your Tripelago bookings, payment status and saved trips.", account_body, None, ("account.js",), noindex=True)

    # 13. FAQ -------------------------------------------------------------------
    faq_items = "".join(f'''
                <details{" open" if i == 0 else ""}>
                    <summary>{e(q)}</summary>
                    <p>{e(a)}</p>
                </details>''' for i, (q, a) in enumerate(FAQ))
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
    faq_body = f'''        <section class="page">
            <div class="page-head">
                <h1>FAQ</h1>
                <p>Can't find what you need? <a href="pages/contact.html">Message a trip specialist</a> and we'll reply within one business day.</p>
            </div>
            <div class="faq-list">{faq_items}
            </div>
            <div class="card faq-cta">
                <div>
                    <h2>Still deciding?</h2>
                    <p>Compare what each plan includes, or browse every destination with prices.</p>
                </div>
                <div class="actions">
                    <a class="btn" href="pages/plans.html">Compare plans</a>
                    <a class="btn ghost" href="pages/destinations.html">Browse destinations</a>
                </div>
            </div>
        </section>'''
    page("pages/faq.html", "FAQ", "Answers about booking, payment, group discounts, travel insurance, cancellations and visas.",
         faq_body, None, jsonld=[faq_ld])

    # 14. Terms -----------------------------------------------------------------
    terms_body = f'''        <section class="page">
            <div class="page-head">
                <h1>Terms &amp; privacy</h1>
                <p>Last updated October 2026.</p>
            </div>
            <div class="prose card">
                <nav class="toc" aria-label="On this page">
                    <a href="#booking">Booking and payment</a><a href="#changes">Changes and cancellations</a><a href="#discounts">Discounts</a><a href="#travel">Documents and insurance</a><a href="#privacy">Privacy</a><a href="#site">This website</a>
                </nav>
                <h2 id="booking">1. Booking and payment</h2>
                <p>A booking is confirmed when payment is received. Within one business day of your order we email payment instructions, and seats are held for {RULES["holdBusinessDays"]} business days after that email; unpaid seats are released after that. Prices are quoted in Philippine pesos per person and are the price shown for your destination and plan, per person on a twin-share basis. Airfare, visa fees and personal expenses are not included unless stated.</p>
                <h2 id="changes">2. Changes and cancellations</h2>
                <p>Date or plan changes are free up to 30 days before departure, subject to availability. Cancellations more than 30 days before departure are refunded in full less a ₱2,000 processing fee per person. Cancellations within 30 days are 50% refundable; within 7 days, non-refundable. If Tripelago cancels a departure, you receive a full refund or a free transfer to another date.</p>
                <h2 id="discounts">3. Discounts and promo codes</h2>
                <p>The group discount (10% off a trip with {RULES["groupMin"]} or more travelers on the same destination, plan and date) is applied automatically. One promo code may be used per order and is applied after the group discount; promo codes do not apply to travel insurance. Plan deals (such as {", ".join(d["code"] for d in DEALS)}) only reduce trips booked on the plan they name. Discounts cannot be exchanged for cash. Each departure takes at most {RULES["maxPerDeparture"]} travelers.</p>
                <h2 id="travel">4. Travel documents and insurance</h2>
                <p>Travelers are responsible for holding a valid passport and the visas required for their destination. Basic travel insurance is included on Discover and Explore More plans. Wander travelers may add it for {peso(RULES["insurancePrice"])} per person on the trip page or in the cart. We strongly recommend insurance for every trip.</p>
                <h2 id="privacy">5. Privacy</h2>
                <p>We collect only the details needed to book and operate your trip: your name, contact details, traveler information and payment confirmations. We share them with hotels, guides and transport partners for your booking and never sell them. Messages sent through the contact form are kept for one year. You may ask us to delete your data at any time by writing to {e(SITE["email"])}.</p>
                <h2 id="site">6. About this website</h2>
                <p>Your cart, saved trips, account and booking history are stored in your own browser, so they stay on the device you used. Clearing your browser data removes them. No payment details are collected on the site.</p>
            </div>
        </section>'''
    page("pages/terms.html", "Terms & privacy", "Booking terms, cancellation policy, discounts, insurance and privacy notice for Tripelago.",
         terms_body, None)


# ---------------------------------------------------------------------------
# 404: self-contained so it renders at any URL depth (GitHub Pages, Netlify, sub-paths)
# ---------------------------------------------------------------------------
NOT_FOUND_SCRIPT = """(function () {
    var links = document.querySelectorAll("[data-page]");
    function point(base) {
        for (var i = 0; i < links.length; i++) { links[i].href = base + links[i].getAttribute("data-page"); }
    }
    if (location.protocol === "file:") { point(""); return; }
    point("/");
    var parts = location.pathname.split("/").filter(Boolean);
    var bases = [];
    for (var i = parts.length - 1; i >= 0; i--) { bases.push("/" + parts.slice(0, i).join("/") + (i ? "/" : "")); }
    (function probe(k) {
        if (k >= bases.length || !window.fetch) { return; }
        fetch(bases[k] + "site.webmanifest", { method: "HEAD" }).then(function (res) {
            if (res.ok) { point(bases[k]); } else { probe(k + 1); }
        }).catch(function () { probe(k + 1); });
    })(0);
})();"""


def build_404():
    with open(os.path.join(SITE_ROOT, "assets", "img", "brand", "logo-mark.png"), "rb") as f:
        logo = base64.b64encode(f.read()).decode()
    content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page not found · {e(SITE["name"])}</title>
    <meta name="description" content="The page you were looking for isn't here. Head back to the home page or browse destinations.">
    <meta name="robots" content="noindex">
    <meta name="theme-color" content="#f4f8f9">
    <style>
        *, *::before, *::after {{ box-sizing: border-box; }}
        html {{
            min-height: 100%;
            background-color: #f4f8f9;
        }}
        body {{
            display: grid;
            place-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 2rem 1.25rem;
            color: #0f2a3a;
            font-family: system-ui, "Segoe UI", Roboto, Arial, sans-serif;
            text-align: center;
        }}
        main {{ max-width: 34rem; }}
        .logo {{ display: flex; align-items: center; justify-content: center; gap: 0.6rem; margin: 0 auto 2.5rem; color: #003d5b; font-weight: 800; font-size: 1.5rem; letter-spacing: -0.02em; }}
        .logo img {{ width: 3rem; height: 3rem; }}
        .tag {{ margin: 0; color: #00798c; font-size: 0.85rem; font-weight: 700; }}
        .big {{ margin: 0.2rem 0 0; color: #ad3446; font-size: clamp(5rem, 18vw, 9rem); font-weight: 800; letter-spacing: -0.05em; line-height: 1; }}
        h1 {{ margin: 0.4rem 0 0; font-size: clamp(1.6rem, 4vw, 2.2rem); font-weight: 700; letter-spacing: -0.02em; }}
        p.lead {{ margin: 0.8rem 0 1.8rem; color: rgba(19, 36, 48, 0.72); font-size: 1rem; line-height: 1.6; }}
        .actions {{ display: flex; flex-wrap: wrap; justify-content: center; gap: 0.7rem; }}
        .btn {{ display: inline-flex; align-items: center; min-height: 2.8rem; padding: 0.65rem 1.2rem; border: 1px solid #0f2a3a; border-radius: 999px; background: #0f2a3a; color: #f4f8f9; font-size: 0.8rem; font-weight: 800; text-decoration: none; }}
        .btn.ghost {{ background: rgba(255, 255, 255, 0.6); color: #0f2a3a; border-color: rgba(19, 36, 48, 0.35); }}
        .btn:focus-visible {{ outline: 3px solid #d1495b; outline-offset: 3px; }}
    </style>
</head>
<body>
    <main>
        <p class="logo"><img src="data:image/png;base64,{logo}" alt="" width="96" height="96"><span>{e(SITE["name"])}</span></p>
        <p class="tag">Error 404</p>
        <p class="big" aria-hidden="true">404</p>
        <h1>We couldn't find that page</h1>
        <p class="lead">It may have moved, or the link may be mistyped. Let's get you back on the road.</p>
        <div class="actions">
            <a class="btn" href="index.html" data-page="index.html">Back to home</a>
            <a class="btn ghost" href="pages/destinations.html" data-page="pages/destinations.html">Browse destinations</a>
            <a class="btn ghost" href="pages/contact.html" data-page="pages/contact.html">Contact us</a>
        </div>
    </main>
    <script>{NOT_FOUND_SCRIPT}</script>
</body>
</html>
'''
    write("404.html", content)
    print("wrote 404.html")


# ---------------------------------------------------------------------------
# Deploy files and data.js
# ---------------------------------------------------------------------------
def build_deploy_files():
    script_hash = base64.b64encode(hashlib.sha256(NOT_FOUND_SCRIPT.encode("utf-8")).digest()).decode()
    robots = "User-agent: *\nAllow: /\n"
    base = SITE.get("url", "").strip()
    sitemap_path = os.path.join(SITE_ROOT, "sitemap.xml")
    if base:
        if not base.endswith("/"):
            base += "/"
        public = ["", "pages/destinations.html"] + [trip_url(t) for t in TOURS] + [
            "pages/plans.html", "pages/about.html",
            "pages/app.html", "pages/contact.html", "pages/faq.html", "pages/terms.html"]
        urls = "".join(f"  <url><loc>{e(base + p)}</loc></url>\n" for p in public)
        write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n'
                             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
        robots += f"\nSitemap: {base}sitemap.xml\n"
        print("wrote sitemap.xml")
    elif os.path.exists(sitemap_path):
        os.remove(sitemap_path)
    write("robots.txt", robots)
    write("site.webmanifest", json.dumps({
        "name": SITE["name"],
        "short_name": SITE["short_name"],
        "description": SITE["tagline"],
        "start_url": "index.html",
        "display": "standalone",
        "background_color": "#f4f8f9",
        "theme_color": "#f4f8f9",
        "icons": [
            {"src": "assets/img/brand/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "assets/img/brand/apple-touch-icon.png", "sizes": "180x180", "type": "image/png"},
            {"src": "assets/img/brand/icon-512.png", "sizes": "512x512", "type": "image/png"},
        ],
    }, indent=2) + "\n")
    csp = "; ".join([
        "default-src 'self'",
        f"script-src 'self' 'sha256-{script_hash}'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data:",
        "media-src 'self'",
        "connect-src 'self' https://formspree.io",
        "manifest-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "object-src 'none'",
    ])
    write("_headers", f"""# Security and caching headers for Netlify and Cloudflare Pages (other hosts ignore this file).
/*
  Content-Security-Policy: {csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()

/assets/*
  Cache-Control: public, max-age=604800
""")
    print("wrote robots.txt, site.webmanifest, _headers")


def build_data_js():
    """Only the fields the scripts read; the rest of data.py is already in the HTML."""
    tours = []
    for t in TOURS:
        tours.append({
            "id": t["id"], "name": t["name"], "arrive": t["arrive"], "country": t["country"],
            "prices": t["prices"], "highlights": t["highlights"],
            "img": photo(t["id"], 480),
            "url": trip_url(t),
        })
    plan_keys = ("id", "name", "days", "nights", "insuranceIncluded", "inclusions", "transfers")
    payload = {
        "site": {"email": SITE["email"]},
        "rules": RULES,
        "promos": PROMOS,
        "plans": [{k: p[k] for k in plan_keys} for p in PLANS],
        "tours": tours,
    }
    write("assets/js/data.js", "/* Generated by source/build.py from source/data.py. Edit data.py, then rebuild. */\n"
                     "window.TRIPELAGO_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n")
    print("wrote data.js")


def build_photos():
    """Write the web sizes of each destination photo from source/photos/<id>.webp (needs Pillow)."""
    out_dir = os.path.join(SITE_ROOT, "assets", "img", "destinations")
    os.makedirs(out_dir, exist_ok=True)
    widths = {t["id"]: PHOTO_WIDTHS for t in TOURS}
    widths["about"] = ABOUT_WIDTHS
    todo = [n for n, ws in widths.items() for w in ws
            if not os.path.exists(os.path.join(out_dir, f"{n}-{w}.webp"))
            or os.path.getmtime(os.path.join(out_dir, f"{n}-{w}.webp")) < os.path.getmtime(os.path.join(BUILD_DIR, "photos", f"{n}.webp"))]
    if not todo:
        return
    try:
        from PIL import Image
    except ImportError:
        print("Pillow is not installed, so photo sizes were not regenerated (pip install pillow)")
        return
    for n in sorted(set(todo)):
        master = Image.open(os.path.join(BUILD_DIR, "photos", f"{n}.webp")).convert("RGB")
        for w in widths[n]:
            im = master if w >= master.width else master.resize((w, round(master.height * w / master.width)), Image.LANCZOS)
            im.save(os.path.join(out_dir, f"{n}-{w}.webp"), "WEBP", quality=78 if w <= 480 else 72, method=6)
        print("wrote photos for", n)


if __name__ == "__main__":
    build_photos()
    build_pages()
    build_404()
    build_deploy_files()
    build_data_js()
