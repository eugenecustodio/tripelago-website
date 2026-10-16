/* Account page: profile, booking history and saved trips. */
(function () {
    "use strict";

    var D = window.Tripelago;
    var esc = D.escapeHtml;
    var user = D.auth.current();
    if (!user) {
        window.location.replace("pages/sign-in.html?next=pages/account.html");
        return;
    }

    function $(id) {
        return document.getElementById(id);
    }

    $("acct-initial").textContent = user.name.charAt(0).toUpperCase();
    $("acct-name").textContent = user.name;
    $("acct-email").textContent = user.email;
    var since = new Date(user.createdAt);
    $("acct-since").textContent = isNaN(since.getTime()) ? "" : "Member since " + since.toLocaleDateString("en-PH", { month: "long", year: "numeric" });

    function renderBookings() {
        var list = D.bookings.forEmail(user.email);
        $("booking-count").textContent = list.length ? D.plural(list.length, "booking") : "No bookings yet";

        if (!list.length) {
            $("bookings").innerHTML = "<div class=\"card empty-card\"><h3>No bookings yet</h3>" +
                "<p>Orders you place with " + esc(user.email) + " will show up here with their reference and payment status.</p>" +
                "<a class=\"btn\" href=\"pages/destinations.html\">Browse destinations</a></div>";
            return;
        }

        $("bookings").innerHTML = list.map(function (b) {
            var status = D.bookings.status(b);
            var placedOn = new Date(b.placedAt);
            var lines = b.lines.map(function (line) {
                var tour = D.tourById(line.tourId);
                var plan = D.planById(line.planId);
                var name = (tour ? tour.name : line.tourName) + " · " + (plan ? plan.name : line.planName);
                var details = [D.plural(Number(line.qty) || 0, "traveler"), "departs " + D.formatDate(line.date)];
                if (line.insurance) {
                    details.push("insured");
                }
                return "<li><span>" + esc(name) + "<small>" + details.map(function (d) { return "<span class=\"nw\">" + esc(d) + "</span>"; }).join(" · ") + "</small></span>" +
                    "<span>" + D.peso(Number(line.net) || 0) + "</span></li>";
            }).join("");
            return "<article class=\"card booking-card\">" +
                "<div class=\"booking-head\">" +
                    "<div><strong>" + esc(b.ref) + "</strong><small>Placed " +
                        (isNaN(placedOn.getTime()) ? "" : esc(placedOn.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }))) +
                    "</small></div>" +
                    "<div class=\"booking-status\"><span class=\"chip " + status.tone + "\">" + esc(status.label) + "</span>" +
                        (status.note ? "<small>" + esc(status.note) + "</small>" : "") + "</div>" +
                "</div>" +
                "<ul class=\"booking-lines\">" + lines + "</ul>" +
                "<div class=\"booking-total\"><span>Total</span><span>" + D.peso(Number(b.totals.total) || 0) + "</span></div>" +
                "<div class=\"booking-actions\">" +
                    (!b.sent && !D.isConfigured("booking")
                        ? "<a class=\"btn small\" href=\"" + esc(D.mailto("Booking " + b.ref + " · " + b.name, D.bookings.text(b))) + "\">Email this booking</a>"
                        : "") +
                    "<a class=\"btn ghost small\" href=\"pages/contact.html?topic=booking&amp;ref=" + encodeURIComponent(b.ref) + "\">Request a change</a>" +
                "</div>" +
            "</article>";
        }).join("");
    }

    function renderSaved() {
        var ids = D.saved.list();
        $("saved-count").textContent = ids.length ? D.plural(ids.length, "saved trip") : "Nothing saved yet";
        if (!ids.length) {
            $("saved-grid").innerHTML = "<div class=\"card empty-card\"><h3>No saved trips</h3>" +
                "<p>Tap the heart on any destination to keep it here for later.</p>" +
                "<a class=\"btn ghost\" href=\"pages/destinations.html\">Find a destination</a></div>";
            return;
        }
        $("saved-grid").innerHTML = ids.map(function (id) {
            var t = D.tourById(id);
            var from = D.unitPrice(id, "wander");
            return "<article class=\"saved-item\">" +
                "<img src=\"" + esc(t.img) + "\" alt=\"\" width=\"640\" height=\"400\" loading=\"lazy\">" +
                "<div><h3><a href=\"" + t.url + "\">" + esc(t.name) + "</a></h3>" +
                "<p>" + esc(t.country) + " · from " + D.peso(from, 0) + "</p></div>" +
                "<button class=\"save-btn on\" type=\"button\" data-save=\"" + t.id + "\" aria-pressed=\"true\" aria-label=\"Remove " + esc(t.name) + " from saved trips\">" +
                    "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" aria-hidden=\"true\"><path d=\"M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.6 5c2 0 3.4 1.1 4.2 2.4h2.4C14 6.1 15.4 5 17.4 5 21 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21z\"/></svg>" +
                "</button>" +
            "</article>";
        }).join("");
    }

    document.addEventListener("tripelago:saved", renderSaved);

    /* Signed out (or the account was removed) in another tab */
    document.addEventListener("tripelago:auth", function () {
        if (!D.auth.current()) {
            window.location.replace("pages/sign-in.html?next=pages/account.html");
        }
    });

    $("logout").addEventListener("click", function () {
        D.auth.logout();
        window.location.href = "index.html";
    });

    renderBookings();
    renderSaved();
}());
