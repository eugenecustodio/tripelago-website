/* ==========================================================================
   site.js — shared behaviour for every page
   Cart, saved trips, accounts and bookings live in the visitor's browser
   (localStorage). When form endpoints are set in config.js, bookings,
   messages and waitlist sign-ups are also sent to the business; without
   them, pages offer to send the details by email instead.
   ========================================================================== */
window.Tripelago = (function () {
    "use strict";

    var DATA = window.TRIPELAGO_DATA || { plans: [], tours: [], rules: {}, promos: {}, site: {} };
    var CONFIG = window.TRIPELAGO_CONFIG || {};
    var SITE = DATA.site || {};
    var PLANS = DATA.plans || [];
    var TOURS = DATA.tours || [];
    var PROMOS = DATA.promos || {};
    var RULES = {
        groupMin: 3, groupRate: 0.1, maxPerDeparture: 12, insurancePrice: 1200,
        leadDays: 7, departureDays: [5, 19], departuresShown: 12, holdBusinessDays: 2
    };
    Object.keys(DATA.rules || {}).forEach(function (k) { RULES[k] = DATA.rules[k]; });

    var KEYS = {
        cart: "tripelago.cart",
        promo: "tripelago.promo",
        saved: "tripelago.saved",
        users: "tripelago.users",
        session: "tripelago.session",
        bookings: "tripelago.bookings",
        lastBooking: "tripelago.lastBooking"
    };

    var has = function (obj, key) {
        return typeof key === "string" && Object.prototype.hasOwnProperty.call(obj, key);
    };

    /* ----- storage (falls back to memory when the browser blocks it) ----- */

    var memory = {};
    var storageOk = (function () {
        try {
            var probe = "tripelago.__probe";
            window.localStorage.setItem(probe, "1");
            window.localStorage.removeItem(probe);
            return true;
        } catch (err) {
            return false;
        }
    }());
    var warnedStorage = false;

    function read(key, fallback) {
        try {
            var raw = storageOk ? window.localStorage.getItem(key) : memory[key];
            if (raw === null || raw === undefined) {
                return fallback;
            }
            var value = JSON.parse(raw);
            return value === null || value === undefined ? fallback : value;
        } catch (err) {
            return fallback;
        }
    }

    function write(key, value) {
        var raw = JSON.stringify(value);
        if (storageOk) {
            try {
                window.localStorage.setItem(key, raw);
                return true;
            } catch (err) {
                storageOk = false;
            }
        }
        memory[key] = raw;
        if (!warnedStorage) {
            warnedStorage = true;
            setTimeout(function () {
                ui.toast("Your browser is blocking site storage, so your cart and account won't be kept when you change pages.");
            }, 50);
        }
        return false;
    }

    function readList(key) {
        var value = read(key, []);
        return Array.isArray(value) ? value : [];
    }

    function emit(name, detail) {
        try {
            document.dispatchEvent(new CustomEvent("tripelago:" + name, { detail: detail || {} }));
        } catch (err) { /* very old browser: pages still work on reload */ }
    }

    /* ----- small helpers ----- */

    function escapeHtml(text) {
        return String(text === undefined || text === null ? "" : text).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
        });
    }

    /* Only ever navigate to a page of this site, e.g. "pages/account.html" or "pages/checkout.html". */
    function safeNext(value, fallback) {
        if (typeof value === "string" && /^((trips|pages)\/)?[a-z0-9][a-z0-9_-]*\.html(\?[a-z0-9=&%_.-]*)?(#[a-z0-9_-]*)?$/i.test(value)) {
            return value;
        }
        return fallback;
    }

    function param(name) {
        try {
            return new URLSearchParams(window.location.search).get(name);
        } catch (err) {
            return null;
        }
    }

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    function scrollToEl(el, block) {
        if (!el) {
            return;
        }
        el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: block || "start" });
    }

    function peso(amount, decimals) {
        var d = decimals === undefined ? 0 : decimals; /* whole pesos everywhere */
        return "₱" + Number(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: d, maximumFractionDigits: d });
    }

    function plural(n, word) {
        return n + " " + word + (n === 1 ? "" : "s");
    }

    function mailto(subject, body) {
        return "mailto:" + (SITE.email || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
        }
        return Promise.resolve(false);
    }

    /* ----- catalogue ----- */

    function planById(id) {
        return PLANS.find(function (p) { return p.id === id; }) || null;
    }

    function tourById(id) {
        return TOURS.find(function (t) { return t.id === id; }) || null;
    }

    function unitPrice(tourId, planId) {
        var plan = planById(planId);
        var tour = tourById(tourId);
        return plan && tour && tour.prices ? tour.prices[planId] || 0 : 0;
    }

    /* ----- dates ----- */

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function toIso(d) {
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    function parseIso(iso) {
        if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            return null;
        }
        var p = iso.split("-").map(Number);
        var d = new Date(p[0], p[1] - 1, p[2]);
        return d.getMonth() === p[1] - 1 && d.getDate() === p[2] ? d : null;
    }

    function formatDate(iso, style) {
        var d = parseIso(iso);
        if (!d) {
            return "";
        }
        var opts = style === "short"
            ? { month: "short", day: "numeric", year: "numeric" }
            : { weekday: "short", month: "short", day: "numeric", year: "numeric" };
        return d.toLocaleDateString("en-PH", opts);
    }

    /* Departures leave on fixed days each month, from leadDays out (calendar days, so
       daylight-saving changes don't shift the window), for the next N departures. */
    function departures() {
        var out = [];
        var now = new Date();
        var earliest = new Date(now.getFullYear(), now.getMonth(), now.getDate() + RULES.leadDays);
        for (var m = 0; m < 24 && out.length < RULES.departuresShown; m++) {
            RULES.departureDays.forEach(function (day) {
                var d = new Date(now.getFullYear(), now.getMonth() + m, day);
                if (d >= earliest && out.length < RULES.departuresShown) {
                    out.push({ iso: toIso(d), label: formatDate(toIso(d)), short: formatDate(toIso(d), "short") });
                }
            });
        }
        return out;
    }

    function isBookable(iso) {
        return departures().some(function (d) { return d.iso === iso; });
    }

    /* Departure asked for in the URL: ?date=YYYY-MM-DD, or ?month=YYYY-MM for the first departure that month */
    function wantedDate() {
        var date = param("date");
        if (date && isBookable(date)) {
            return date;
        }
        var month = param("month");
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            var first = departures().filter(function (d) { return d.iso.slice(0, 7) === month; })[0];
            return first ? first.iso : null;
        }
        return null;
    }

    function fillDateSelect(select, selected) {
        var list = departures();
        var html = "";
        list.forEach(function (d) {
            html += "<option value=\"" + d.iso + "\">" + escapeHtml(d.label) + "</option>";
        });
        select.insertAdjacentHTML("beforeend", html);
        if (selected && isBookable(selected)) {
            select.value = selected;
        }
    }

    /* ----- cart ----- */

    function normalizeLine(l) {
        if (!l || typeof l !== "object") {
            return null;
        }
        var tour = tourById(l.tourId);
        var plan = planById(l.planId);
        var qty = parseInt(l.qty, 10);
        if (!tour || !plan || !parseIso(l.date) || !(qty >= 1)) {
            return null;
        }
        return {
            tourId: tour.id,
            planId: plan.id,
            date: l.date,
            qty: Math.min(qty, RULES.maxPerDeparture),
            insurance: !!l.insurance && !plan.insuranceIncluded
        };
    }

    /* Insured and uninsured travelers on the same trip are kept as separate lines. */
    function lineKey(line) {
        return line.tourId + "|" + line.planId + "|" + line.date + "|" + (line.insurance ? "i" : "n");
    }

    function sameTrip(a, b) {
        return a.tourId === b.tourId && a.planId === b.planId && a.date === b.date;
    }

    /* Travelers on the same destination, plan and date (insured or not) count toward the group discount. */
    function tripTravelers(lines, line) {
        return (lines || [line]).reduce(function (n, l) { return sameTrip(l, line) ? n + l.qty : n; }, 0) || line.qty;
    }

    /* context: the cart lines the line belongs to, or a number of travelers on the trip */
    function lineAmounts(line, context) {
        var plan = planById(line.planId);
        var unit = unitPrice(line.tourId, line.planId);
        var gross = unit * line.qty;
        var group = typeof context === "number" ? context : tripTravelers(Array.isArray(context) ? context : null, line);
        var discount = group >= RULES.groupMin ? Math.round(gross * RULES.groupRate) : 0;
        var insurance = line.insurance && plan && !plan.insuranceIncluded ? RULES.insurancePrice * line.qty : 0;
        return { unit: unit, gross: gross, discount: discount, insurance: insurance, net: gross - discount + insurance, group: group };
    }

    function travelersOnDeparture(lines, tourId, date, exceptKey) {
        return lines.reduce(function (n, l) {
            return l.tourId === tourId && l.date === date && lineKey(l) !== exceptKey ? n + l.qty : n;
        }, 0);
    }

    function mergeInto(lines, line) {
        var existing = lines.find(function (l) { return lineKey(l) === lineKey(line); });
        if (existing) {
            existing.qty += line.qty;
        } else {
            lines.push(line);
        }
    }

    var cart = {
        /* Reads the cart, dropping invalid lines and enforcing the per-departure cap. */
        get: function () {
            var lines = [];
            var used = {};
            readList(KEYS.cart).map(normalizeLine).forEach(function (l) {
                if (!l) {
                    return;
                }
                var dep = l.tourId + "|" + l.date;
                var room = RULES.maxPerDeparture - (used[dep] || 0);
                if (room <= 0) {
                    return;
                }
                l.qty = Math.min(l.qty, room);
                used[dep] = (used[dep] || 0) + l.qty;
                mergeInto(lines, l);
            });
            return lines;
        },
        save: function (lines) {
            write(KEYS.cart, lines);
            ui.refreshHeader();
            emit("cart");
        },
        find: function (key) {
            return cart.get().find(function (l) { return lineKey(l) === key; }) || null;
        },
        /* Seats this cart can still add to a destination on a date. */
        room: function (tourId, date, exceptKey) {
            return Math.max(0, RULES.maxPerDeparture - travelersOnDeparture(cart.get(), tourId, date, exceptKey));
        },
        /* Travelers already in the cart on this destination, plan and date. */
        onTrip: function (tourId, planId, date) {
            return cart.get().reduce(function (n, l) {
                return l.tourId === tourId && l.planId === planId && l.date === date ? n + l.qty : n;
            }, 0);
        },
        add: function (input) {
            var line = normalizeLine(input);
            if (!line) {
                return { added: 0, requested: 0 };
            }
            var lines = cart.get();
            var requested = line.qty;
            var room = RULES.maxPerDeparture - travelersOnDeparture(lines, line.tourId, line.date, null);
            var added = Math.max(0, Math.min(requested, room));
            if (added > 0) {
                line.qty = added;
                mergeInto(lines, line);
                cart.save(lines);
            }
            return { added: added, requested: requested };
        },
        setQty: function (key, qty) {
            var lines = cart.get();
            var line = lines.find(function (l) { return lineKey(l) === key; });
            if (!line) {
                return { qty: 0, max: 0 };
            }
            var max = Math.max(1, RULES.maxPerDeparture - travelersOnDeparture(lines, line.tourId, line.date, key));
            var wanted = parseInt(qty, 10) || 1;
            line.qty = Math.max(1, Math.min(max, wanted));
            cart.save(lines);
            return { qty: line.qty, max: max, clamped: wanted > max };
        },
        /* Moves a whole line to another date. Refuses (and changes nothing) if not everyone fits. */
        setDate: function (key, date) {
            var lines = cart.get();
            var line = lines.find(function (l) { return lineKey(l) === key; });
            if (!line || !isBookable(date) || line.date === date) {
                return { ok: false };
            }
            var others = lines.filter(function (l) { return l !== line; });
            var room = RULES.maxPerDeparture - travelersOnDeparture(others, line.tourId, date, null);
            if (room < line.qty) {
                return { ok: false, full: true, room: Math.max(0, room) };
            }
            var moved = { tourId: line.tourId, planId: line.planId, date: date, qty: line.qty, insurance: line.insurance };
            var merged = others.some(function (l) { return lineKey(l) === lineKey(moved); });
            var index = lines.indexOf(line);
            if (merged) {
                mergeInto(others, moved);
                lines = others;
            } else {
                lines[index] = moved;
            }
            cart.save(lines);
            return { ok: true, merged: merged, key: lineKey(moved) };
        },
        setInsurance: function (key, on) {
            var lines = cart.get();
            var line = lines.find(function (l) { return lineKey(l) === key; });
            if (!line || planById(line.planId).insuranceIncluded) {
                return key;
            }
            var updated = { tourId: line.tourId, planId: line.planId, date: line.date, qty: line.qty, insurance: !!on };
            var others = lines.filter(function (l) { return l !== line; });
            if (others.some(function (l) { return lineKey(l) === lineKey(updated); })) {
                mergeInto(others, updated);
                lines = others;
            } else {
                lines[lines.indexOf(line)] = updated;
            }
            cart.save(lines);
            return lineKey(updated);
        },
        remove: function (key) {
            var lines = cart.get();
            var index = lines.findIndex(function (l) { return lineKey(l) === key; });
            if (index === -1) {
                return null;
            }
            var removed = lines.splice(index, 1)[0];
            cart.save(lines);
            return { line: removed, index: index };
        },
        restore: function (removed) {
            if (!removed || !removed.line) {
                return false;
            }
            var lines = cart.get();
            var line = normalizeLine(removed.line);
            if (!line) {
                return false;
            }
            line.qty = Math.min(line.qty, RULES.maxPerDeparture - travelersOnDeparture(lines, line.tourId, line.date, null));
            if (line.qty < 1) {
                return false;
            }
            if (lines.some(function (l) { return lineKey(l) === lineKey(line); })) {
                mergeInto(lines, line);
            } else {
                lines.splice(Math.min(removed.index, lines.length), 0, line);
            }
            cart.save(lines);
            return true;
        },
        clear: function () {
            write(KEYS.promo, null);
            cart.save([]);
        },
        count: function () {
            return cart.get().reduce(function (n, l) { return n + l.qty; }, 0);
        },
        /* Lines whose departure date can no longer be booked. */
        issues: function (lines) {
            return (lines || cart.get()).filter(function (l) { return !isBookable(l.date); });
        },
        /* options.email: checks first-booking-only codes against that email's bookings */
        totals: function (lines, options) {
            lines = lines || cart.get();
            options = options || {};
            var t = { travelers: 0, subtotal: 0, groupDiscount: 0, insurance: 0, codeDiscount: 0, code: null, codeNote: "", total: 0 };
            lines.forEach(function (line) {
                var a = lineAmounts(line, lines);
                t.travelers += line.qty;
                t.subtotal += a.gross;
                t.groupDiscount += a.discount;
                t.insurance += a.insurance;
            });
            var tours = t.subtotal - t.groupDiscount;
            var code = promo.get();
            if (code && lines.length) {
                var rule = PROMOS[code];
                var email = options.email || (auth.current() || {}).email;
                var check = promo.check(code, lines, email);
                if (!check.ok) {
                    t.codeNote = check.note;
                } else {
                    t.code = code;
                    t.codeDiscount = rule.type === "percent" ? Math.round(check.base * rule.value / 100) : Math.min(rule.value, check.base);
                }
            }
            t.total = tours - t.codeDiscount + t.insurance;
            return t;
        }
    };

    /* ----- promo codes ----- */

    var promo = {
        get: function () {
            var code = read(KEYS.promo, null);
            return has(PROMOS, code) ? code : null;
        },
        /* Does a code apply to these lines? Returns the amount it works on (base) or why not. */
        check: function (code, lines, email) {
            var rule = PROMOS[code];
            var plan = rule.plan ? planById(rule.plan) : null;
            var base = 0;
            var travelers = 0;
            lines.forEach(function (line) {
                if (!plan || line.planId === plan.id) {
                    var a = lineAmounts(line, lines);
                    base += a.gross - a.discount;
                    travelers += line.qty;
                }
            });
            if (rule.firstOrderOnly && email && bookings.forEmail(email).length) {
                return { ok: false, base: 0, message: code + " is for your first booking, and you've booked with us before.",
                    note: code + " is for a first booking, and " + email + " has booked with us before." };
            }
            if (plan && travelers === 0) {
                return { ok: false, base: 0, message: code + " is for " + plan.name + " trips. Add a " + plan.name + " trip to use it.",
                    note: code + " is saved and will apply to " + plan.name + " trips (" + rule.label + ")." };
            }
            if (rule.minTravelers && travelers < rule.minTravelers) {
                return { ok: false, base: 0, message: code + " needs at least " + plural(rule.minTravelers, "traveler") + (plan ? " on " + plan.name + " trips." : "."),
                    note: code + " is saved but doesn't apply yet (" + rule.label + ")." };
            }
            if (rule.min && base < rule.min) {
                return { ok: false, base: 0, message: code + " needs trips worth at least " + peso(rule.min, 0) + " after discounts.",
                    note: code + " is saved but doesn't apply yet (" + rule.label + ", after discounts)." };
            }
            return { ok: true, base: base };
        },
        apply: function (input) {
            var code = String(input || "").trim().toUpperCase();
            if (!has(PROMOS, code)) {
                return { ok: false, message: "That code isn't valid. Check the spelling and try again." };
            }
            var user = auth.current();
            var check = promo.check(code, cart.get(), user && user.email);
            if (!check.ok) {
                return { ok: false, message: check.message };
            }
            write(KEYS.promo, code);
            emit("cart");
            return { ok: true, message: PROMOS[code].label + " applied." };
        },
        /* Keep a deal's code for later, even before the cart qualifies (used by the deal buttons) */
        save: function (input) {
            var code = String(input || "").trim().toUpperCase();
            if (!has(PROMOS, code)) {
                return false;
            }
            write(KEYS.promo, code);
            emit("cart");
            return true;
        },
        clear: function () {
            write(KEYS.promo, null);
            emit("cart");
        },
        describe: function (code) {
            return has(PROMOS, code) ? PROMOS[code].label : "";
        }
    };

    /* ----- saved trips ----- */

    var saved = {
        list: function () {
            return readList(KEYS.saved).filter(function (id, i, all) {
                return typeof id === "string" && tourById(id) && all.indexOf(id) === i;
            });
        },
        toggle: function (id) {
            if (!tourById(id)) {
                return false;
            }
            var list = saved.list();
            var i = list.indexOf(id);
            if (i === -1) {
                list.push(id);
            } else {
                list.splice(i, 1);
            }
            write(KEYS.saved, list);
            ui.refreshSaved();
            emit("saved");
            return i === -1;
        }
    };

    /* ----- accounts (kept in this browser; passwords are salted and hashed) ----- */

    function sha256(text) {
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
            return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
                return Array.prototype.map.call(new Uint8Array(buf), function (b) {
                    return b.toString(16).padStart(2, "0");
                }).join("");
            }).catch(function () { return fallbackHash(text); });
        }
        return Promise.resolve(fallbackHash(text));
    }

    function fallbackHash(text) {
        var h = 5381;
        for (var i = 0; i < text.length; i++) {
            h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
        }
        return "fb" + h.toString(16);
    }

    function randomHex(bytes) {
        var arr = new Uint8Array(bytes);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(arr);
        } else {
            for (var i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.prototype.map.call(arr, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    }

    function users() {
        return readList(KEYS.users).filter(function (u) {
            return u && typeof u.email === "string" && typeof u.name === "string" && typeof u.pass === "string";
        });
    }

    var STORAGE_BLOCKED = "Your browser is blocking site storage, so we can't keep you signed in. Turn off private browsing or allow site data for this site, then try again.";

    var auth = {
        current: function () {
            var session = read(KEYS.session, null);
            if (!session || typeof session.email !== "string") {
                return null;
            }
            return users().find(function (u) { return u.email === session.email; }) || null;
        },
        exists: function (email) {
            email = String(email || "").trim().toLowerCase();
            return users().some(function (u) { return u.email === email; });
        },
        register: function (name, email, password) {
            if (!storageOk) {
                return Promise.resolve({ ok: false, message: STORAGE_BLOCKED });
            }
            email = String(email).trim().toLowerCase();
            var list = users();
            if (list.some(function (u) { return u.email === email; })) {
                return Promise.resolve({ ok: false, message: "An account with that email already exists on this device. Sign in instead." });
            }
            var salt = randomHex(16);
            return sha256(salt + ":" + password).then(function (digest) {
                list.push({ name: String(name).trim(), email: email, salt: salt, pass: digest, createdAt: new Date().toISOString() });
                write(KEYS.users, list);
                write(KEYS.session, { email: email });
                ui.refreshHeader();
                return { ok: true };
            });
        },
        login: function (email, password) {
            if (!storageOk) {
                return Promise.resolve({ ok: false, message: STORAGE_BLOCKED });
            }
            email = String(email).trim().toLowerCase();
            var user = users().find(function (u) { return u.email === email; });
            if (!user) {
                return Promise.resolve({ ok: false, message: "We couldn't find an account with that email on this device." });
            }
            var input = user.salt ? user.salt + ":" + password : email + ":" + password;
            return sha256(input).then(function (digest) {
                if (digest !== user.pass) {
                    return { ok: false, message: "That password doesn't match. Try again." };
                }
                write(KEYS.session, { email: email });
                ui.refreshHeader();
                return { ok: true };
            });
        },
        logout: function () {
            write(KEYS.session, null);
            ui.refreshHeader();
        },
        /* Forgotten password: remove the account from this device. Bookings stay (they're matched by email). */
        removeFromDevice: function (email) {
            email = String(email || "").trim().toLowerCase();
            var list = users();
            var next = list.filter(function (u) { return u.email !== email; });
            if (next.length === list.length) {
                return false;
            }
            write(KEYS.users, next);
            var session = read(KEYS.session, null);
            if (session && session.email === email) {
                write(KEYS.session, null);
            }
            ui.refreshHeader();
            return true;
        }
    };

    /* ----- bookings ----- */

    function bookingRef() {
        var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var hex = randomHex(6);
        var out = "";
        for (var i = 0; i < 6; i++) {
            out += alphabet[parseInt(hex.substr(i * 2, 2), 16) % alphabet.length];
        }
        return "TRP-" + out;
    }

    function validBooking(b) {
        return b && typeof b.ref === "string" && typeof b.email === "string" && b.totals && typeof b.totals === "object" &&
            Array.isArray(b.lines) && b.lines.every(function (l) { return l && typeof l === "object" && parseIso(l.date); });
    }

    var bookings = {
        all: function () {
            return readList(KEYS.bookings).filter(validBooking);
        },
        forEmail: function (email) {
            email = String(email || "").toLowerCase();
            return bookings.all().filter(function (b) { return b.email === email; }).reverse();
        },
        find: function (ref) {
            return bookings.all().find(function (b) { return b.ref === ref; }) || null;
        },
        /* The booking the visitor placed most recently on this device, if within a day. */
        last: function () {
            var info = read(KEYS.lastBooking, null);
            if (!info || typeof info.ref !== "string" || Date.now() - Number(info.at) > 86400000) {
                return null;
            }
            return bookings.find(info.ref);
        },
        /* Builds the booking from the cart without saving it. */
        create: function (customer, payment) {
            var lines = cart.get();
            if (!lines.length) {
                return null;
            }
            var email = customer.email.toLowerCase();
            var t = cart.totals(lines, { email: email });
            return {
                ref: bookingRef(),
                placedAt: new Date().toISOString(),
                name: customer.name,
                email: email,
                phone: customer.phone,
                requests: customer.requests || "",
                payment: payment,
                lines: lines.map(function (line) {
                    var a = lineAmounts(line, lines);
                    return {
                        tourId: line.tourId, planId: line.planId, date: line.date, qty: line.qty,
                        insurance: line.insurance, tourName: tourById(line.tourId).name, planName: planById(line.planId).name,
                        unit: a.unit, discount: a.discount, insuranceCost: a.insurance, net: a.net
                    };
                }),
                totals: t
            };
        },
        save: function (booking, sent) {
            booking.sent = !!sent;
            var all = bookings.all();
            all.push(booking);
            write(KEYS.bookings, all);
            write(KEYS.lastBooking, { ref: booking.ref, at: Date.now() });
            cart.clear();
        },
        status: function (booking) {
            var allPast = booking.lines.every(function (l) {
                var d = parseIso(l.date);
                return d && d < new Date();
            });
            if (allPast) {
                return { label: "Past trip", tone: "", note: "" };
            }
            if (!booking.sent && !isConfigured("booking")) {
                return { label: "Booking saved", tone: "yellow", note: "Email us your reference so we can confirm" };
            }
            var age = Date.now() - new Date(booking.placedAt).getTime();
            return age < 86400000
                ? { label: "Booking received", tone: "yellow", note: "Payment instructions within 1 business day" }
                : { label: "Awaiting payment", tone: "yellow", note: "Check your email for payment instructions" };
        },
        paymentLabel: function (key) {
            return { gcash: "GCash", card: "card payment", bank: "bank transfer" }[key] || "payment";
        },
        /* Plain-text summary used for the email fallback and the copy button. */
        text: function (b) {
            var out = ["Booking reference: " + b.ref, "Name: " + b.name, "Email: " + b.email, "Mobile: " + b.phone,
                "Payment method: " + bookings.paymentLabel(b.payment), "", "Trips:"];
            b.lines.forEach(function (l) {
                out.push("- " + l.tourName + " · " + l.planName + " plan, departs " + formatDate(l.date) + ", " +
                    plural(l.qty, "traveler") + (l.insurance ? " with travel insurance" : "") + ": " + peso(l.net));
            });
            out.push("");
            out.push("Subtotal: " + peso(b.totals.subtotal));
            if (b.totals.groupDiscount) { out.push("Group discount: -" + peso(b.totals.groupDiscount)); }
            if (b.totals.insurance) { out.push("Travel insurance: " + peso(b.totals.insurance)); }
            if (b.totals.code) { out.push("Promo " + b.totals.code + ": -" + peso(b.totals.codeDiscount)); }
            out.push("Total: " + peso(b.totals.total));
            if (b.requests) {
                out.push("");
                out.push("Special requests: " + b.requests);
            }
            return out.join("\n");
        }
    };

    /* ----- form endpoints (config.js) ----- */

    function isConfigured(kind) {
        return !!(CONFIG.endpoints && typeof CONFIG.endpoints[kind] === "string" && /^https:\/\//.test(CONFIG.endpoints[kind]));
    }

    function send(kind, payload) {
        if (!isConfigured(kind) || !window.fetch) {
            return Promise.resolve({ ok: true, remote: false });
        }
        var controller = window.AbortController ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;
        var body = { kind: kind, page: window.location.pathname, sentAt: new Date().toISOString() };
        Object.keys(payload || {}).forEach(function (k) { body[k] = payload[k]; });
        return fetch(CONFIG.endpoints[kind], {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(body),
            signal: controller ? controller.signal : undefined
        }).then(function (res) {
            return { ok: res.ok, remote: true };
        }).catch(function () {
            return { ok: false, remote: true };
        }).then(function (result) {
            if (timer) {
                clearTimeout(timer);
            }
            return result;
        });
    }

    /* ----- ui: header, menu, toast, saved buttons, forms ----- */

    var toastTimer = null;

    var ui = {
        refreshHeader: function () {
            var count = cart.count();
            var badge = document.querySelector(".header-cart-count");
            if (badge) {
                badge.textContent = count;
                badge.classList.toggle("show", count > 0);
            }
            var cartLink = document.querySelector(".header-cart");
            if (cartLink) {
                cartLink.setAttribute("aria-label", count ? "Cart, " + plural(count, "traveler") : "Cart, empty");
            }
            var cta = document.querySelector("[data-auth-cta]");
            if (cta) {
                var user = auth.current();
                if (user) {
                    cta.textContent = "Hi, " + user.name.split(" ")[0];
                    cta.href = "pages/account.html";
                    cta.classList.add("is-user");
                    cta.setAttribute("aria-label", "My account (" + user.name + ")");
                } else {
                    cta.textContent = "Sign in";
                    cta.href = "pages/sign-in.html";
                    cta.classList.remove("is-user");
                    cta.removeAttribute("aria-label");
                }
            }
        },
        refreshSaved: function () {
            var list = saved.list();
            document.querySelectorAll("[data-save]").forEach(function (button) {
                var on = list.indexOf(button.getAttribute("data-save")) !== -1;
                button.setAttribute("aria-pressed", on ? "true" : "false");
                button.classList.toggle("on", on);
                var label = button.querySelector(".save-label");
                if (label) {
                    label.textContent = on ? "Saved" : "Save";
                }
            });
            document.querySelectorAll("[data-saved-count]").forEach(function (el) {
                el.textContent = list.length;
            });
        },
        initMenu: function () {
            var header = document.querySelector("header");
            var button = document.querySelector(".header-menu");
            var nav = document.getElementById("site-nav");
            if (!header || !button || !nav) {
                return;
            }
            function isOpen() {
                return header.classList.contains("nav-open");
            }
            function setOpen(open, focusFirst) {
                header.classList.toggle("nav-open", open);
                button.setAttribute("aria-expanded", open ? "true" : "false");
                button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
                if (open && focusFirst) {
                    var first = nav.querySelector("a");
                    if (first) {
                        first.focus();
                    }
                }
            }
            button.addEventListener("click", function () {
                setOpen(!isOpen(), true);
            });
            document.addEventListener("click", function (event) {
                if (isOpen() && !header.contains(event.target)) {
                    setOpen(false);
                }
            });
            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && isOpen()) {
                    setOpen(false);
                    button.focus();
                }
            });
            /* Close when keyboard focus leaves the open menu */
            nav.addEventListener("focusout", function (event) {
                if (isOpen() && event.relatedTarget && !nav.contains(event.relatedTarget) && event.relatedTarget !== button) {
                    setOpen(false);
                }
            });
        },
        /* options: { href, text } adds a link such as "View cart" */
        toast: function (message, options) {
            var el = document.querySelector(".toast");
            if (!el) {
                el = document.createElement("div");
                el.className = "toast";
                el.setAttribute("role", "status");
                el.setAttribute("aria-live", "polite");
                document.body.appendChild(el);
                var hold = function () { clearTimeout(toastTimer); };
                var release = function () { ui.hideToastSoon(el); };
                el.addEventListener("mouseenter", hold);
                el.addEventListener("focusin", hold);
                el.addEventListener("mouseleave", release);
                el.addEventListener("focusout", release);
            }
            el.innerHTML = "";
            var span = document.createElement("span");
            span.textContent = message;
            el.appendChild(span);
            if (options && options.text && options.href) {
                var link = document.createElement("a");
                link.href = safeNext(options.href, "pages/cart.html");
                link.className = "toast-action";
                link.textContent = options.text;
                el.appendChild(link);
            }
            el.classList.add("show");
            ui.hideToastSoon(el);
        },
        hideToastSoon: function (el) {
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () {
                if (el.contains(document.activeElement) || el.matches(":hover")) {
                    return;
                }
                el.classList.remove("show");
                el.innerHTML = "";
            }, 4500);
        },
        setInvalid: function (field, invalid, message) {
            var wrap = field.closest(".field");
            if (!wrap) {
                return;
            }
            var err = wrap.querySelector(".field-error");
            wrap.classList.toggle("invalid", !!invalid);
            if (invalid) {
                field.setAttribute("aria-invalid", "true");
            } else {
                field.removeAttribute("aria-invalid");
            }
            if (err) {
                if (!err.id) {
                    err.id = (field.id || field.name || "field") + "-error";
                }
                if (message) {
                    err.textContent = message;
                }
                var ids = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (id) { return id && id !== err.id; });
                if (invalid) {
                    ids.push(err.id);
                }
                if (ids.length) {
                    field.setAttribute("aria-describedby", ids.join(" "));
                } else {
                    field.removeAttribute("aria-describedby");
                }
            }
        },
        /* Runs [element, isValid, message] checks; returns true when all pass and focuses the first failure. */
        validate: function (checks) {
            var first = null;
            checks.forEach(function (c) {
                ui.setInvalid(c[0], !c[1], c[2]);
                if (!c[1] && !first) {
                    first = c[0];
                }
            });
            if (first) {
                first.focus({ preventScroll: true });
                scrollToEl(first.closest(".field") || first, "center");
            }
            return !first;
        },
        busy: function (button, busyText) {
            if (!button.dataset.label) {
                button.dataset.label = button.textContent;
            }
            button.disabled = !!busyText;
            button.textContent = busyText || button.dataset.label;
        },
        /* Wires a "Copy" button to some text, with a fallback of selecting it */
        copyButton: function (button, getText, target) {
            button.addEventListener("click", function () {
                var text = getText();
                copyText(text).then(function (ok) {
                    if (ok) {
                        var label = button.textContent;
                        button.textContent = "Copied";
                        setTimeout(function () { button.textContent = label; }, 2000);
                    } else if (target) {
                        target.hidden = false;
                        target.value = text;
                        target.focus();
                        target.select();
                    }
                });
            });
        }
    };

    var validators = {
        email: function (value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
        },
        phone: function (value) {
            var digits = String(value).replace(/[^\d]/g, "");
            return /^[+\d\s().-]+$/.test(String(value).trim()) && digits.length >= 7 && digits.length <= 15;
        }
    };

    /* Save buttons anywhere on the page */
    document.addEventListener("click", function (event) {
        var button = event.target.closest("[data-save]");
        if (!button) {
            return;
        }
        event.preventDefault();
        var tour = tourById(button.getAttribute("data-save"));
        if (!tour) {
            return;
        }
        var nowSaved = saved.toggle(tour.id);
        ui.toast(nowSaved ? tour.name + " saved" : tour.name + " removed from saved trips",
            nowSaved ? { href: "pages/destinations.html?view=saved", text: "View saved" } : null);
    });

    /* Keep tabs in sync */
    window.addEventListener("storage", function (event) {
        if (!event.key || event.key.indexOf("tripelago.") !== 0) {
            return;
        }
        ui.refreshHeader();
        ui.refreshSaved();
        var kind = event.key === KEYS.saved ? "saved" : (event.key === KEYS.session || event.key === KEYS.users ? "auth" : "cart");
        emit(kind, { external: true });
    });

    document.addEventListener("DOMContentLoaded", function () {
        ui.refreshHeader();
        ui.refreshSaved();
        ui.initMenu();
        /* Sticky header: tighten and add a shadow once the page scrolls */
        var bar = document.querySelector("body > header");
        if (bar) {
            var ticking = false;
            var update = function () {
                bar.classList.toggle("is-scrolled", window.scrollY > 8);
                ticking = false;
            };
            window.addEventListener("scroll", function () {
                if (!ticking) {
                    ticking = true;
                    window.requestAnimationFrame(update);
                }
            }, { passive: true });
            update();
        }
        document.querySelectorAll("[data-year]").forEach(function (el) {
            el.textContent = new Date().getFullYear();
        });
        document.querySelectorAll("[data-print]").forEach(function (el) {
            el.addEventListener("click", function () { window.print(); });
        });
    });

    return {
        RULES: RULES,
        planById: planById, tourById: tourById, unitPrice: unitPrice,
        peso: peso, plural: plural, escapeHtml: escapeHtml, safeNext: safeNext, param: param, mailto: mailto,
        formatDate: formatDate, departures: departures, isBookable: isBookable, fillDateSelect: fillDateSelect, wantedDate: wantedDate,
        lineKey: lineKey, lineAmounts: lineAmounts, prefersReducedMotion: prefersReducedMotion,
        cart: cart, promo: promo, saved: saved, auth: auth, bookings: bookings,
        send: send, isConfigured: isConfigured, ui: ui, validators: validators
    };
}());
