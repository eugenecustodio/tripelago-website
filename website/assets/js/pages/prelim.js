/* Home page carousel: an endless, slowly scrolling strip of destinations.
   Pauses on hover and keyboard focus, has a pause button, and stays still for
   visitors who prefer reduced motion. */
(function () {
    "use strict";

    var carousel = document.querySelector("[data-country-carousel]");
    if (!carousel) {
        return;
    }

    var toggle = document.querySelector("[data-carousel-toggle]");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var originalCards = Array.prototype.slice.call(carousel.children);
    var loopWidth = 0;
    var previousTime = 0;
    var frameId = 0;
    var hovered = false;
    var focused = false;
    var userPaused = false;

    /* Clones make the loop seamless; hide them from assistive tech and the tab order. */
    originalCards.forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.classList.add("is-clone");
        clone.setAttribute("aria-hidden", "true");
        clone.querySelectorAll("img").forEach(function (image) {
            image.alt = "";
        });
        if (clone.matches("a, button")) {
            clone.setAttribute("tabindex", "-1");
        }
        clone.querySelectorAll("a, button").forEach(function (el) {
            el.setAttribute("tabindex", "-1");
        });
        carousel.appendChild(clone);
    });

    function measure() {
        var firstOriginal = carousel.children[0];
        var firstClone = carousel.children[originalCards.length];
        loopWidth = firstOriginal && firstClone ? firstClone.offsetLeft - firstOriginal.offsetLeft : 0;
    }

    function running() {
        return !reducedMotion && !userPaused && !hovered && !focused && !document.hidden;
    }

    function animate(time) {
        if (!previousTime) {
            previousTime = time;
        }
        if (loopWidth && running()) {
            carousel.scrollLeft += Math.min(time - previousTime, 40) * 0.06;
            if (carousel.scrollLeft >= loopWidth) {
                carousel.scrollLeft -= loopWidth;
            }
        }
        previousTime = time;
        frameId = window.requestAnimationFrame(animate);
    }

    function updateToggle() {
        if (!toggle) {
            return;
        }
        toggle.querySelector(".carousel-toggle-label").textContent = userPaused ? "Play" : "Pause";
        toggle.classList.toggle("is-paused", userPaused);
    }

    carousel.addEventListener("mouseenter", function () { hovered = true; });
    carousel.addEventListener("mouseleave", function () { hovered = false; });
    carousel.addEventListener("focusin", function () { focused = true; });
    carousel.addEventListener("focusout", function (event) {
        if (!carousel.contains(event.relatedTarget)) {
            focused = false;
        }
    });

    if (toggle) {
        if (reducedMotion) {
            toggle.hidden = true;
        } else {
            toggle.addEventListener("click", function () {
                userPaused = !userPaused;
                updateToggle();
            });
            updateToggle();
        }
    }

    window.addEventListener("resize", measure, { passive: true });

    window.requestAnimationFrame(function () {
        carousel.scrollLeft = 0;
        measure();
        window.requestAnimationFrame(function () {
            carousel.classList.add("is-ready");
            if (!reducedMotion) {
                frameId = window.requestAnimationFrame(animate);
            }
        });
    });

    window.addEventListener("pagehide", function () {
        window.cancelAnimationFrame(frameId);
    }, { once: true });
}());
