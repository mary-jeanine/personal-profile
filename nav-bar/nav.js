"use strict";
/* ============================================================
   Nav page transitions — clicking a frame that leads to a different
   document lifts it out of the sidebar and grows it to fill the
   viewport before navigating (see the .frame-btn--flying rules in
   nav.css). Frames whose href is just an anchor on the current page
   (Home on the homepage, Sewing/Gobblet jumping to a shelf) are left
   completely alone — the browser's native anchor scroll already does
   the right thing for those.
   ============================================================ */
(function () {
  var FLY_MS = 520;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function isSameDocument(url) {
    return url.pathname === location.pathname && url.origin === location.origin;
  }

  document.querySelectorAll('.frame-btn[href]').forEach(function (link) {
    link.addEventListener('click', function (ev) {
      // let modified clicks (open in new tab, etc.) behave normally
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) {
        return;
      }

      var url;
      try {
        url = new URL(link.href, location.href);
      } catch (e) {
        return;
      }

      // same-page anchors (Home on the homepage, Sewing/Gobblet's jump
      // to a shelf) navigate natively — no transition, no interception
      if (isSameDocument(url)) return;

      ev.preventDefault();

      if (prefersReducedMotion()) {
        location.href = link.href;
        return;
      }

      var rect = link.getBoundingClientRect();
      var placeholder = document.createElement('div');
      placeholder.style.width = rect.width + 'px';
      placeholder.style.height = rect.height + 'px';
      placeholder.style.flex = '0 0 auto';
      link.parentNode.insertBefore(placeholder, link);

      // move to <body> so fixed positioning isn't clipped by the
      // sidebar or any ancestor's overflow
      document.body.appendChild(link);
      link.style.position = 'fixed';
      link.style.top = rect.top + 'px';
      link.style.left = rect.left + 'px';
      link.style.width = rect.width + 'px';
      link.style.height = rect.height + 'px';
      link.classList.add('frame-btn--flying');
      document.body.classList.add('is-page-transitioning');

      // force layout so the browser registers the starting position
      // before the next frame animates it to fullscreen
      void link.offsetWidth;

      requestAnimationFrame(function () {
        link.style.top = '0';
        link.style.left = '0';
        link.style.width = '100vw';
        link.style.height = '100vh';
      });

      var navigated = false;
      function go() {
        if (navigated) return;
        navigated = true;
        location.href = link.href;
      }
      link.addEventListener('transitionend', go, { once: true });
      setTimeout(go, FLY_MS + 150); // fallback in case transitionend never fires
    });
  });
})();
