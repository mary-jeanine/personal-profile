"use strict";
/* ============================================================
   Nav page transitions — clicking a frame that leads to a different
   document grows it to fill the main content area (not the sidebar —
   that's the same nav on the page being opened, so it has no reason to
   move) before navigating. See the .frame-btn--flying / .main.is-leaving
   / .page-transition-scrim rules in nav.css. Frames whose href is just
   an anchor on the current page (Home on the homepage, Sewing/Gobblet
   jumping to a shelf) are left completely alone — the browser's native
   anchor scroll already does the right thing for those.

   Implemented as a FLIP animation (First, Last, Invert, Play): the
   frame's box is set to its FINAL size/position immediately, then a
   translate+scale transform is applied to make it *look* like it's
   still at its starting size/spot ("invert"), and that transform is
   what actually animates, back to "none" ("play"). Only `transform` is
   ever animated — the compositor handles that alone, no per-frame
   layout — which is what makes this smooth; animating
   top/left/width/height directly forces a layout recalculation on
   every frame instead.

   Both rects (the clicked frame's "First" and the content area's
   "Last") are read live from getBoundingClientRect() at click time, so
   this is correct at any viewport size and for whichever frame was
   actually clicked — nothing here is a fixed/assumed position or size.
   ============================================================ */
(function () {
  var FLY_MS = 300;

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

      // "First": where the clicked frame actually is right now, at
      // whatever size this screen renders it — e.g. the full sidebar
      // frame on a wide screen, or the collapsed top-bar icon on a
      // narrow one. Read live, not assumed.
      var startRect = link.getBoundingClientRect();

      // "Last": the content area it's growing to fill — also read
      // live, so it's correct whether the sidebar is a left column
      // (wide) or a top bar (narrow, under nav.css's 750px breakpoint),
      // and wherever .main actually sits on screen right now.
      var main = document.querySelector('.main');
      var targetRect = (main || document.body).getBoundingClientRect();

      // a scrim behind the flying frame, sized to the content area it's
      // covering — the sidebar sits outside this rect and is left alone
      var scrim = document.createElement('div');
      scrim.className = 'page-transition-scrim';
      scrim.style.top = targetRect.top + 'px';
      scrim.style.left = targetRect.left + 'px';
      scrim.style.width = targetRect.width + 'px';
      scrim.style.height = targetRect.height + 'px';
      document.body.appendChild(scrim);

      // the content under the frame fades since it's about to be
      // replaced — the sidebar isn't touched, it's staying
      if (main) main.classList.add('is-leaving');

      // hold the clicked frame's spot in the sidebar so the remaining
      // frames don't reflow to fill the gap the moment it's lifted out
      var placeholder = document.createElement('div');
      placeholder.style.width = startRect.width + 'px';
      placeholder.style.height = startRect.height + 'px';
      placeholder.style.flex = '0 0 auto';
      link.parentNode.insertBefore(placeholder, link);

      // move to <body> so fixed positioning isn't clipped by the
      // sidebar or any ancestor's overflow, then set its REAL box to
      // its final size/position (matching the content area) right away
      document.body.appendChild(link);
      link.classList.add('frame-btn--flying');
      link.style.position = 'fixed';
      link.style.top = targetRect.top + 'px';
      link.style.left = targetRect.left + 'px';
      link.style.width = targetRect.width + 'px';
      link.style.height = targetRect.height + 'px';

      // "Invert": fake the starting look with a transform, computed
      // from the two live rects above, so the only thing left to
      // animate is that transform going to "none". transform-origin is
      // pinned to top left so this is a plain scale-from-corner, which
      // keeps the math a direct ratio/difference of the two rects —
      // no assumptions about aspect ratio, screen size, or which frame
      // this is.
      var scaleX = startRect.width / targetRect.width;
      var scaleY = startRect.height / targetRect.height;
      var dx = startRect.left - targetRect.left;
      var dy = startRect.top - targetRect.top;
      link.style.transformOrigin = 'top left';
      link.style.transform =
        'translate(' + dx + 'px,' + dy + 'px) scale(' + scaleX + ',' + scaleY + ')';

      // force layout so the browser registers the starting transform
      // before the next frame animates it away
      void link.offsetWidth;

      // "Play" — ease-in: slow to start, accelerating into the finish
      requestAnimationFrame(function () {
        link.style.transition = 'transform ' + FLY_MS + 'ms cubic-bezier(.55,.06,.68,.19)';
        link.style.transform = 'none';
        scrim.style.transition = 'opacity ' + FLY_MS + 'ms ease';
        scrim.style.opacity = '1';
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
