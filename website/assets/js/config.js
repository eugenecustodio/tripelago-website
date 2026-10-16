/* ==========================================================================
   config.js — settings you can change without touching the rest of the site

   Form endpoints (optional, but recommended before going live)
   The site is static, so on its own it cannot deliver messages to you.
   While an endpoint below is empty, the matching form asks the visitor to
   send it from their own email app (or copy it) to the address in
   source/data.py, so nothing is lost, but nothing arrives automatically.

   To receive bookings, contact messages and waitlist sign-ups by email,
   create a free form at a service such as https://formspree.io, paste its
   endpoint URL (it must start with https://) below, and redeploy. Example:
       booking: "https://formspree.io/f/abcdwxyz"
   You can use one form for all three; each submission says which kind it is.
   If you use a service other than Formspree and deploy with the included
   _headers file, add its domain to the connect-src list there.
   ========================================================================== */
window.TRIPELAGO_CONFIG = {
    endpoints: {
        contact: "",
        waitlist: "",
        booking: ""
    }
};
