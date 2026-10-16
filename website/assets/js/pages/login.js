(function () {
    "use strict";

    var D = window.Tripelago;
    var next = D.safeNext(D.param("next"), "pages/account.html");

    if (D.auth.current()) {
        window.location.replace(next);
        return;
    }

    function field(form, name) {
        return form.querySelector("[name=" + name + "]");
    }

    var tabs = document.querySelectorAll(".auth-tabs [role=tab]");
    var forms = { signin: document.getElementById("form-signin"), signup: document.getElementById("form-signup") };
    var title = document.getElementById("auth-title");

    function showTab(name, focus) {
        tabs.forEach(function (tab) {
            var active = tab.dataset.tab === name;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
            tab.tabIndex = active ? 0 : -1;
            if (active && focus) {
                tab.focus();
            }
        });
        forms.signin.hidden = name !== "signin";
        forms.signup.hidden = name !== "signup";
        title.textContent = name === "signin" ? "Welcome back" : "Create your account";
    }

    tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { showTab(tab.dataset.tab); });
        tab.addEventListener("keydown", function (event) {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                var other = tabs[(i + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
                showTab(other.dataset.tab, true);
            }
        });
    });

    document.querySelectorAll("[data-show-tab]").forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            showTab(link.getAttribute("data-show-tab"), true);
        });
    });

    showTab(D.param("tab") === "signup" ? "signup" : "signin");

    /* Show / hide password */
    document.querySelectorAll("[data-toggle-password]").forEach(function (button) {
        var input = document.getElementById(button.getAttribute("data-toggle-password"));
        button.addEventListener("click", function () {
            var show = input.type === "password";
            input.type = show ? "text" : "password";
            button.textContent = show ? "Hide" : "Show";
            button.setAttribute("aria-label", show ? "Hide password" : "Show password");
        });
    });

    /* Forgot password: accounts live on this device, so offer to remove it and start again. */
    var forgot = document.getElementById("forgot-toggle");
    var forgotNote = document.getElementById("forgot-note");
    var forgotResult = document.getElementById("forgot-result");
    forgot.addEventListener("click", function () {
        var open = forgotNote.hidden;
        forgotNote.hidden = !open;
        forgot.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.getElementById("forgot-remove").addEventListener("click", function () {
        var emailInput = field(forms.signin, "email");
        if (!D.validators.email(emailInput.value)) {
            D.ui.setInvalid(emailInput, true, "Enter the email address of the account first.");
            emailInput.focus();
            return;
        }
        D.ui.setInvalid(emailInput, false);
        if (!D.auth.removeFromDevice(emailInput.value)) {
            forgotResult.textContent = "There's no account with that email on this device.";
            return;
        }
        forgotResult.textContent = "";
        forgotNote.hidden = true;
        forgot.setAttribute("aria-expanded", "false");
        field(forms.signup, "email").value = emailInput.value.trim();
        showTab("signup", false);
        showMessage(forms.signup, "The account was removed from this device. Create it again with a new password; your bookings will still be there.", true);
        field(forms.signup, "name").focus();
    });

    function showMessage(form, text, good) {
        var box = form.querySelector(".form-message");
        box.textContent = text;
        box.className = "notice form-message " + (good ? "good" : "bad");
        box.hidden = false;
    }

    forms.signin.addEventListener("submit", function (event) {
        event.preventDefault();
        var email = field(forms.signin, "email");
        var pass = field(forms.signin, "password");
        var button = forms.signin.querySelector("[type=submit]");
        forms.signin.querySelector(".form-message").hidden = true;

        if (!D.ui.validate([
            [email, D.validators.email(email.value), "Enter the email address you signed up with."],
            [pass, !!pass.value, "Enter your password."]
        ])) {
            return;
        }

        D.ui.busy(button, "Signing in…");
        D.auth.login(email.value, pass.value).then(function (result) {
            if (!result.ok) {
                D.ui.busy(button, null);
                showMessage(forms.signin, result.message);
                pass.focus();
                return;
            }
            window.location.href = next;
        });
    });

    forms.signup.addEventListener("submit", function (event) {
        event.preventDefault();
        var name = field(forms.signup, "name");
        var email = field(forms.signup, "email");
        var pass = field(forms.signup, "password");
        var confirm = field(forms.signup, "confirm");
        var terms = field(forms.signup, "terms");
        var button = forms.signup.querySelector("[type=submit]");
        forms.signup.querySelector(".form-message").hidden = true;

        if (!D.ui.validate([
            [name, name.value.trim().length >= 2, "Enter your full name."],
            [email, D.validators.email(email.value), "Enter a valid email address, like name@example.com."],
            [pass, pass.value.length >= 8, "Use at least 8 characters."],
            [confirm, confirm.value === pass.value && pass.value.length > 0, "The passwords don't match."],
            [terms, terms.checked, "Please accept the terms to continue."]
        ])) {
            return;
        }

        D.ui.busy(button, "Creating account…");
        D.auth.register(name.value, email.value, pass.value).then(function (result) {
            if (!result.ok) {
                D.ui.busy(button, null);
                showMessage(forms.signup, result.message);
                email.focus();
                return;
            }
            window.location.href = next;
        });
    });
}());
