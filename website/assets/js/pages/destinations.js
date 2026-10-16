/* Destinations page: search, region filter, saved trips and sorting. */
(function () {
    "use strict";

    var D = window.Tripelago;
    var grid = document.getElementById("tour-grid");
    if (!grid) {
        return;
    }

    var cards = Array.prototype.slice.call(grid.querySelectorAll(".tour-card"));
    var search = document.getElementById("search");
    var sort = document.getElementById("sort");
    var chips = Array.prototype.slice.call(document.querySelectorAll(".region-chip"));
    var count = document.getElementById("result-count");
    var empty = document.getElementById("empty-results");
    var emptyTitle = document.getElementById("empty-title");
    var emptyText = document.getElementById("empty-text");
    var view = "all";
    var pricePlan = "wander";
    var planSelect = document.getElementById("price-plan");
    var qtyParam = parseInt(D.param("qty"), 10);
    var qty = qtyParam >= 1 && qtyParam <= D.RULES.maxPerDeparture ? qtyParam : 0;
    /* Departure picked in the home page finder (?date= or ?month=), carried into each trip link */
    var when = D.wantedDate();
    var planChosen = false;
    if (D.planById(D.param("plan"))) {
        pricePlan = D.param("plan");
        planChosen = true;
    }

    /* Deal picked on the home or plans page, e.g. ?plan=wander&deal=ESCAPE8: keep its code for checkout */
    var deal = String(D.param("deal") || "").toUpperCase();
    if (deal && D.promo.save(deal)) {
        D.ui.toast("Deal saved: " + D.promo.describe(deal) + ". It's applied in your cart once your trip qualifies.");
    }

    /* Show each card's price for the chosen plan, and carry plan and travelers into the trip links */
    function applyPlan() {
        var plan = D.planById(pricePlan);
        planSelect.value = pricePlan;
        cards.forEach(function (card) {
            var id = card.dataset.id;
            card.dataset.price = D.unitPrice(id, pricePlan);
            card.querySelector(".card-price").textContent = D.peso(D.unitPrice(id, pricePlan), 0);
            card.querySelector(".from").textContent = pricePlan === "wander" ? "From" : plan.name + " · " + plan.days + " days";
            var parts = [];
            if (planChosen) { parts.push("plan=" + pricePlan); }
            if (qty) { parts.push("qty=" + qty); }
            if (when) { parts.push("date=" + when); }
            var query = parts.length ? "?" + parts.join("&") : "";
            card.querySelector(".tour-card-link").setAttribute("href", D.tourById(id).url + query);
        });
    }

    planSelect.addEventListener("change", function () {
        pricePlan = planSelect.value;
        planChosen = true;
        applyPlan();
        apply();
    });

    var regionParam = D.param("region");
    var viewParam = D.param("view");
    if (viewParam === "saved") {
        view = "saved";
    } else if (regionParam && chips.some(function (c) { return c.dataset.region === regionParam; })) {
        view = regionParam;
    }
    if (D.param("q")) {
        search.value = D.param("q").slice(0, 60);
    }

    function setChips() {
        chips.forEach(function (chip) {
            var active = chip.dataset.region === view;
            chip.classList.toggle("active", active);
            chip.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    function apply() {
        var q = search.value.trim().toLowerCase();
        var savedList = D.saved.list();
        var visible = [];

        cards.forEach(function (card) {
            var matchesView = view === "all" ||
                (view === "saved" ? savedList.indexOf(card.dataset.id) !== -1 : card.dataset.region === view);
            var hay = (card.dataset.name + " " + card.dataset.country + " " + card.dataset.region).toLowerCase();
            var show = matchesView && (!q || hay.indexOf(q) !== -1);
            card.hidden = !show;
            if (show) {
                visible.push(card);
            }
        });

        var mode = sort.value;
        visible.sort(function (a, b) {
            if (mode === "price-asc") { return Number(a.dataset.price) - Number(b.dataset.price); }
            if (mode === "price-desc") { return Number(b.dataset.price) - Number(a.dataset.price); }
            if (mode === "name") { return a.dataset.name.localeCompare(b.dataset.name); }
            return Number(a.dataset.order) - Number(b.dataset.order);
        });
        visible.forEach(function (card) { grid.appendChild(card); });

        if (view === "saved" && !savedList.length) {
            count.textContent = "You haven't saved any trips yet";
        } else if (visible.length === cards.length) {
            count.textContent = "Showing all " + cards.length + " destinations";
        } else {
            count.textContent = "Showing " + visible.length + " of " + cards.length + " destinations";
        }

        var none = visible.length === 0;
        empty.hidden = !none;
        if (none && view === "saved" && !savedList.length) {
            emptyTitle.textContent = "No saved trips yet";
            emptyText.textContent = "Tap the heart on any destination to keep it here for later.";
        } else if (none) {
            emptyTitle.textContent = "No matches";
            emptyText.textContent = "Try another spelling, or clear the filters to see every destination.";
        }
    }

    chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            view = chip.dataset.region;
            setChips();
            apply();
        });
    });

    search.addEventListener("input", apply);
    sort.addEventListener("change", apply);
    document.getElementById("clear-filters").addEventListener("click", function () {
        search.value = "";
        sort.value = "recommended";
        view = "all";
        setChips();
        apply();
        search.focus();
    });

    /* Re-filter when a trip is saved or removed (here or in another tab) */
    document.addEventListener("tripelago:saved", function () {
        if (view === "saved") {
            apply();
        }
    });

    setChips();
    applyPlan();
    apply();
}());
