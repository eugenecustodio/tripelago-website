/* Cart page: change dates and travelers, add insurance, promo codes, undo removals. */
(function () {
    "use strict";

    var D = window.Tripelago;
    var R = D.RULES;
    var listEl = document.getElementById("cart-lines");
    var emptyEl = document.getElementById("cart-empty");
    var layoutEl = document.getElementById("cart-layout");
    var promoForm = document.getElementById("promo-form");
    var promoInput = document.getElementById("promo");
    var promoMsg = document.getElementById("promo-message");
    var promoRemove = document.getElementById("promo-remove");
    var issuesEl = document.getElementById("cart-issues");
    var checkoutBtn = document.getElementById("to-checkout");
    var clearBtn = document.getElementById("clear-cart");
    var clearConfirm = document.getElementById("clear-confirm");
    var esc = D.escapeHtml;
    var lastRemoved = null; /* { removed, name } shown as an inline "Undo" row */
    var promoError = "";

    function $(id) {
        return document.getElementById(id);
    }

    function dateOptions(selected) {
        var list = D.departures();
        var html = "";
        if (!list.some(function (d) { return d.iso === selected; })) {
            html += "<option value=\"" + esc(selected) + "\" disabled selected>" + esc(D.formatDate(selected, "short")) + " (closed)</option>";
        }
        list.forEach(function (d) {
            html += "<option value=\"" + d.iso + "\"" + (d.iso === selected ? " selected" : "") + ">" + esc(d.short) + "</option>";
        });
        return html;
    }

    function lineHtml(line, lines) {
        var tour = D.tourById(line.tourId);
        var plan = D.planById(line.planId);
        var a = D.lineAmounts(line, lines);
        var key = D.lineKey(line);
        var bookable = D.isBookable(line.date);
        var max = Math.max(1, D.cart.room(line.tourId, line.date, key));
        var page = tour.url + "?plan=" + plan.id;
        var uid = esc(key.replace(/[^a-z0-9]/gi, "-"));
        var insuranceControl = plan.insuranceIncluded
            ? "<p class=\"line-note\">Travel insurance included</p>"
            : "<label class=\"check line-insurance\"><input type=\"checkbox\" data-insurance" + (line.insurance ? " checked" : "") + "> <span>" +
                (line.insurance ? "Travel insurance added, " : "Add travel insurance, ") + D.peso(R.insurancePrice, 0) + " per traveler</span></label>";

        return "<li class=\"cart-line" + (bookable ? "" : " has-issue") + "\" data-key=\"" + esc(key) + "\">" +
            "<a class=\"cart-thumb\" href=\"" + page + "\" tabindex=\"-1\" aria-hidden=\"true\"><img src=\"" + esc(tour.img) + "\" alt=\"\" width=\"640\" height=\"400\"></a>" +
            "<div class=\"cart-line-main\">" +
                "<h3><a href=\"" + page + "\">" + esc(tour.name) + ", " + esc(tour.country) + "</a></h3>" +
                "<p class=\"meta\">" + esc(plan.name) + " plan · " + plan.days + " days, " + plan.nights + " nights</p>" +
                "<div class=\"line-controls\">" +
                    "<label class=\"line-date\"><span class=\"visually-hidden\">Departure date for " + esc(tour.name) + "</span>" +
                        "<select class=\"contact-input\" data-date id=\"date-" + uid + "\">" + dateOptions(line.date) + "</select></label>" +
                    "<div class=\"qty-stepper\" role=\"group\" aria-label=\"Travelers for " + esc(tour.name) + "\">" +
                        "<button type=\"button\" data-step=\"-1\" aria-label=\"One fewer traveler\"" + (line.qty <= 1 ? " disabled" : "") + ">−</button>" +
                        "<input type=\"number\" inputmode=\"numeric\" min=\"1\" max=\"" + max + "\" value=\"" + line.qty + "\" data-qty aria-label=\"Travelers for " + esc(tour.name) + "\">" +
                        "<button type=\"button\" data-step=\"1\" aria-label=\"One more traveler\"" + (line.qty >= max ? " disabled" : "") + ">+</button>" +
                    "</div>" +
                    "<button type=\"button\" class=\"remove\" aria-label=\"Remove " + esc(tour.name) + " (" + esc(plan.name) + ") from your cart\">Remove</button>" +
                "</div>" +
                (bookable ? "" : "<p class=\"line-error\">This departure is no longer open for booking. Choose a new date to continue.</p>") +
                insuranceControl +
            "</div>" +
            "<div class=\"amount\">" +
                "<small>" + line.qty + " × " + D.peso(a.unit) + "</small>" +
                "<strong>" + D.peso(a.net) + "</strong>" +
                (a.discount ? "<em>Group discount −" + D.peso(a.discount) + "</em>" : "") +
                (a.insurance ? "<em class=\"plus\">Insurance +" + D.peso(a.insurance) + "</em>" : "") +
            "</div>" +
        "</li>";
    }

    function removedHtml() {
        return "<li class=\"cart-removed\"><span>" + esc(lastRemoved.name) + " was removed from your cart.</span>" +
            "<button type=\"button\" class=\"btn ghost small\" data-undo>Undo</button></li>";
    }

    function render(focus) {
        var lines = D.cart.get();
        var hasLines = lines.length > 0 || !!lastRemoved;
        layoutEl.hidden = !hasLines;
        emptyEl.hidden = hasLines;

        var items = lines.map(function (l) { return lineHtml(l, lines); });
        if (lastRemoved) {
            items.splice(Math.min(lastRemoved.removed.index, items.length), 0, removedHtml());
        }
        listEl.innerHTML = items.join("");

        var t = D.cart.totals(lines);
        $("s-travelers").textContent = t.travelers;
        $("s-subtotal").textContent = D.peso(t.subtotal);
        $("s-group").textContent = "−" + D.peso(t.groupDiscount);
        $("s-group-row").hidden = t.groupDiscount === 0;
        $("s-insurance").textContent = "+" + D.peso(t.insurance);
        $("s-insurance-row").hidden = t.insurance === 0;
        $("s-code").textContent = "−" + D.peso(t.codeDiscount);
        $("s-code-row").hidden = !t.code;
        $("s-code-label").textContent = t.code ? "Promo " + t.code : "";
        $("s-total").textContent = D.peso(t.total);

        var code = D.promo.get();
        promoRemove.hidden = !code;
        $("summary-note").hidden = !!code;
        if (promoError) {
            showPromo(promoError, "bad");
        } else if (code && t.code) {
            promoInput.value = code;
            showPromo(D.promo.describe(code) + " applied.", "good");
        } else if (code && t.codeNote) {
            promoInput.value = code;
            showPromo(t.codeNote, "");
        } else {
            promoMsg.hidden = true;
        }

        var issues = D.cart.issues(lines);
        var blocked = issues.length > 0 || lines.length === 0;
        issuesEl.hidden = issues.length === 0;
        checkoutBtn.classList.toggle("disabled", blocked);
        checkoutBtn.setAttribute("aria-disabled", blocked ? "true" : "false");

        if (focus) {
            var target = null;
            if (focus.undo) {
                target = listEl.querySelector("[data-undo]");
            } else {
                var li = listEl.querySelector("[data-key=\"" + focus.key.replace(/"/g, "") + "\"]");
                target = li && (li.querySelector(focus.selector + ":not([disabled])") || li.querySelector("[data-qty]"));
            }
            if (target) {
                target.focus();
            }
        }
    }

    function showPromo(text, tone) {
        promoMsg.textContent = text;
        promoMsg.className = "notice" + (tone ? " " + tone : "");
        promoMsg.hidden = false;
    }

    function clearUndo() {
        lastRemoved = null;
    }

    listEl.addEventListener("click", function (event) {
        if (event.target.closest("[data-undo]")) {
            var restore = lastRemoved;
            lastRemoved = null;
            if (D.cart.restore(restore.removed)) {
                render({ key: D.lineKey(restore.removed.line), selector: ".remove" });
            } else {
                render();
                D.ui.toast("That departure is full now, so the trip couldn't be put back.");
            }
            return;
        }
        var li = event.target.closest(".cart-line");
        if (!li) {
            return;
        }
        var key = li.getAttribute("data-key");
        var step = event.target.closest("[data-step]");
        if (step) {
            clearUndo();
            var current = parseInt(li.querySelector("[data-qty]").value, 10) || 1;
            D.cart.setQty(key, current + Number(step.getAttribute("data-step")));
            render({ key: key, selector: "[data-step=\"" + step.getAttribute("data-step") + "\"]" });
            return;
        }
        if (event.target.closest(".remove")) {
            var removed = D.cart.remove(key);
            if (removed) {
                var tour = D.tourById(removed.line.tourId);
                var plan = D.planById(removed.line.planId);
                lastRemoved = { removed: removed, name: tour.name + " · " + plan.name };
            }
            render({ undo: true });
        }
    });

    listEl.addEventListener("change", function (event) {
        var li = event.target.closest(".cart-line");
        if (!li) {
            return;
        }
        clearUndo();
        var key = li.getAttribute("data-key");
        if (event.target.matches("[data-qty]")) {
            var result = D.cart.setQty(key, event.target.value);
            if (result.clamped) {
                D.ui.toast(result.max === R.maxPerDeparture
                    ? "Each departure takes up to " + R.maxPerDeparture + " travelers, so this trip is set to " + result.max + "."
                    : "Only " + result.max + " fit on this trip: departures take " + R.maxPerDeparture + " travelers, including your other trips on that date.");
            }
            render({ key: key, selector: "[data-qty]" });
        } else if (event.target.matches("[data-insurance]")) {
            var newKey = D.cart.setInsurance(key, event.target.checked);
            render({ key: newKey, selector: "[data-insurance]" });
        } else if (event.target.matches("[data-date]")) {
            var date = event.target.value;
            var moved = D.cart.setDate(key, date);
            if (!moved.ok) {
                if (moved.full) {
                    var line = D.cart.find(key);
                    D.ui.toast("Only " + D.plural(moved.room, "seat") + " left on " + D.formatDate(date, "short") + " in your cart" +
                        (line ? ", not enough for " + D.plural(line.qty, "traveler") : "") + ". The trip stays on its original date.");
                }
                render({ key: key, selector: "[data-date]" });
                return;
            }
            if (moved.merged) {
                D.ui.toast("Combined with the same trip already in your cart on that date.");
            }
            render({ key: moved.key, selector: "[data-date]" });
        }
    });

    promoForm.addEventListener("submit", function (event) {
        event.preventDefault();
        promoError = "";
        clearUndo();
        if (!promoInput.value.trim()) {
            D.promo.clear();
            render();
            return;
        }
        var result = D.promo.apply(promoInput.value);
        if (!result.ok) {
            promoError = result.message;
            render();
            promoInput.focus();
            return;
        }
        render();
    });

    promoInput.addEventListener("input", function () {
        if (promoError) {
            promoError = "";
            promoMsg.hidden = true;
        }
    });

    promoRemove.addEventListener("click", function () {
        D.promo.clear();
        promoError = "";
        promoInput.value = "";
        render();
        promoInput.focus();
    });

    /* Two-step clear so one tap can't empty the cart */
    clearBtn.addEventListener("click", function () {
        clearBtn.hidden = true;
        clearConfirm.hidden = false;
        $("clear-yes").focus();
    });
    $("clear-no").addEventListener("click", function () {
        clearConfirm.hidden = true;
        clearBtn.hidden = false;
        clearBtn.focus();
    });
    $("clear-yes").addEventListener("click", function () {
        clearUndo();
        D.cart.clear();
        clearConfirm.hidden = true;
        clearBtn.hidden = false;
        render();
        $("cart-empty-title").focus();
    });

    checkoutBtn.addEventListener("click", function (event) {
        if (checkoutBtn.classList.contains("disabled")) {
            event.preventDefault();
            var first = listEl.querySelector(".has-issue [data-date]");
            if (first) {
                first.focus();
            }
        }
    });

    document.addEventListener("tripelago:cart", function (event) {
        if (event.detail && event.detail.external) {
            clearUndo();
            render();
        }
    });

    render();
}());
