# Single source of truth for the site's content and business rules.
# build.py renders the static pages from this file and writes data.js for the browser.
# To change a price, a destination or a rule: edit this file, then run  python source/build.py

SITE = {
    "name": "Tripelago",
    "short_name": "Tripelago",
    "tagline": "Small-group journeys, thoughtful stays and local guides who turn every destination into a story worth keeping.",
    "email": "hello@tripelago.com",
    "phone": "+63 912 345 6789",
    "phone_href": "+639123456789",
    "address": ["12F, 25 Garnet Road", "Ortigas Center, Pasig City 1605"],
    "country": "PH",
    "hours": [
        ("Monday – Friday", "9:00 AM – 6:00 PM"),
        ("Saturday", "9:00 AM – 1:00 PM"),
        ("Sunday & holidays", "Closed"),
    ],
    "hours_short": "Mon–Fri 9 AM–6 PM · Sat 9 AM–1 PM",
    # Your live address, e.g. "https://www.tripelago.com/". Optional: when set, the build
    # also writes sitemap.xml and points search engines to it from robots.txt.
    "url": "",
}

RULES = {
    "groupMin": 3,            # 3 or more travelers on one tour, plan and date…
    "groupRate": 0.10,        # …take 10% off that line
    "maxPerDeparture": 12,    # group size cap per destination and departure date
    "insurancePrice": 1200,   # optional travel insurance per traveler (Wander only)
    "leadDays": 7,            # earliest departure is 7 days from today
    "departureDays": [5, 19], # departures leave on these days of each month
    "departuresShown": 12,    # how many upcoming departures can be booked
    "holdBusinessDays": 2,    # seats are held this long after payment instructions are sent
}

PROMOS = {
    "FIRSTTRIP": {"type": "percent", "value": 5, "label": "5% off your first trip", "firstOrderOnly": True},
    "TRAVELWELL": {"type": "fixed", "value": 3000, "min": 100000, "label": "₱3,000 off orders of ₱100,000 or more"},
    # Plan deals: "plan" limits the code to trips on that plan (after the group discount)
    "ESCAPE8": {"type": "percent", "value": 8, "plan": "wander", "label": "8% off Wander trips"},
    "DUO2000": {"type": "fixed", "value": 2000, "plan": "discover", "minTravelers": 2,
                "label": "₱2,000 off Discover trips for 2 or more travelers"},
    "GOFAR7": {"type": "percent", "value": 7, "plan": "explore", "label": "7% off Explore More trips"},
}

# Deals shown on the home and plans pages. Each one points to a plan code above.
DEALS = [
    {"code": "ESCAPE8", "plan": "wander", "title": "Weekend Escape", "headline": "8% off",
     "text": "Short on leave? Take 8% off any 3-day Wander trip, to any of our destinations.", "tone": "sun"},
    {"code": "DUO2000", "plan": "discover", "title": "Better Together", "headline": "₱2,000 off",
     "text": "Book Discover for two or more travelers on the same order and save ₱2,000.", "tone": "sea"},
    {"code": "GOFAR7", "plan": "explore", "title": "Go the Distance", "headline": "7% off",
     "text": "Make the long trip count: 7% off every 8-day Explore More journey.", "tone": "coral"},
]

PLANS = [
    {
        "id": "wander", "name": "Wander", "label": "Easy getaway",
        "days": 3, "nights": 2, "insuranceIncluded": False,
        "summary": "A simple, well-planned break when you need a change of scenery.",
        "inclusions": ["Curated hotel stay", "Digital destination guide", "One guided local experience"],
        "hotel": "Curated 3-star hotel", "transfers": "Not included", "experiences": "1 guided experience",
        "breakfast": "Not included", "specialist": "Shared support line",
    },
    {
        "id": "discover", "name": "Discover", "label": "The full experience", "featured": True,
        "days": 5, "nights": 4, "insuranceIncluded": True,
        "summary": "The right balance of iconic places, local finds, and time to explore.",
        "inclusions": ["Premium hotel stay", "Airport and hotel transfers", "Three guided experiences", "Daily breakfast included"],
        "hotel": "Premium 4-star hotel", "transfers": "Airport and hotel transfers", "experiences": "3 guided experiences",
        "breakfast": "Daily breakfast", "specialist": "Shared support line",
    },
    {
        "id": "explore", "name": "Explore More", "label": "Made around you",
        "days": 8, "nights": 7, "insuranceIncluded": True,
        "summary": "A longer, tailored journey for travelers ready to see beyond the usual.",
        "inclusions": ["Boutique hotel stays", "Private airport transfers", "Five guided experiences", "Dedicated trip specialist"],
        "hotel": "Boutique hotel stays", "transfers": "Private airport transfers", "experiences": "5 guided experiences",
        "breakfast": "Daily breakfast", "specialist": "Dedicated trip specialist",
    },
]

# prices = what one traveler pays for that destination on each plan, in pesos (twin share, no airfare).
# Researched October 2026 from hotel rates for each hotel class, guided-tour and transfer prices and
# published small-group packages, plus agency margin. The plan's "Starting from" price is the cheapest one.
TOURS = [
    {
        "id": "palawan", "arrive": "El Nido", "name": "Palawan", "country": "Philippines", "region": "Asia", "prices": {"wander": 6900, "discover": 28900, "explore": 67400},
        "photo": "photo-1697473259118-473211915531", "alt": "A turquoise lagoon between limestone cliffs in El Nido, Palawan",
        "tagline": "Limestone cliffs, hidden lagoons and the clearest water in the country.",
        "description": "El Nido and Coron sit at the top of nearly every list of the world's best islands, and for good reason. Our days here move between island-hopping boats, quiet beaches and small family-run kitchens, with enough unplanned time to simply swim.",
        "highlights": ["Island-hopping through the Bacuit archipelago", "Kayaking into the Big and Small Lagoons", "Sunset at Las Cabanas beach", "Snorkeling the coral gardens of Shimizu Island", "A home-cooked seafood dinner in town"],
        "best_time": "November to May (dry season)", "pace": "Relaxed", "flight": "1h 20m from Manila",
    },
    {
        "id": "chiangmai", "arrive": "Chiang Mai", "name": "Chiang Mai", "country": "Thailand", "region": "Asia", "prices": {"wander": 6400, "discover": 26400, "explore": 58400},
        "photo": "photo-1528181304800-259b08848526", "alt": "Gilded temple roofs and a white chedi in Chiang Mai",
        "tagline": "Temples, night markets and the slow rhythm of northern Thailand.",
        "description": "Chiang Mai rewards travelers who take their time. We pair the city's old-town temples and food markets with a day in the hills around Doi Suthep, and leave evenings open for the night bazaar.",
        "highlights": ["Morning alms walk through the Old City", "Doi Suthep temple and viewpoint", "A northern Thai cooking class", "Sunday Walking Street market", "Ethical elephant sanctuary visit"],
        "best_time": "November to February", "pace": "Relaxed", "flight": "4h from Manila",
    },
    {
        "id": "bali", "arrive": "Bali", "name": "Bali", "country": "Indonesia", "region": "Asia", "prices": {"wander": 6400, "discover": 27400, "explore": 59900},
        "photo": "photo-1537996194471-e657df975ab4", "alt": "Ulun Danu Beratan temple on Lake Bratan in Bali",
        "tagline": "Rice terraces, cliffside temples and unhurried mornings in Ubud.",
        "description": "We base this trip in Ubud rather than the busy south, so mornings start with birdsong over the rice fields. Days alternate between temples, waterfalls and workshops, with a final stretch on the coast.",
        "highlights": ["Tegallalang rice terraces at sunrise", "Tirta Empul water temple", "Batik or silver-making workshop", "Uluwatu temple and kecak dance", "Beach day in Canggu"],
        "best_time": "April to October", "pace": "Relaxed", "flight": "4h from Manila",
    },
    {
        "id": "kyoto", "arrive": "Kyoto", "name": "Kyoto", "country": "Japan", "region": "Asia", "prices": {"wander": 13900, "discover": 56400, "explore": 129400},
        "photo": "photo-1624253321171-1be53e12f5f4", "alt": "The Yasaka Pagoda above a narrow street in Kyoto at golden hour",
        "tagline": "Wooden lanes, quiet gardens and a thousand years of tradition.",
        "description": "Kyoto is best taken slowly and early, before the day crowds arrive. We walk the eastern hills at dawn, learn the tea ceremony from a local practitioner, and spend an evening in Pontocho's narrow alleys.",
        "highlights": ["Fushimi Inari before sunrise", "Arashiyama bamboo grove and Tenryu-ji", "Tea ceremony in a machiya townhouse", "Nishiki Market food walk", "Day trip to Nara's deer park"],
        "best_time": "March to May, October to November", "pace": "Moderate", "flight": "4h 30m from Manila",
    },
    {
        "id": "marrakech", "arrive": "Marrakech", "name": "Marrakech", "country": "Morocco", "region": "Africa", "prices": {"wander": 12400, "discover": 44400, "explore": 104900},
        "photo": "photo-1539020140153-e479b8c22e70", "alt": "A tiled fountain framed by carved arches in Marrakech",
        "tagline": "Souks, riads and the red city at the foot of the Atlas Mountains.",
        "description": "Marrakech is loud, colorful and wonderful, and a good guide makes all the difference. We stay in a traditional riad in the medina, then trade the city for the Atlas foothills and a night under desert stars.",
        "highlights": ["Guided walk through the medina souks", "Jardin Majorelle and the YSL museum", "Moroccan cooking class in a riad", "Atlas Mountains village hike", "Overnight in an Agafay desert camp"],
        "best_time": "March to May, September to November", "pace": "Moderate", "flight": "18h from Manila (1 stop)",
    },
    {
        "id": "santorini", "arrive": "Santorini", "name": "Santorini", "country": "Greece", "region": "Europe", "prices": {"wander": 21900, "discover": 90900, "explore": 188400},
        "photo": "photo-1570077188670-e3a8d69ac5ff", "alt": "White houses and blue domes above the sea in Oia, Santorini",
        "tagline": "Whitewashed villages above a volcanic caldera, and the best sunsets in the Aegean.",
        "description": "We stay on the quieter side of the island and travel in for the famous views. Expect caldera walks, a sailing afternoon, volcanic beaches and long dinners with local wine.",
        "highlights": ["Fira to Oia caldera hike", "Catamaran sail with swimming stops", "Wine tasting at a volcanic vineyard", "Red Beach and Akrotiri ruins", "Sunset dinner in Oia"],
        "best_time": "May to June, September to October", "pace": "Relaxed", "flight": "16h from Manila (1 stop)",
    },
    {
        "id": "barcelona", "arrive": "Barcelona", "name": "Barcelona", "country": "Spain", "region": "Europe", "prices": {"wander": 15400, "discover": 62900, "explore": 128400},
        "photo": "photo-1583422409516-2895a77efded", "alt": "Barcelona's Eixample grid and the Sagrada Família seen from above",
        "tagline": "Gaudí, Gothic lanes and tapas bars that stay open until late.",
        "description": "Barcelona mixes beach, architecture and food like few cities can. We cover the Gaudí landmarks with skip-the-line access, then leave the afternoons for the Gothic Quarter and the evenings for tapas crawls.",
        "highlights": ["Sagrada Família with early entry", "Park Güell and Casa Batlló", "Tapas crawl in El Born", "Montserrat day trip", "Beach afternoon in Barceloneta"],
        "best_time": "April to June, September to October", "pace": "Moderate", "flight": "17h from Manila (1 stop)",
    },
    {
        "id": "tuscany", "arrive": "Florence", "name": "Tuscany", "country": "Italy", "region": "Europe", "prices": {"wander": 20900, "discover": 74900, "explore": 156400},
        "photo": "photo-1694974247470-1f7bf1562fbe", "alt": "The Vitaleta chapel and cypress trees in Tuscany's Val d'Orcia",
        "tagline": "Hill towns, cypress-lined roads and very long lunches.",
        "description": "This is a trip for people who like to eat. Based in a countryside agriturismo, we visit Florence, Siena and San Gimignano, learn to make pasta, and spend a day among the vineyards of Chianti.",
        "highlights": ["Florence's Uffizi and the Duomo climb", "Siena and the Piazza del Campo", "Pasta-making in a farmhouse kitchen", "Chianti wine route by van", "Sunset in San Gimignano"],
        "best_time": "April to June, September to October", "pace": "Relaxed", "flight": "16h from Manila (1 stop)",
    },
    {
        "id": "paris", "arrive": "Paris", "name": "Paris", "country": "France", "region": "Europe", "prices": {"wander": 22400, "discover": 78900, "explore": 160900},
        "photo": "photo-1502602898657-3e91760cbb34", "alt": "The Eiffel Tower above Paris",
        "tagline": "Museums, markets and neighborhoods made for walking.",
        "description": "Rather than racing between monuments, we explore Paris one neighborhood at a time, from Le Marais to Montmartre. The big sights are included, but so are the bakeries, the Seine at dusk and a day trip to Versailles.",
        "highlights": ["Louvre with a licensed guide", "Montmartre walk and Sacré-Cœur", "Seine evening cruise", "Market morning and picnic in Le Marais", "Day trip to Versailles"],
        "best_time": "April to June, September to October", "pace": "Moderate", "flight": "15h from Manila (1 stop)",
    },
    {
        "id": "lucerne", "arrive": "Lucerne", "name": "Lucerne", "country": "Switzerland", "region": "Europe", "prices": {"wander": 29400, "discover": 112900, "explore": 218400},
        "photo": "photo-1658093271921-199c7a03edc6", "alt": "The flower-lined Chapel Bridge crossing the river in Lucerne",
        "tagline": "A lakeside old town with the Alps rising straight behind it.",
        "description": "Lucerne is small enough to walk and close enough to the mountains for a different peak every day. We ride the cogwheel railway up Pilatus, cruise the lake and keep one day free for a slow lakeside afternoon.",
        "highlights": ["Chapel Bridge and the old town", "Mount Pilatus golden round trip", "Lake Lucerne cruise", "Rigi mountain railway day", "Swiss chocolate workshop"],
        "best_time": "June to September", "pace": "Moderate", "flight": "16h from Manila (1 stop)",
    },
    {
        "id": "iceland", "arrive": "Reykjavík", "name": "South Coast", "country": "Iceland", "region": "Europe", "prices": {"wander": 33400, "discover": 102400, "explore": 220400},
        "photo": "photo-1621959721891-d297dfd9d6ee", "alt": "Skógafoss waterfall between green cliffs on Iceland's South Coast",
        "tagline": "Waterfalls, black-sand beaches and glaciers you can walk on.",
        "description": "Iceland's south coast packs an absurd amount of scenery into one road. We drive it in a small van with a local guide, stopping for waterfalls, glacier lagoons and, in winter, the northern lights.",
        "highlights": ["Golden Circle: Þingvellir, Geysir, Gullfoss", "Seljalandsfoss and Skógafoss waterfalls", "Reynisfjara black-sand beach", "Glacier walk on Sólheimajökull", "Jökulsárlón glacier lagoon"],
        "best_time": "June to August, or September to March for northern lights", "pace": "Active", "flight": "20h from Manila (1 stop)",
    },
    {
        "id": "southisland", "arrive": "Queenstown", "name": "South Island", "country": "New Zealand", "region": "Oceania", "prices": {"wander": 20900, "discover": 62900, "explore": 136400},
        "photo": "photo-1591640040362-f55d95a6b2bc", "alt": "Mitre Peak reflected in Milford Sound on New Zealand's South Island",
        "tagline": "Fjords, glacier lakes and the quiet of big open country.",
        "description": "From Queenstown we loop through the country's most dramatic landscapes: Milford Sound, the lakes of Wanaka and Tekapo, and the Southern Alps. Plenty of short hikes, and a few optional adrenaline stops.",
        "highlights": ["Milford Sound cruise", "Lake Wanaka and Roys Peak walk", "Stargazing at Lake Tekapo", "Queenstown gondola and lakeside dinner", "Mount Cook glacier valley hike"],
        "best_time": "December to March", "pace": "Active", "flight": "13h from Manila (1 stop)",
    },
]

FAQ = [
    ("How do I book a trip?", "Pick a plan (Wander, Discover or Explore More), choose a destination and departure date, add it to your cart and check out. You get a booking reference straight away, and a trip specialist replies within one business day to confirm your seats."),
    ("Do I pay on the website?", "No payment is taken on the site. Within one business day of your order, a trip specialist emails payment instructions for the method you chose (GCash, card link or bank transfer). Your seats are held for 2 business days after that email."),
    ("Is airfare included?", "Our prices cover accommodation, guided experiences and the transfers listed in your plan. International and domestic flights are not included, but our trip specialists can book them for you at cost."),
    ("How does the group discount work?", "Book three or more travelers on the same destination, plan and departure date and 10% is taken off that trip automatically. It can be combined with one promo code. FIRSTTRIP gives 5% off a first booking."),
    ("What is the maximum group size?", "Twelve. Every departure is capped at 12 travelers so the experience stays personal and guides can adapt the day to the group. The cart won't let you add more than 12 travelers to one destination on one date."),
    ("Can I change or cancel my booking?", "Changes to dates or plan are free up to 30 days before departure. Cancellations more than 30 days out are refunded in full minus a ₱2,000 processing fee per person; within 30 days, 50% is refundable; within 7 days, bookings are non-refundable. You can request a change from your account page."),
    ("Is travel insurance included?", "Basic travel insurance is included on Discover and Explore More. On Wander trips you can add it for ₱1,200 per traveler, either on the trip page or in your cart."),
    ("Can I save trips for later?", "Yes. Tap the heart on any destination to save it. Saved trips appear under Saved on the Destinations page and in your account."),
    ("Do you help with visas?", "Yes. Once you book, your trip specialist sends a visa checklist for your destination and the booking documents most embassies ask for."),
]


# Each plan's "Starting from" price: its cheapest destination
for _plan in PLANS:
    _plan["price"] = min(t["prices"][_plan["id"]] for t in TOURS)
