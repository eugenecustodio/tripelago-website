/* Trip page: plan, date, travelers, insurance, live price and add to cart. */
(function () {
    "use strict";

    var D = window.Tripelago;
    var R = D.RULES;
    var tourId = document.body.getAttribute("data-tour");
    var tour = D.tourById(tourId);
    if (!tour) {
        return;
    }

    var form = document.getElementById("book-form");
    var planInputs = Array.prototype.slice.call(document.querySelectorAll("input[name=plan]"));
    var dateSelect = document.getElementById("date");
    var qtyInput = document.getElementById("qty");
    var minus = document.getElementById("qty-minus");
    var plus = document.getElementById("qty-plus");
    var submit = form.querySelector("[type=submit]");
    var insurance = document.getElementById("insurance");
    var insuranceRow = document.getElementById("insurance-row");
    var insuranceIncluded = document.getElementById("insurance-included");
    var $ = function (id) { return document.getElementById(id); };

    D.fillDateSelect(dateSelect, D.wantedDate());

    /* Plan and travelers from the URL (home finder, plans page, destinations) */
    var wanted = D.param("plan");
    planInputs.forEach(function (input) {
        if (input.value === wanted) {
            input.checked = true;
        }
    });
    var wantedQty = parseInt(D.param("qty"), 10);
    if (wantedQty >= 1) {
        qtyInput.value = Math.min(wantedQty, R.maxPerDeparture);
    }

    function currentPlan() {
        var checked = planInputs.find(function (i) { return i.checked; });
        return D.planById(checked ? checked.value : "discover");
    }

    /* Seats this cart can still take on the chosen departure */
    function room() {
        return dateSelect.value ? D.cart.room(tourId, dateSelect.value) : R.maxPerDeparture;
    }

    function readQty() {
        var n = parseInt(qtyInput.value, 10);
        if (isNaN(n) || n < 1) {
            n = 1;
        }
        return Math.min(n, R.maxPerDeparture);
    }

    function itinerary(plan) {
        var arrive = tour.arrive || tour.name;
        var days = [];
        days.push(plan.transfers === "Not included"
            ? "Arrive in " + arrive + " and check in to your hotel. Meet your guide for an evening welcome walk."
            : "Arrive in " + arrive + ". Your transfer takes you to the hotel, then an evening welcome walk with your guide.");
        for (var d = 2; d < plan.days; d++) {
            var i = d - 2;
            days.push(i < tour.highlights.length
                ? tour.highlights[i] + "."
                : "Free day to explore on your own, or ask your guide about optional excursions.");
        }
        days.push(plan.transfers === "Not included"
            ? "Check out and make your own way to the airport."
            : "Slow morning, then your transfer to the airport.");
        return days;
    }

    function renderInCart() {
        var box = $("in-cart");
        var lines = D.cart.get().filter(function (l) { return l.tourId === tourId; });
        if (!lines.length) {
            box.hidden = true;
            return;
        }
        box.innerHTML = "<strong>In your cart:</strong> " + lines.map(function (l) {
            return D.escapeHtml(D.planById(l.planId).name + " · " + D.formatDate(l.date, "short") + " · " +
                D.plural(l.qty, "traveler") + (l.insurance ? " (insured)" : ""));
        }).join("; ") + ". <a href=\"pages/cart.html\">View cart</a>";
        box.hidden = false;
    }

    function render(rewriteQty) {
        var plan = currentPlan();
        var seats = room();
        var n = readQty();
        if (rewriteQty) {
            n = Math.max(1, Math.min(n, seats || 1));
            qtyInput.value = n;
        }
        var already = dateSelect.value ? D.cart.onTrip(tourId, plan.id, dateSelect.value) : 0;
        var line = { tourId: tourId, planId: plan.id, qty: n, insurance: !plan.insuranceIncluded && insurance.checked };
        var a = D.lineAmounts(line, n + already);

        planInputs.forEach(function (input) {
            input.closest(".plan-option").classList.toggle("checked", input.checked);
        });

        insuranceRow.hidden = plan.insuranceIncluded;
        insuranceIncluded.hidden = !plan.insuranceIncluded;

        $("p-unit").textContent = D.peso(a.unit) + " × " + n;
        $("p-gross").textContent = D.peso(a.gross);
        $("p-discount").textContent = "−" + D.peso(a.discount);
        $("p-discount-row").hidden = a.discount === 0;
        $("p-insurance").textContent = D.peso(a.insurance);
        $("p-insurance-row").hidden = a.insurance === 0;
        $("p-total").textContent = D.peso(a.net);
        $("book-bar-price").textContent = D.peso(a.unit, 0);
        $("book-bar-plan").textContent = plan.name;

        minus.disabled = n <= 1;
        plus.disabled = n >= Math.max(1, Math.min(R.maxPerDeparture, seats));
        submit.disabled = seats === 0;

        var hint = $("promo-hint");
        if (dateSelect.value && seats === 0) {
            hint.innerHTML = "Your cart already has " + R.maxPerDeparture + " travelers on this departure, the most one departure takes. Choose another date.";
            hint.className = "promo-hint warn";
        } else if (dateSelect.value && seats < R.maxPerDeparture) {
            hint.innerHTML = "Your cart already has " + D.plural(R.maxPerDeparture - seats, "traveler") + " on this departure, so you can add up to <strong>" + seats + " more</strong>." +
                (a.discount > 0 ? " Group discount applies." : "");
            hint.className = "promo-hint" + (a.discount > 0 ? " on" : "");
        } else if (a.discount > 0) {
            hint.innerHTML = already
                ? "With the " + D.plural(already, "traveler") + " already in your cart, this trip gets <strong>10% off</strong>."
                : "Group discount applied: <strong>10% off</strong> this trip.";
            hint.className = "promo-hint on";
        } else {
            var need = R.groupMin - n - already;
            hint.innerHTML = "Add <strong>" + D.plural(need, "more traveler") + "</strong> to get 10% off this trip.";
            hint.className = "promo-hint";
        }

        document.querySelectorAll("[data-plan-days]").forEach(function (el) {
            el.textContent = plan.days + " days, " + plan.nights + " nights";
        });
        /* Only the chosen plan's inclusions are listed here; the full comparison lives on the Plans page */
        document.querySelectorAll("[data-plan-name]").forEach(function (el) {
            el.textContent = plan.name;
        });
        var list = [plan.days + " days, " + plan.nights + " nights"].concat(plan.inclusions,
            plan.insuranceIncluded ? "Travel insurance" : "Optional travel insurance, " + D.peso(R.insurancePrice) + " per traveler");
        $("plan-inclusions").innerHTML = list.map(function (text) { return "<li>" + D.escapeHtml(text) + "</li>"; }).join("");
        $("itinerary").innerHTML = itinerary(plan).map(function (text, i) {
            return "<li><span class=\"day\">Day " + (i + 1) + "</span><span>" + D.escapeHtml(text) + "</span></li>";
        }).join("");
    }

    planInputs.forEach(function (input) { input.addEventListener("change", function () { render(false); }); });
    insurance.addEventListener("change", function () { render(false); });
    dateSelect.addEventListener("change", function () {
        D.ui.setInvalid(dateSelect, false);
        render(true);
    });
    qtyInput.addEventListener("input", function () { render(false); });
    qtyInput.addEventListener("change", function () { render(true); });
    minus.addEventListener("click", function () {
        qtyInput.value = readQty() - 1;
        render(true);
    });
    plus.addEventListener("click", function () {
        qtyInput.value = readQty() + 1;
        render(true);
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!D.ui.validate([[dateSelect, !!dateSelect.value, "Choose a departure date."]])) {
            return;
        }
        var plan = currentPlan();
        var requested = readQty();
        var result = D.cart.add({
            tourId: tourId, planId: plan.id, date: dateSelect.value, qty: requested,
            insurance: !plan.insuranceIncluded && insurance.checked
        });
        var name = tour.name + " · " + plan.name;
        if (result.added === 0) {
            D.ui.toast("Your cart already has 12 travelers on this departure. Choose another date.");
        } else if (result.added < requested) {
            D.ui.toast("Added " + D.plural(result.added, "traveler") + " to " + name + ". Departures take 12 travelers at most.", { href: "pages/cart.html", text: "View cart" });
        } else {
            D.ui.toast(name + " added to your cart", { href: "pages/cart.html", text: "View cart" });
        }
        render(true);
        renderInCart();
    });

    document.addEventListener("tripelago:cart", function () {
        render(false);
        renderInCart();
    });

    /* Mobile: a bar with the price and a Book button while the booking box is off screen */
    var bar = $("book-bar");
    var widget = $("book");
    if (bar && widget && "IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
            var visible = entries[0].isIntersecting;
            bar.classList.toggle("show", !visible);
            document.body.classList.toggle("has-book-bar", !visible);
        }, { rootMargin: "0px 0px -20% 0px" });
        observer.observe(widget);
    }

    render(true);
    renderInCart();
}());
