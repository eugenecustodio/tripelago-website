# Tripelago — website

A complete travel agency website: 12 destinations, three plans, a shared cart with group discounts and promo codes, checkout, accounts and saved trips. It is a static site, so it needs no server or database and can be hosted for free.

## 1. Open it on your computer

1. **Extract the zip first.** Windows: right-click the zip, then *Extract All*. Mac: double-click the zip. If you open a page from inside the zip preview, the browser can't find the stylesheets and the page looks unstyled.
2. Open the **website** folder and double-click **index.html**.

Everything works straight from your computer, even offline: the photos, video and fonts are all inside the folder.

## 2. What's in the folder

```
TRIPELAGO_WEBSITE/
  README.md                 this guide
  website/                  the website itself: this is the folder you upload
    index.html              Home: background video, trip finder (where, departure date, travelers), plans
    404.html                Page not found
    pages/
      destinations.html     All destinations: search, region tabs, saved trips, sorting, plan prices.
                            This is where customers choose a trip.
      plans.html            The three plans side by side with what each includes, plus deals
      about.html            About us
      contact.html          Contact us
      sign-in.html          Sign in / create an account
      account.html          My bookings and saved trips
      cart.html             Cart
      checkout.html         Checkout
      app.html              Mobile app waitlist
      faq.html              FAQ
      terms.html            Terms & privacy
    trips/<place>.html      One page per destination: itinerary, prices per plan, departure dates, add to cart
    assets/
      css/                  styles.css, the one stylesheet (fonts, theme, components, layout)
      js/                   config.js (your settings), data.js (prices and destinations), site.js (cart, pricing, accounts)
      js/pages/             one small script per page
      fonts/                Inter (headings) and Plus Jakarta Sans (text)
      img/brand/            logo, favicon, app icons
      img/destinations/     destination photos in 4 sizes (WebP)
      img/app/              app mockups
      video/                home page video (WebM, MP4) and its still image
    robots.txt, site.webmanifest, _headers   files for hosting
  source/                   the generator (not part of the website)
    data.py                 all content: prices, destinations, deals, FAQ, contact details
    build.py                rebuilds every page from data.py
    photos/                 full-size destination photos
```

## 3. How ordering works

- **Price per person** (twin share, airfare not included): every destination has its own price on each plan, set in `source/data.py`. Researched October 2026 from hotel rates for each hotel class, guided-tour and transfer prices and published small-group packages, plus agency margin.
  - Wander (3 days): ₱6,400 (Chiang Mai, Bali) to ₱33,400 (Iceland)
  - Discover (5 days): ₱26,400 to ₱112,900 (Lucerne)
  - Explore More (8 days): ₱58,400 to ₱220,400 (Iceland)
  - A plan's "Starting from" price is its cheapest destination.
- **Group discount:** 10% off when 3 or more travelers book the same destination, plan and departure date.
- **Travel insurance:** included with Discover and Explore More; optional on Wander at ₱1,200 per traveler.
- **Promo codes** (one per order, applied after the group discount, never on insurance):
  - `FIRSTTRIP`: 5% off a customer's first booking.
  - `TRAVELWELL`: ₱3,000 off orders of ₱100,000 or more.
- **Plan deals** (shown on the Plans page; "Use this deal" saves the code for checkout and opens Destinations with that plan's prices):
  - `ESCAPE8` *Weekend Escape*: 8% off Wander trips.
  - `DUO2000` *Better Together*: ₱2,000 off Discover trips with 2 or more travelers.
  - `GOFAR7` *Go the Distance*: 7% off Explore More trips.
- **Departures:** the 5th and 19th of every month, bookable until 7 days before; at most 12 travelers per departure.
- **Payment:** the site never asks for card details. The customer chooses GCash, a card payment link or bank transfer, and a trip specialist emails the payment instructions. Seats are held for 2 business days after that email.

## 4. Before you go live

1. **Receive bookings and messages.** A static site can't email you on its own. Create a free form at [formspree.io](https://formspree.io), copy its endpoint (it looks like `https://formspree.io/f/abcdwxyz`) and paste it into `assets/js/config.js` for `booking`, `contact` and `waitlist`; one form can take all three. Until you do, customers get a button to send their booking or message from their own email app, plus a copy option, so nothing is lost, but nothing arrives by itself.
2. **Put in your real details** (email, phone, address, office hours). See section 6.
3. **Test once on the live site:** add a trip, check out, and make sure the booking reaches your inbox.

## 5. Put it online (free)

- **Netlify Drop**, the easiest: open [app.netlify.com/drop](https://app.netlify.com/drop) and drag the **website** folder onto the page. You get a link such as `https://your-name.netlify.app` straight away, and Netlify applies the security headers in `_headers`.
- **Cloudflare Pages:** in the Cloudflare dashboard, create a Pages project with *Direct Upload* and upload the **website** folder. It also reads `_headers`.
- **GitHub Pages:** put the contents of the **website** folder in a repository, then Settings → Pages → *Deploy from a branch*. Works at `username.github.io/repository/` as well. GitHub Pages ignores `_headers`; the site works the same.

Any other static host works too. Only upload the `website` folder; `source/` and this README aren't part of the site.

## 6. Change prices, destinations or contact details

Everything lives in **`source/data.py`**: plans and prices, the 12 destinations, the group discount, the insurance price, departure days, promo codes and deals, FAQ answers and your contact details. To change the home page video, replace `website/assets/video/hero.webm`, `hero.mp4` and `hero-poster.jpg` with files of the same names. After editing it, rebuild the pages from the TRIPELAGO_WEBSITE folder:

```
python source/build.py
```

On Windows you may need `py source/build.py`. Python 3 is required (tested with 3.11 to 3.13). The command rewrites every page in `website/` and `website/assets/js/data.js` with your changes. To change a destination photo, replace `source/photos/<place>.webp` (1600×1000) and run the build with Pillow installed (`pip install pillow`); it makes the four web sizes for you. Optional: set `"url"` in `data.py` to your live address and the build also writes a `sitemap.xml` for search engines.

Small text edits can also be made directly in the `.html` files in `website/`, but running the build again will overwrite them.

## 7. Good to know

- **The cart, saved trips, accounts and bookings are kept in the visitor's browser.** They stay on that device and browser, don't sync between devices, and there is no admin dashboard: bookings reach you through the form service or email (section 4). Accounts that follow customers across devices would need a backend service.
- Passwords are never stored as plain text (they are salted and hashed). Because accounts live in the browser, *Forgot password* lets a visitor remove the account from that device and create it again; their bookings stay.
- Works in current Chrome, Edge, Firefox and Safari on phones, tablets and computers, and can be used with a keyboard or a screen reader.
- The home page video plays muted on a loop with no controls. It stays still for visitors who turn on reduced motion or data saver, pauses when scrolled out of view, and has a small pause button.
- Photos from [Unsplash](https://unsplash.com), free to use under the Unsplash License. Hero video: "Beautiful beach surrounded by nature seen from above" from [Mixkit](https://mixkit.co), free for commercial use under the Mixkit Stock Video Free License, no attribution required. Fonts: Inter for headings and Plus Jakarta Sans for text (SIL Open Font License), served from the site itself.
- The navigation bar stays at the top of the screen as you scroll.
- Colors follow the palette #EDAE49, #D1495B, #00798C, #30638E and #003D5B. Small text and buttons use slightly deeper shades of the red so they stay readable.
