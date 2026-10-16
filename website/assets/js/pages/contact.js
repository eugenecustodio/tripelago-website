(function () {
    "use strict";

    var D = window.Tripelago;
    var form = document.getElementById("contact-form");
    if (!form) {
        return;
    }

    var f = function (name) { return form.querySelector("[name=" + name + "]"); };
    var success = document.getElementById("contact-success");
    var ready = document.getElementById("contact-ready");
    var failure = document.getElementById("contact-failure");
    var copyText = document.getElementById("contact-copy-text");
    var button = form.querySelector("[type=submit]");
    var TOPICS = { booking: "A booking I've made", planning: "Help planning a trip", group: "Group or corporate travel", other: "Something else" };

    function prefill() {
        var user = D.auth.current();
        if (user) {
            f("name").value = user.name;
            f("email").value = user.email;
        }
        /* Links such as ?topic=booking&ref=TRP-ABC123 from the account page */
        var topic = (D.param("topic") || "").replace(/[^a-z]/g, "");
        if (Object.prototype.hasOwnProperty.call(TOPICS, topic)) {
            f("topic").value = topic;
        }
        var ref = D.param("ref");
        if (ref && /^TRP-[A-Z0-9]{4,10}$/.test(ref) && !f("message").value) {
            f("message").value = "Booking " + ref + ": I'd like to ";
        }
    }

    prefill();

    function messageText(m) {
        return m.message + "\n\n" + m.name + "\n" + m.email;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        failure.hidden = true;

        if (!D.ui.validate([
            [f("name"), f("name").value.trim().length >= 2, "Please tell us your name."],
            [f("email"), D.validators.email(f("email").value), "Enter a valid email address so we can reply."],
            [f("topic"), !!f("topic").value, "Choose what your message is about."],
            [f("message"), f("message").value.trim().length >= 10, "Add a few more details (at least 10 characters)."]
        ])) {
            return;
        }

        var message = {
            name: f("name").value.trim(),
            email: f("email").value.trim(),
            topic: f("topic").value,
            message: f("message").value.trim()
        };

        /* Without a form service, hand the message to the visitor's email app */
        if (!D.isConfigured("contact")) {
            document.getElementById("contact-mail").href = D.mailto(TOPICS[message.topic] + " · " + message.name, messageText(message));
            copyText.value = messageText(message);
            copyText.hidden = true;
            form.hidden = true;
            ready.hidden = false;
            ready.focus();
            return;
        }

        D.ui.busy(button, "Sending…");
        D.send("contact", message).then(function (result) {
            D.ui.busy(button, null);
            if (!result.ok) {
                failure.hidden = false;
                failure.focus();
                return;
            }
            document.getElementById("contact-success-name").textContent = message.name.split(" ")[0];
            form.hidden = true;
            success.hidden = false;
            success.focus();
        });
    });

    D.ui.copyButton(document.getElementById("contact-copy"), function () { return copyText.value; }, copyText);

    document.getElementById("contact-edit").addEventListener("click", function () {
        ready.hidden = true;
        form.hidden = false;
        f("message").focus();
    });

    document.getElementById("contact-again").addEventListener("click", function () {
        form.reset();
        prefill();
        form.hidden = false;
        success.hidden = true;
        f("message").focus();
    });
}());
