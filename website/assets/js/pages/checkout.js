/* Checkout: lead traveler, payment method, place order, confirmation. */
(function () {
    "use strict";

    var D = window.Tripelago;
    var R = D.RULES;
    var form = document.getElementById("checkout-form");
    var layout = document.getElementById("checkout-layout");
    var emptyEl = document.getElementById("checkout-empty");
    var confirmEl = document.getElementById("confirmation");
    var issuesEl = document.getElementById("checkout-issues");
    var errorEl = document.getElementById("checkout-error");
    var button = document.getElementById("place-order");
    var esc = D.escapeHtml;
    var placed = false;
    var ready = false;

    function $(id) {
        return document.getElementById(id);
    }

    function f(name) {
        return form.querySelector("[name=" + name + "]");
    }

    /* Keep each detail ("group discount −₱10,920.00") on one line */
    function joinDetails(details) {
        return details.map(function (d) { return "<span class=\"nw\">" + esc(d) + "</span>"; }).join(" · ");
    }

    function enteredEmail() {
        var value = f("email").value.trim().toLowerCase();
        return D.validators.email(value) ? value : null;
    }

    function renderSummary() {
        var lines = D.cart.get();
        var t = D.cart.totals(lines, { email: enteredEmail() });
        $("summary-lines").innerHTML = lines.map(function (line) {
            var tour = D.tourById(line.tourId);
            var plan = D.planById(line.planId);
            var a = D.lineAmounts(line, lines);
            var details = [D.plural(line.qty, "traveler"), "departs " + D.formatDate(line.date)];
            if (a.discount) {
                details.push("group discount −" + D.peso(a.discount));
            }
            if (a.insurance) {
                details.push("insurance +" + D.peso(a.insurance));
            }
            return "<li><strong><span>" + esc(tour.name) + " · " + esc(plan.name) + "</span><span>" + D.peso(a.net) + "</span></strong>" +
                "<small>" + joinDetails(details) + "</small></li>";
        }).join("");
        $("c-travelers").textContent = t.travelers;
        $("c-subtotal").textContent = D.peso(t.subtotal);
        $("c-group").textContent = "−" + D.peso(t.groupDiscount);
        $("c-group-row").hidden = t.groupDiscount === 0;
        $("c-insurance").textContent = "+" + D.peso(t.insurance);
        $("c-insurance-row").hidden = t.insurance === 0;
        $("c-code").textContent = "−" + D.peso(t.codeDiscount);
        $("c-code-row").hidden = !t.code;
        $("c-code-label").textContent = t.code ? "Promo " + t.code : "";
        $("c-total").textContent = D.peso(t.total);
        $("c-total-inline").textContent = D.peso(t.total);
        $("c-code-note").textContent = t.codeNote;
        $("c-code-note").hidden = !t.codeNote;
        $("c-passport").textContent = t.travelers === 1
            ? "We'll ask for your passport details after payment."
            : "You're booking for " + D.plural(t.travelers, "traveler") + ". We'll ask for each traveler's passport details after payment.";

        var issues = D.cart.issues(lines);
        issuesEl.hidden = issues.length === 0;
        button.disabled = issues.length > 0;
        return t;
    }

    function showForm() {
        layout.hidden = false;
        emptyEl.hidden = true;
        confirmEl.hidden = true;
        if (!ready) {
            ready = true;
            var user = D.auth.current();
            if (user) {
                if (!f("name").value) {
                    f("name").value = user.name;
                }
                if (!f("email").value) {
                    f("email").value = user.email;
                }
                $("signin-prompt").hidden = true;
            }
            form.querySelectorAll(".pay-option input").forEach(function (input) {
                input.addEventListener("change", markPayment);
            });
            f("email").addEventListener("change", renderSummary);
            markPayment();
        }
        renderSummary();
    }

    function init() {
        if (D.cart.get().length) {
            showForm();
            return;
        }
        /* Refreshing the confirmation page shows it again instead of an empty checkout */
        var last = D.bookings.last();
        if (last) {
            renderConfirmation(last, false);
            return;
        }
        layout.hidden = true;
        confirmEl.hidden = true;
        emptyEl.hidden = false;
    }

    function markPayment() {
        form.querySelectorAll(".pay-option").forEach(function (opt) {
            opt.classList.toggle("checked", opt.querySelector("input").checked);
        });
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (placed) {
            return;
        }
        errorEl.hidden = true;

        if (!D.ui.validate([
            [f("name"), f("name").value.trim().length >= 2, "Enter the lead traveler's full name."],
            [f("email"), D.validators.email(f("email").value), "Enter a valid email address. We send your payment instructions there."],
            [f("phone"), D.validators.phone(f("phone").value), "Enter a mobile number we can reach you on, like 0917 123 4567."],
            [f("terms"), f("terms").checked, "Please confirm you've read the booking terms."]
        ])) {
            return;
        }

        renderSummary();
        if (D.cart.issues().length) {
            issuesEl.focus();
            return;
        }

        var payment = form.querySelector("[name=payment]:checked").value;
        var booking = D.bookings.create({
            name: f("name").value.trim(),
            email: f("email").value.trim(),
            phone: f("phone").value.trim(),
            requests: f("requests").value.trim()
        }, payment);

        if (!booking) {
            init();
            return;
        }

        placed = true;
        D.ui.busy(button, "Placing your order…");
        D.send("booking", booking).then(function (result) {
            if (!result.ok) {
                placed = false;
                D.ui.busy(button, null);
                errorEl.hidden = false;
                errorEl.focus();
                return;
            }
            D.bookings.save(booking, result.remote);
            renderConfirmation(booking, true);
        });
    });

    function renderConfirmation(b, scroll) {
        layout.hidden = true;
        emptyEl.hidden = true;
        confirmEl.hidden = false;
        var sent = !!b.sent;
        var paymentText = D.bookings.paymentLabel(b.payment);

        $("conf-name").textContent = b.name.split(" ")[0];
        $("conf-ref").textContent = b.ref;
        confirmEl.querySelectorAll(".conf-email").forEach(function (el) { el.textContent = b.email; });
        confirmEl.querySelectorAll(".conf-payment").forEach(function (el) { el.textContent = paymentText; });
        $("conf-sent").hidden = !sent;
        $("conf-unsent").hidden = sent;
        if (!sent) {
            var text = D.bookings.text(b);
            $("conf-mail").href = D.mailto("Booking " + b.ref + " · " + b.name, text);
            $("conf-copy-text").value = text;
        }

        $("conf-lines").innerHTML = b.lines.map(function (line) {
            var details = [D.plural(Number(line.qty) || 0, "traveler"), "departs " + D.formatDate(line.date)];
            if (line.insurance) {
                details.push("with travel insurance");
            }
            return "<li><strong><span>" + esc(line.tourName) + " · " + esc(line.planName) + "</span><span>" + D.peso(Number(line.net) || 0) + "</span></strong>" +
                "<small>" + joinDetails(details) + "</small></li>";
        }).join("");
        $("conf-total").textContent = D.peso(Number(b.totals.total) || 0);

        var steps = sent ? [] : ["Send us your booking with the button above."];
        steps.push("Within one business day, a trip specialist emails " + paymentText + " instructions and your visa checklist.");
        steps.push("Pay within " + R.holdBusinessDays + " business days of that email to keep your seats.");
        steps.push("Your final itinerary is confirmed 14 days before departure.");
        $("conf-steps").innerHTML = steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");

        var user = D.auth.current();
        var sameUser = user && user.email === b.email;
        $("conf-account").hidden = !sameUser;
        $("conf-signup").hidden = !!user;
        $("conf-other-account").hidden = !(user && !sameUser);

        if (scroll) {
            window.scrollTo({ top: 0, behavior: D.prefersReducedMotion() ? "auto" : "smooth" });
            $("conf-heading").focus({ preventScroll: true });
        }
    }

    D.ui.copyButton($("conf-copy"), function () { return $("conf-copy-text").value; }, $("conf-copy-text"));

    /* Another tab changed the cart */
    document.addEventListener("tripelago:cart", function (event) {
        if (placed || !(event.detail && event.detail.external)) {
            return;
        }
        if (D.cart.get().length) {
            showForm();
        } else if (confirmEl.hidden) {
            layout.hidden = true;
            emptyEl.hidden = false;
        }
    });

    init();
}());
