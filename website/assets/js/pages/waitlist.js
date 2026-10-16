/* Mobile app page: launch waitlist sign-up. */
(function () {
    "use strict";

    var D = window.Tripelago;
    var form = document.getElementById("waitlist-form");
    if (!form) {
        return;
    }

    var input = document.getElementById("wl-email");
    var button = form.querySelector("[type=submit]");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!D.ui.validate([[input, D.validators.email(input.value), "Enter a valid email address, like name@example.com."]])) {
            return;
        }
        var email = input.value.trim().toLowerCase();

        /* Without a form service, the sign-up is sent from the visitor's email app */
        if (!D.isConfigured("waitlist")) {
            document.getElementById("waitlist-mail-email").textContent = email;
            document.getElementById("waitlist-mail-link").href = D.mailto("App waitlist", "Please add " + email + " to the Tripelago app waitlist.");
            form.hidden = true;
            document.getElementById("waitlist-mail").hidden = false;
            document.getElementById("waitlist-mail").focus();
            return;
        }

        D.ui.busy(button, "Adding…");
        D.send("waitlist", { email: email }).then(function (result) {
            D.ui.busy(button, null);
            if (!result.ok) {
                D.ui.setInvalid(input, true, "We couldn't add you just now. Please try again in a minute.");
                return;
            }
            document.getElementById("waitlist-email").textContent = email;
            form.hidden = true;
            document.getElementById("waitlist-done").hidden = false;
            document.getElementById("waitlist-done").focus();
        });
    });
}());
