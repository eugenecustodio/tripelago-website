/* Home page: background video and the trip finder (where / when / travelers). */
(function () {
    "use strict";

    var D = window.Tripelago;

    /* ----- BACKGROUND VIDEO ----- */
    /* Plays muted with no controls. Skipped for reduced motion and data saver,
       paused while off screen, and the visitor can pause it at any time. */
    (function () {
        var video = document.querySelector("[data-hero-video]");
        var toggle = document.querySelector("[data-video-toggle]");
        if (!video || !toggle) {
            return;
        }
        var media = video.parentNode;
        var label = toggle.querySelector("[data-video-toggle-label]");
        var saveData = navigator.connection && navigator.connection.saveData;
        if (D.prefersReducedMotion() || saveData || typeof video.play !== "function") {
            return;
        }
        var userPaused = false;
        var visible = true;

        function setLabel() {
            var paused = video.paused;
            toggle.classList.toggle("is-paused", paused);
            label.textContent = paused ? "Play background video" : "Pause background video";
        }

        function play() {
            var attempt = video.play();
            if (attempt && attempt.catch) {
                attempt.catch(function () { setLabel(); });
            }
        }

        video.addEventListener("playing", function () {
            media.classList.add("is-playing");
            setLabel();
        });
        video.addEventListener("pause", setLabel);

        toggle.hidden = false;
        /* If the video can't load (offline, blocked), keep the still image and drop the button */
        var sources = video.querySelectorAll("source");
        if (sources.length) {
            sources[sources.length - 1].addEventListener("error", function () {
                toggle.hidden = true;
            });
        }
        toggle.addEventListener("click", function () {
            if (video.paused) {
                userPaused = false;
                play();
            } else {
                userPaused = true;
                video.pause();
            }
        });

        if ("IntersectionObserver" in window) {
            new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
                if (!visible) {
                    video.pause();
                } else if (!userPaused) {
                    play();
                }
            }).observe(media);
        }

        document.addEventListener("visibilitychange", function () {
            if (document.hidden) {
                video.pause();
            } else if (!userPaused && visible) {
                play();
            }
        });

        video.preload = "auto";
        play();
        setLabel();
    }());

    /* ----- TRIP FINDER ----- */
    var form = document.getElementById("trip-finder");
    if (!form) {
        return;
    }

    var wide = window.matchMedia ? window.matchMedia("(min-width: 48rem)") : { matches: true };
    var panels = [];

    /* One small popover per field: opens below (or above when there's no room), closes on Escape, outside click or tabbing away */
    function popover(trigger, panel, onOpen) {
        function place() {
            panel.classList.remove("opens-up");
            var rect = panel.getBoundingClientRect();
            var field = trigger.getBoundingClientRect();
            if (rect.bottom > window.innerHeight && field.top - 16 > rect.height && wide.matches) {
                panel.classList.add("opens-up");
            } else if (rect.bottom > window.innerHeight) {
                panel.scrollIntoView({ block: "nearest", behavior: D.prefersReducedMotion() ? "auto" : "smooth" });
            }
        }
        var api = {
            open: function () {
                panels.forEach(function (other) {
                    if (other !== api) {
                        other.close(false);
                    }
                });
                panel.hidden = false;
                trigger.setAttribute("aria-expanded", "true");
                form.classList.add("is-picking");
                var target = onOpen();
                place();
                if (target) {
                    target.focus({ preventScroll: true });
                }
            },
            close: function (returnFocus) {
                if (panel.hidden) {
                    return;
                }
                panel.hidden = true;
                trigger.setAttribute("aria-expanded", "false");
                form.classList.remove("is-picking");
                if (returnFocus) {
                    trigger.focus();
                }
            },
            isOpen: function () {
                return !panel.hidden;
            }
        };
        trigger.addEventListener("click", function () {
            if (panel.hidden) {
                api.open();
            } else {
                api.close(true);
            }
        });
        panel.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                event.preventDefault();
                api.close(true);
            }
        });
        document.addEventListener("click", function (event) {
            if (!panel.hidden && !panel.contains(event.target) && !trigger.contains(event.target)) {
                api.close(false);
            }
        });
        form.addEventListener("focusout", function () {
            setTimeout(function () {
                if (!panel.hidden && !panel.contains(document.activeElement) && document.activeElement !== trigger && document.hasFocus()) {
                    api.close(false);
                }
            }, 0);
        });
        panels.push(api);
        return api;
    }

    /* ----- WHERE: destinations grouped by region ----- */
    var destInput = document.getElementById("tf-dest");
    var destTrigger = document.getElementById("tf-dest-btn");
    var destValue = document.getElementById("tf-dest-value");
    var wherePanel = document.getElementById("where-panel");
    var whereOpts = Array.prototype.slice.call(wherePanel.querySelectorAll("[data-dest]"));

    var where = popover(destTrigger, wherePanel, function () {
        return wherePanel.querySelector("[data-dest][aria-pressed=true]") || whereOpts[0];
    });

    function setDest(id) {
        whereOpts.forEach(function (opt) {
            var on = opt.getAttribute("data-dest") === id;
            opt.setAttribute("aria-pressed", on ? "true" : "false");
            if (on) {
                destValue.textContent = opt.getAttribute("data-label");
            }
        });
        destInput.value = id;
        destTrigger.classList.toggle("has-value", !!id);
    }

    wherePanel.addEventListener("click", function (event) {
        var opt = event.target.closest("[data-dest]");
        if (opt) {
            setDest(opt.getAttribute("data-dest"));
            where.close(true);
        }
    });

    /* Arrow keys move through the list */
    wherePanel.addEventListener("keydown", function (event) {
        var i = whereOpts.indexOf(document.activeElement);
        if (i === -1) {
            return;
        }
        var next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: whereOpts.length - 1 }[event.key];
        if (next !== undefined) {
            event.preventDefault();
            whereOpts[Math.max(0, Math.min(whereOpts.length - 1, next))].focus();
        }
    });

    /* ----- WHEN: calendar of departure dates ----- */
    var trigger = document.getElementById("tf-when");
    var valueEl = document.getElementById("tf-when-value");
    var panel = document.getElementById("when-panel");
    var dateInput = document.getElementById("tf-date");
    var monthsEl = panel.querySelector("[data-cal-months]");
    var prevBtn = panel.querySelector("[data-cal-prev]");
    var nextBtn = panel.querySelector("[data-cal-next]");

    var deps = D.departures();
    var bookable = {};
    var months = [];
    deps.forEach(function (d) {
        bookable[d.iso] = true;
        var ym = d.iso.slice(0, 7);
        if (months.indexOf(ym) === -1) {
            months.push(ym);
        }
    });

    var state = { date: null, view: 0 };

    function monthDate(ym) {
        return new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1);
    }

    function pad(n) {
        return (n < 10 ? "0" : "") + n;
    }

    function isoDate(iso) {
        var p = iso.split("-").map(Number);
        return new Date(p[0], p[1] - 1, p[2]);
    }

    function shown() {
        return wide.matches ? 2 : 1;
    }

    function renderMonth(ym) {
        var first = monthDate(ym);
        var year = first.getFullYear();
        var month = first.getMonth();
        var daysIn = new Date(year, month + 1, 0).getDate();
        var lead = first.getDay();
        var html = "<table class=\"cal-month\"><caption>" + first.toLocaleDateString("en-US", { month: "long", year: "numeric" }) + "</caption><thead><tr>";
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(function (d) {
            html += "<th scope=\"col\" abbr=\"" + d + "\">" + d.charAt(0) + "</th>";
        });
        html += "</tr></thead><tbody><tr>";
        for (var i = 0; i < lead; i++) {
            html += "<td></td>";
        }
        for (var day = 1; day <= daysIn; day++) {
            var iso = ym + "-" + pad(day);
            if ((lead + day - 1) % 7 === 0 && day !== 1) {
                html += "</tr><tr>";
            }
            if (bookable[iso]) {
                var label = isoDate(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
                html += "<td><button type=\"button\" class=\"cal-day\" data-date=\"" + iso + "\" aria-pressed=\"" + (state.date === iso) + "\" aria-label=\"" + label + ", departure\">" + day + "</button></td>";
            } else {
                html += "<td><span class=\"cal-off\">" + day + "</span></td>";
            }
        }
        var tail = (7 - ((lead + daysIn) % 7)) % 7;
        for (var j = 0; j < tail; j++) {
            html += "<td></td>";
        }
        return html + "</tr></tbody></table>";
    }

    function renderCalendar() {
        var count = shown();
        state.view = Math.max(0, Math.min(state.view, months.length - count));
        monthsEl.innerHTML = months.slice(state.view, state.view + count).map(renderMonth).join("");
        prevBtn.disabled = state.view === 0;
        nextBtn.disabled = state.view + count >= months.length;
    }

    function syncValue() {
        dateInput.disabled = !state.date;
        dateInput.value = state.date || "";
        valueEl.textContent = state.date ? isoDate(state.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Any date";
        trigger.classList.toggle("has-value", !!state.date);
    }

    var when = popover(trigger, panel, function () {
        renderCalendar();
        return panel.querySelector(".cal-day[aria-pressed=true]") || panel.querySelector(".cal-day");
    });

    function step(by, from, other) {
        state.view += by;
        renderCalendar();
        if (from.disabled) {
            other.focus();
        }
    }
    prevBtn.addEventListener("click", function () { step(-1, prevBtn, nextBtn); });
    nextBtn.addEventListener("click", function () { step(1, nextBtn, prevBtn); });

    panel.addEventListener("click", function (event) {
        var day = event.target.closest("[data-date]");
        if (day) {
            state.date = day.getAttribute("data-date");
            syncValue();
            when.close(true);
            return;
        }
        if (event.target.closest("[data-when-clear]")) {
            state.date = null;
            syncValue();
            when.close(true);
            return;
        }
        if (event.target.closest("[data-when-done]")) {
            when.close(true);
        }
    });

    if (wide.addEventListener) {
        wide.addEventListener("change", function () {
            if (when.isOpen()) {
                renderCalendar();
            }
        });
    }

    syncValue();

    /* ----- SUBMIT ----- */
    form.addEventListener("submit", function (event) {
        panels.forEach(function (p) { p.close(false); });
        var dest = destInput.value;
        var qty = form.querySelector("[name=qty]").value;
        var date = dateInput.disabled ? "" : "&date=" + encodeURIComponent(dateInput.value);
        event.preventDefault();
        if (dest && D.tourById(dest)) {
            window.location.href = D.tourById(dest).url + "?qty=" + encodeURIComponent(qty) + date + "#book";
        } else {
            window.location.href = "pages/destinations.html?qty=" + encodeURIComponent(qty) + date;
        }
    });
}());
