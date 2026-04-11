
    (function () {
      "use strict";

      function $(id) { return document.getElementById(id); }
      function isMobile() { return window.matchMedia && window.matchMedia("(max-width: 768px)").matches; }
      function isTouchDevice() {
        return ("ontouchstart" in window) || (navigator && navigator.maxTouchPoints > 0);
      }
      function isSubpage() { return window.location.pathname.indexOf("/pages/") !== -1; }
      var assetBase = isSubpage() ? "../" : "";
      function assetPath(path) { return assetBase + path; }
      function keyKind(kind) { return (safeText(kind).trim().toLowerCase() === "folder") ? "folder" : "file"; }
      function currentPageHref() {
        var path = window.location.pathname || "";
        if (isSubpage()) {
          var parts = path.split("/");
          return "pages/" + (parts[parts.length - 1] || "");
        }
        return "index.html";
      }
      function getRootPath() {
        var path = window.location.pathname || "";
        if (isSubpage()) {
          var idx = path.indexOf("/pages/");
          if (idx !== -1) return path.slice(0, idx + 1);
        }
        return path.replace(/\/[^\/]*$/, "/");
      }
      function normalizeHrefForKey(it) {
        var href = safeText(it && it.href).trim();
        if (!href || href === "#") href = currentPageHref();
        if (href.indexOf("file://") === 0) {
          try {
            var fileHref = href.replace(/^file:\/\//, "");
            try { fileHref = decodeURIComponent(fileHref); } catch (e2) {}
            var rootPath = getRootPath();
            if (rootPath && fileHref.indexOf(rootPath) === 0) {
              href = fileHref.slice(rootPath.length);
            } else {
              href = fileHref;
            }
          } catch (e) {}
        }
        if (href === "/") href = "index.html";
        while (href.indexOf("../") === 0) href = href.slice(3);
        while (href.indexOf("./") === 0) href = href.slice(2);
        if (href.indexOf("http://") === 0 || href.indexOf("https://") === 0) {
          try {
            var origin = window.location.origin || "";
            if (origin && href.indexOf(origin) === 0) href = href.slice(origin.length);
          } catch (e) {}
        }
        href = href.split("#")[0].split("?")[0];
        if (href.length > 1 && href[href.length - 1] === "/") href = href.slice(0, -1);
        if (href.indexOf("/") === 0) href = href.slice(1);
        if (!href) href = currentPageHref();
        return href;
      }
      function normalizeIconPath(src) {
        var s = safeText(src);
        if (!s) return "";
        if (/^(https?:|data:|blob:|\/)/.test(s)) return s;
        if (isSubpage()) {
          if (s.indexOf("../") === 0) return s;
          return "../" + s;
        }
        if (s.indexOf("../") === 0) return s.slice(3);
        return s;
      }
      var _supportsWebp = null;
      function supportsWebp() {
        if (_supportsWebp !== null) return _supportsWebp;
        try {
          var c = document.createElement("canvas");
          if (!c.getContext) return (_supportsWebp = false);
          _supportsWebp = c.toDataURL("image/webp").indexOf("data:image/webp") === 0;
        } catch (e) {
          _supportsWebp = false;
        }
        return _supportsWebp;
      }
      function resolveArtworkSrc(src) {
        var s = safeText(src);
        if (!s) return "";
        if (supportsWebp()) {
          if (/\.(png|jpe?g)(\?.*)?$/i.test(s)) {
            return s.replace(/\.(png|jpe?g)(\?.*)?$/i, ".webp$2");
          }
        }
        return s;
      }
      function isLocalImageSrc(src) {
        if (!src) return false;
        return !/^(https?:|data:|blob:)/i.test(src);
      }
      function toWebpSrc(src) {
        if (!src || !supportsWebp()) return src;
        if (!/\.(png|jpe?g)(\?.*)?$/i.test(src)) return src;
        return src.replace(/\.(png|jpe?g)(\?.*)?$/i, ".webp$2");
      }
      function swapImgToWebp(img) {
        if (!img || !img.getAttribute) return;
        if (img.dataset && img.dataset.webpDone === "1") return;
        var src = img.getAttribute("src") || "";
        if (!src || !isLocalImageSrc(src)) return;
        if (!supportsWebp()) return;
        if (!/\.(png|jpe?g)(\?.*)?$/i.test(src)) return;
        var webp = toWebpSrc(src);
        if (!webp || webp === src) return;
        if (img.dataset) {
          img.dataset.webpDone = "1";
          if (!img.dataset.webpFallback) img.dataset.webpFallback = src;
        }
        img.addEventListener("error", function onErr() {
          if ((img.getAttribute("src") || "") === webp) {
            img.removeEventListener("error", onErr);
            img.setAttribute("src", src);
          }
        });
        img.setAttribute("src", webp);
      }
      function initWebpImages() {
        if (!supportsWebp()) return;
        try {
          document.querySelectorAll("img[src]").forEach(function (img) {
            swapImgToWebp(img);
          });
        } catch (e) {}
        if (!window.MutationObserver) return;
        try {
          var obs = new MutationObserver(function (muts) {
            muts.forEach(function (m) {
              Array.prototype.slice.call(m.addedNodes || []).forEach(function (node) {
                if (!node) return;
                if (node.tagName && node.tagName.toUpperCase() === "IMG") {
                  swapImgToWebp(node);
                } else if (node.querySelectorAll) {
                  node.querySelectorAll("img[src]").forEach(function (img) { swapImgToWebp(img); });
                }
              });
            });
          });
          obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
        } catch (e) {}
      }
      var preloadedImages = Object.create(null);
      function prefetchImage(src) {
        var s = safeText(src);
        if (!s) return;
        if (preloadedImages[s]) return;
        preloadedImages[s] = true;
        try {
          var img = new Image();
          img.decoding = "async";
          img.src = s;
        } catch (e) {}
      }

      var clickSoundPool = [];
      var clickSoundIndex = 0;
      var CLICK_SOUND_KEY = "prtf_click_sound_enabled";
      var clickSoundEnabled = true;
      var clickSoundSrc = null;
      var clickSoundCtx = null;
      var clickSoundBuffer = null;
      var clickSoundLoading = false;
      var clickSoundPrimed = false;
      var clickSoundAllowed = !isTouchDevice();
      if (!clickSoundAllowed) clickSoundEnabled = false;
      try {
        var clickRaw = localStorage.getItem(CLICK_SOUND_KEY);
        if (clickRaw === "0") clickSoundEnabled = false;
      } catch (e) {}
      function setClickSoundEnabled(enabled) {
        clickSoundEnabled = !!enabled;
        if (!clickSoundAllowed) clickSoundEnabled = false;
        try { localStorage.setItem(CLICK_SOUND_KEY, clickSoundEnabled ? "1" : "0"); } catch (e) {}
      }
      function toggleClickSoundEnabled() {
        setClickSoundEnabled(!clickSoundEnabled);
      }
      function ensureClickSoundContext() {
        if (clickSoundCtx) return clickSoundCtx;
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        try {
          clickSoundCtx = new Ctx();
        } catch (e) {
          clickSoundCtx = null;
        }
        return clickSoundCtx;
      }
      function loadClickSoundBuffer() {
        if (clickSoundLoading || clickSoundBuffer) return;
        var ctx = ensureClickSoundContext();
        if (!ctx) return;
        clickSoundLoading = true;
        var src = clickSoundSrc || assetPath("assets/audio/mouse click.mp3");
        clickSoundSrc = src;
        try {
          fetch(src)
            .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
            .then(function (buf) {
              if (!buf) return;
              return ctx.decodeAudioData(buf);
            })
            .then(function (decoded) {
              if (decoded) clickSoundBuffer = decoded;
            })
            .catch(function () {})
            .finally(function () { clickSoundLoading = false; });
        } catch (e) {
          clickSoundLoading = false;
        }
      }
      function primeClickSound() {
        if (clickSoundPrimed) return;
        clickSoundPrimed = true;
        var ctx = ensureClickSoundContext();
        if (ctx && ctx.state === "suspended") {
          ctx.resume().catch(function () {});
        }
        loadClickSoundBuffer();
      }
      function getClickSound() {
        if (!clickSoundPool.length) {
          var src = assetPath("assets/audio/mouse click.mp3");
          clickSoundSrc = src;
          for (var i = 0; i < 4; i++) {
            var a = new Audio();
            a.preload = "auto";
            a.src = src;
            a.volume = 0.6;
            clickSoundPool.push(a);
          }
        }
        var audio = clickSoundPool[clickSoundIndex];
        clickSoundIndex = (clickSoundIndex + 1) % clickSoundPool.length;
        return audio;
      }
      function playClickSoundFast() {
        var ctx = ensureClickSoundContext();
        if (!ctx || !clickSoundBuffer) return false;
        try {
          if (ctx.state === "suspended") {
            ctx.resume().catch(function () {});
          }
          var source = ctx.createBufferSource();
          source.buffer = clickSoundBuffer;
          var gain = ctx.createGain();
          gain.gain.value = 0.6;
          source.connect(gain);
          gain.connect(ctx.destination);
          source.start(0);
          return true;
        } catch (e) {
          return false;
        }
      }
      function playButtonClickSound() {
        if (!clickSoundEnabled || !clickSoundAllowed) return;
        if (playClickSoundFast()) return;
        var audio = getClickSound();
        try {
          audio.currentTime = 0;
          var p = audio.play();
          if (p && typeof p.catch === "function") p.catch(function () {});
        } catch (e) {}
      }
      var welcomeEnterAudio = null;
      function playWelcomeEnterSound() {
        if (!welcomeEnterAudio) {
          welcomeEnterAudio = new Audio();
          welcomeEnterAudio.preload = "auto";
          welcomeEnterAudio.src = assetPath("assets/audio/Mac start up sound.mp3");
          welcomeEnterAudio.volume = 0.8;
        }
        try {
          welcomeEnterAudio.currentTime = 0;
          var p = welcomeEnterAudio.play();
          if (p && typeof p.catch === "function") p.catch(function () {});
        } catch (e) {}
      }

      var aboutBtn = $("aboutBtn");
      var desktopEl = $("desktop");
      var findBtn = $("findBtn");
      var searchBarEl = $("searchBar");
      var searchInput = $("searchInput");
      var searchResultsEl = $("searchResults");
      var clockEl = $("menubarClock");

      initWebpImages();

      document.addEventListener("pointerdown", primeClickSound, { once: true, capture: true });
      document.addEventListener("touchstart", primeClickSound, { once: true, capture: true, passive: true });
      document.addEventListener("keydown", primeClickSound, { once: true, capture: true });

      document.addEventListener("click", function (e) {
        if (!e || !e.target || !e.target.closest) return;
        var btn = e.target.closest("button, input[type='button'], input[type='submit'], input[type='reset'], [role='button']");
        if (!btn) return;
        if (btn.disabled || btn.getAttribute("aria-disabled") === "true") return;
        if (btn.getAttribute("data-click-sound") === "off") return;
        playButtonClickSound();
      }, true);

      var popupOverlay = $("popupOverlay");
      var popupRegistry = Object.create(null);
      var popupKeyRegistry = Object.create(null);
      var popupOrder = [];
      var activePopupId = null;
      var popupZ = 3005;
      var popupSeq = 0;

      function renderPopupContent(content) {
        var wrap = document.createElement("div");
        wrap.className = "popup-content";

        (content || []).forEach(function (block, idx) {
          if (!block || !block.type) return;

          if (block.type === "text") {
            var d = document.createElement("div");
            var size = block.size || "md";
            var align = block.align || "left";
            var role = block.role || (idx === 0 ? "title" : "body");

            d.className = "popup-text size-" + size + " align-" + align + " role-" + role;
            if (block.html != null) d.innerHTML = String(block.html);
            else d.textContent = block.text || "";
            wrap.appendChild(d);
          }

          if (block.type === "embed") {
            var e = document.createElement("div");
            e.className = "popup-embed";
            e.innerHTML = String(block.html || "");
            wrap.appendChild(e);
          }

          if (block.type === "quote") {
            var q = document.createElement("div");
            q.className = "popup-quote";
            if (block.html != null) q.innerHTML = String(block.html);
            else q.textContent = block.text || "";
            wrap.appendChild(q);
          }

          if (block.type === "image") {
            var m = document.createElement("div");
            var size2 = block.size || "md";
            m.className = "popup-media size-" + size2;
            if (block.noFrame) m.classList.add("no-frame");

            var img = document.createElement("img");
            img.src = block.src || "";
            img.alt = block.alt || "";

            if (block.width) img.width = Number(block.width) || img.width;
            if (block.height) img.height = Number(block.height) || img.height;
            if (block.pixelated === false) img.style.imageRendering = "auto";

            m.appendChild(img);
            wrap.appendChild(m);
          }

          

          if (block.type === "loader") {
            var lw = document.createElement("div");
            lw.className = "loader-wrap";

            var label = document.createElement("div");
            label.className = "loader-label";
            label.textContent = block.label || "Loading…";

            var bar = document.createElement("div");
            bar.className = "loader-bar";

            var fill = document.createElement("div");
            fill.className = "loader-fill";
            fill.id = block.id || "loaderFill";

            bar.appendChild(fill);

            var hint = document.createElement("div");
            hint.className = "loader-hint";
            hint.textContent = block.hint || "Please wait.";

            lw.appendChild(label);
            lw.appendChild(bar);
            lw.appendChild(hint);
            wrap.appendChild(lw);
          }
        });

        return wrap;
      }

      var POPUP_CONTENT = {
        welcome: function () {
          return [
            { type: "text", role: "title", text: "", size: "xl", align: "center" },
            { type: "quote", html: "“Welcome to my portfolio! This is a collection of my work, creative projects, and ideas-in-progress. Take a look around to see what I’ve been building. I hope you enjoy your experience…<br><br>The intention of this website is both to serve as a convenient place to document growth over time and act as a way to provide personal context surrounding how I approach art, music, design, etc.”<br><br><div class=\"popup-quote-signature\">&mdash; Jordan A. McKenzie</div>" },
            { type: "embed", html: "<div class=\"popup-embed-frame\"><div class=\"popup-embed-bar\"><span class=\"embed-title-italic\">The Prelude</span>&nbsp;— J-Mac (2026)</div><div class=\"popup-embed-body\"><iframe src=\"https://www.youtube.com/embed/qPGe5F9VPfo\" title=\"The Prelude — J-Mac\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe></div></div>" },
 
          ];
        },
        about: function () {
          return [
            {
              type: "image",
              src: assetPath("assets/icons/apple logo.png"),
              alt: "Apple logo",
              size: "xs",
              pixelated: false,
              noFrame: true
            },
            {
              type: "quote",
              text:
                "Jordan A. McKenzie was born and raised in Redding, California, on August 9, 1999. " +
                "He graduated from Enterprise High School in 2017 and went to community college for civil engineering " +
                "before switching to recording arts and then business. After getting married in 2023, he and his wife " +
                "returned to school and transferred to Chico State together. He is currently living, working, and attending " +
                "university In Chico where he is expected to earn his bachelor’s degree in civil–structural engineering after the spring semester of 2027."
            }
          ];
        },
        quoteFile: function () {
          return [
            { type: "quote", html: "“Everything I do is for the 17-year-old version of myself.”<br><br><div class=\"popup-quote-signature\">&mdash; Virgil Abloh</div>" }
          ];
        }
      };

      function setOverlayVisible() {
        if (!popupOverlay) return;
        var hasPopups = popupOrder.length > 0;
        popupOverlay.classList.toggle("show", hasPopups);
        popupOverlay.setAttribute("aria-hidden", hasPopups ? "false" : "true");
        var needBackdrop = false;
        var shouldDim = false;
        popupOrder.forEach(function (id) {
          var p = popupRegistry[id];
          if (!p) return;
          if (p.closeOnBackdrop) needBackdrop = true;
          if (p.dimOverlay) shouldDim = true;
        });
        popupOverlay.classList.toggle("dim", shouldDim);
        popupOverlay.style.pointerEvents = (hasPopups && needBackdrop) ? "auto" : "none";
      }

      function getActivePopup() {
        return activePopupId ? popupRegistry[activePopupId] : null;
      }

      function resetPopupPosition(popup) {
        if (!popup || !popup.el) return;
        popup.el.style.left = "50%";
        popup.el.style.top = "50%";
        popup.el.style.transform = "translate(-50%, -50%)";
      }

      function focusPopup(popup) {
        if (!popup || !popup.el) return;
        activePopupId = popup.id;
        popup.el.style.zIndex = String(++popupZ);
      }


      function addPopupTimer(popup, kind, id) {
        if (!popup) return;
        if (!popup.timers) popup.timers = [];
        popup.timers.push({ kind: kind, id: id });
      }

      function addPopupCleanup(popup, fn) {
        if (!popup || !fn) return;
        if (!popup.cleanups) popup.cleanups = [];
        popup.cleanups.push(fn);
      }

      function clearPopupTimers(popup) {
        if (!popup || !popup.timers) return;
        popup.timers.forEach(function (t) {
          if (t.kind === "interval") clearInterval(t.id);
          else clearTimeout(t.id);
        });
        popup.timers = [];
      }

      function bindPopupDrag(popup) {
        if (!popup || !popup.titlebarEl || !popup.el) return;
        var titlebar = popup.titlebarEl;
        var win = popup.el;
        var dragging = false;
        var offX = 0;
        var offY = 0;

        function onMouseDown(e) {
          if (e.target && e.target.closest && e.target.closest(".popup-close")) return;
          e.preventDefault();
          focusPopup(popup);

          var r = win.getBoundingClientRect();
          win.style.left = r.left + "px";
          win.style.top = r.top + "px";
          win.style.transform = "none";

          dragging = true;
          offX = e.clientX - r.left;
          offY = e.clientY - r.top;
        }

        function onMouseMove(e) {
          if (!dragging) return;
          var r = win.getBoundingClientRect();
          var x = e.clientX - offX;
          var y = e.clientY - offY;
          var margin = 10;
          var maxX = window.innerWidth - r.width - margin;
          var maxY = window.innerHeight - r.height - margin;
          x = Math.max(margin, Math.min(maxX, x));
          y = Math.max(margin, Math.min(maxY, y));
          win.style.left = x + "px";
          win.style.top = y + "px";
        }

        function onMouseUp() { dragging = false; }

        function onResize() {
          if (!win) return;
          if (win.style.transform && win.style.transform !== "none") return;

          var r = win.getBoundingClientRect();
          var margin = 10;
          var x = Math.max(margin, Math.min(window.innerWidth - r.width - margin, r.left));
          var y = Math.max(margin, Math.min(window.innerHeight - r.height - margin, r.top));
          win.style.left = x + "px";
          win.style.top = y + "px";
        }

        titlebar.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        window.addEventListener("resize", onResize);

        if (!popup.cleanup) popup.cleanup = [];
        popup.cleanup.push(function () {
          titlebar.removeEventListener("mousedown", onMouseDown);
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("resize", onResize);
        });
      }

      function openPopup(opts) {
        opts = opts || {};
        if (!popupOverlay) return null;
        if (isMobile() && popupOrder.length) closeAllPopups();
        if (opts.key && popupKeyRegistry[opts.key]) {
          var existing = popupKeyRegistry[opts.key];
          focusPopup(existing);
          return existing;
        }

        var popup = {
          id: "popup_" + (++popupSeq),
          key: opts.key || null,
          closeOnBackdrop: !!opts.closeOnBackdrop,
          dimOverlay: !!opts.dimOverlay,
          timers: [],
          cleanup: []
        };

        if (isMobile()) popup.closeOnBackdrop = true;

        var win = document.createElement("div");
        win.className = "popup-window";
        if (opts.className) {
          win.className += " " + String(opts.className);
        }
        win.setAttribute("data-popup-id", popup.id);
        win.setAttribute("role", "dialog");
        win.setAttribute("aria-modal", "false");

        var titlebar = document.createElement("div");
        titlebar.className = "popup-titlebar";

        var closeBtn = document.createElement("button");
        closeBtn.className = "popup-close";
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Close");

        var titleEl = document.createElement("div");
        titleEl.className = "popup-title";
        titleEl.textContent = (opts.title != null) ? String(opts.title) : "";

        titlebar.appendChild(closeBtn);
        titlebar.appendChild(titleEl);

        var body = document.createElement("div");
        body.className = "popup-body";

        var actions = document.createElement("div");
        actions.className = "popup-actions";

        var caption = document.createElement("div");
        caption.className = "popup-caption";
        caption.textContent = (opts.caption != null) ? String(opts.caption) : "";

        var okBtn = document.createElement("button");
        okBtn.className = "popup-ok";
        okBtn.type = "button";
        okBtn.textContent = (opts.okText != null) ? String(opts.okText) : "Done";

        actions.appendChild(caption);
        actions.appendChild(okBtn);

        win.appendChild(titlebar);
        win.appendChild(body);
        win.appendChild(actions);

        popup.el = win;
        popup.titlebarEl = titlebar;
        popup.titleEl = titleEl;
        popup.bodyEl = body;
        popup.captionEl = caption;
        popup.okBtn = okBtn;
        popup.closeBtn = closeBtn;
        popup.actionsEl = actions;

        if (Array.isArray(opts.content)) body.appendChild(renderPopupContent(opts.content));
        else if (opts.text != null) body.textContent = String(opts.text);

        var hasOk = (opts.okText !== null);
        okBtn.style.display = hasOk ? "inline-flex" : "none";
        win.classList.toggle("has-ok", hasOk);

        win.addEventListener("mousedown", function () { focusPopup(popup); });
        closeBtn.addEventListener("click", function (e) { e.stopPropagation(); closePopup(popup); });
        okBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (popup.el && popup.el.classList && popup.el.classList.contains("welcome-popup")) {
            playWelcomeEnterSound();
          }
          closePopup(popup);
        });

        popupOverlay.appendChild(win);
        popupRegistry[popup.id] = popup;
        if (popup.key) popupKeyRegistry[popup.key] = popup;
        popupOrder.push(popup.id);

        if (!opts.preservePosition || (!popup.el.style.left && !popup.el.style.top)) {
          resetPopupPosition(popup);
        }
        bindPopupDrag(popup);
        focusPopup(popup);
        setOverlayVisible();

        if (typeof opts.onOpen === "function") {
          try {
            var cleanup = opts.onOpen(popup);
            if (typeof cleanup === "function") {
              if (!popup.cleanup) popup.cleanup = [];
              popup.cleanup.push(cleanup);
            }
          } catch (e) {}
        }

        return popup;
      }

      function closePopup(popup) {
        var target = popup || getActivePopup();
        if (!target) return;

        clearPopupTimers(target);

        if (target.cleanup && target.cleanup.length) {
          target.cleanup.forEach(function (fn) {
            try { fn(); } catch (e) {}
          });
          target.cleanup = [];
        }

        if (target.el && target.el.parentNode) {
          target.el.parentNode.removeChild(target.el);
        }

        delete popupRegistry[target.id];
        if (target.key && popupKeyRegistry[target.key] === target) {
          delete popupKeyRegistry[target.key];
        }
        popupOrder = popupOrder.filter(function (id) { return id !== target.id; });

        if (activePopupId === target.id) activePopupId = null;
        if (popupOrder.length) {
          var next = popupRegistry[popupOrder[popupOrder.length - 1]];
          if (next) focusPopup(next);
        }

        setOverlayVisible();
      }

      function closeAllPopups() {
        var ids = popupOrder.slice(0);
        ids.forEach(function (id) {
          var popup = popupRegistry[id];
          if (popup) closePopup(popup);
        });
      }

      window.openPopup = openPopup;
      window.closePopup = closePopup;

      // OS9-style loading popup + progress bar
      function runLoader(popup, fillEl, durationMs, done) {
        durationMs = Number(durationMs) || 800;
        var start = Date.now();
        if (fillEl) fillEl.style.width = "0%";

        var t = setInterval(function () {
          var p = (Date.now() - start) / durationMs;
          p = 1 - Math.pow(1 - Math.min(1, p), 2); // ease-out
          var pct = Math.round(p * 100);
          if (fillEl) fillEl.style.width = pct + "%";
          if (p >= 1) {
            clearInterval(t);
            if (typeof done === "function") done();
          }
        }, 50);
        addPopupTimer(popup, "interval", t);
      }

      function startLoaderDots(popup, labelEl) {
        if (!popup || !popup.titleEl || !labelEl) return;
        var i = 0;
        var t = setInterval(function () {
          i = (i + 1) % 4;
          labelEl.textContent = "Loading" + ".".repeat(i);
        }, 350);
        addPopupTimer(popup, "interval", t);
        labelEl.textContent = "Loading";
      }

      function startLoaderHintCycle(popup, hintEl, hints) {
        if (!popup || !hintEl || !hints) return;
        var list = hints;
        var ordered = false;
        if (!Array.isArray(hints) && typeof hints === "object") {
          list = hints.list;
          ordered = hints.order === "in-order";
        }
        if (!Array.isArray(list) || !list.length) return;

        var order = [];
        var idx = 0;

        function buildOrder() {
          order = list.slice();
          if (!ordered) {
            for (var i = order.length - 1; i > 0; i--) {
              var j = Math.floor(Math.random() * (i + 1));
              var tmp = order[i];
              order[i] = order[j];
              order[j] = tmp;
            }
          }
        }

        buildOrder();
        hintEl.textContent = order[idx] || "";

        var t = setInterval(function () {
          idx += 1;
          if (idx >= order.length) {
            buildOrder();
            idx = 0;
          }
          hintEl.textContent = order[idx] || "";
        }, 1000);
        addPopupTimer(popup, "interval", t);
      }

      function startSnakeGame() {
        var existing = popupKeyRegistry["snake-game"];
        if (existing) closePopup(existing);

        var cell = 12;
        var cols = 20;
        var rows = 20;
        var width = cols * cell;
        var height = rows * cell;
        var canvasId = "snakeCanvas_" + Math.random().toString(16).slice(2);
        var statusId = "snakeStatus_" + Math.random().toString(16).slice(2);

        var highScoreKey = "prtf_snake_highscore_v1";
        var highScore = 0;
        try { highScore = Number(sessionStorage.getItem(highScoreKey)) || 0; } catch (e) {}

        var popup = openPopup({
          title: "Snake",
          key: "snake-game",
          okText: null,
          content: [
            {
              type: "embed",
              html:
                "<div class=\"snake-wrap\">" +
                  "<canvas id=\"" + canvasId + "\" class=\"snake-canvas\" width=\"" + width + "\" height=\"" + height + "\"></canvas>" +
                "</div>"
            }
          ]
        });
        if (!popup || !popup.el) return;
        popup.el.classList.add("snake-popup");

        var canvas = popup.el.querySelector("#" + canvasId);
        var statusEl = null;
        var playAgainEl = null;
        var actionsEl = null;
        var yesBtn = null;
        var noBtn = null;
        if (popup.actionsEl) {
          popup.actionsEl.innerHTML = "";
          popup.actionsEl.classList.add("snake-footer");

          statusEl = document.createElement("div");
          statusEl.className = "snake-status";
          statusEl.id = statusId;
          statusEl.textContent = "Score: 0  Best: " + highScore;

          playAgainEl = document.createElement("div");
          playAgainEl.className = "snake-play";
          playAgainEl.textContent = "";

          actionsEl = document.createElement("div");
          actionsEl.className = "snake-actions";

          yesBtn = document.createElement("button");
          yesBtn.type = "button";
          yesBtn.className = "popup-ok snake-btn";
          yesBtn.setAttribute("data-action", "yes");
          yesBtn.textContent = "Yes";

          noBtn = document.createElement("button");
          noBtn.type = "button";
          noBtn.className = "popup-ok snake-btn";
          noBtn.setAttribute("data-action", "no");
          noBtn.textContent = "No";

          actionsEl.appendChild(yesBtn);
          actionsEl.appendChild(noBtn);

          popup.actionsEl.appendChild(statusEl);
          popup.actionsEl.appendChild(playAgainEl);
          popup.actionsEl.appendChild(actionsEl);
        }
        if (!canvas) return;
        var ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;

        var snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
        var dir = { x: 1, y: 0 };
        var nextDir = { x: 1, y: 0 };
        var food = { x: 0, y: 0 };
        var foodPulseStart = Date.now();
        var alive = true;
        var score = 0;
        var loop = null;
        var speedMs = 120;

        function drawCell(x, y) {
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }

        function spawnFood() {
          if (snake.length >= cols * rows) {
            endGame();
            return;
          }
          var ok = false;
          while (!ok) {
            food.x = Math.floor(Math.random() * cols);
            food.y = Math.floor(Math.random() * rows);
            ok = !snake.some(function (s) { return s.x === food.x && s.y === food.y; });
          }
        }

        function draw() {
          ctx.fillStyle = "#dfdfdf";
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = "#000";
          var pulseT = (Date.now() - foodPulseStart) / 250;
          var phase = pulseT % 1;
          var alpha = (phase < 0.5) ? 1 : 0.2;
          ctx.globalAlpha = alpha;
          drawCell(food.x, food.y);
          ctx.globalAlpha = 1;
          snake.forEach(function (seg) { drawCell(seg.x, seg.y); });

          if (!alive) {
            ctx.fillStyle = "#000";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "12px Chicago, sans-serif";
            ctx.fillText("GAME OVER", width / 2, height / 2 - 8);
          }
        }

        function endGame() {
          alive = false;
          if (loop) {
            clearInterval(loop);
            loop = null;
          }
          if (score > highScore) {
            highScore = score;
            try { sessionStorage.setItem(highScoreKey, String(highScore)); } catch (e) {}
          }
          if (statusEl) statusEl.textContent = "Score: " + score + "  Best: " + highScore;
          if (playAgainEl) {
            playAgainEl.textContent = "Play again?";
            playAgainEl.classList.add("show");
          }
          if (actionsEl) actionsEl.classList.add("show");
          draw();
        }

        function step() {
          if (!alive) return;
          dir = nextDir;

          var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
          if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
            endGame();
            return;
          }

          for (var i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
              endGame();
              return;
            }
          }

          snake.unshift(head);
          if (head.x === food.x && head.y === food.y) {
            score += 1;
            if (statusEl) statusEl.textContent = "Score: " + score + "  Best: " + highScore;
            spawnFood();
          } else {
            snake.pop();
          }

          draw();
        }

        function setDir(x, y) {
          if (dir.x === -x && dir.y === -y) return;
          nextDir = { x: x, y: y };
        }

        function handleKey(e) {
          if (!alive) return;
          if (searchBarEl && searchBarEl.style.display === "flex") return;
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setDir(0, -1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setDir(0, 1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            setDir(-1, 0);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setDir(1, 0);
          }
        }

        function startGame() {
          snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
          dir = { x: 1, y: 0 };
          nextDir = { x: 1, y: 0 };
          alive = true;
          score = 0;
          foodPulseStart = Date.now();
          if (statusEl) statusEl.textContent = "Score: 0  Best: " + highScore;
          if (playAgainEl) {
            playAgainEl.textContent = "";
            playAgainEl.classList.remove("show");
          }
          if (actionsEl) actionsEl.classList.remove("show");
          spawnFood();
          draw();
          if (loop) clearInterval(loop);
          loop = setInterval(step, speedMs);
          addPopupTimer(popup, "interval", loop);
        }

        if (yesBtn) {
          yesBtn.addEventListener("click", function () {
            if (!alive) startGame();
          });
        }
        if (noBtn) {
          noBtn.addEventListener("click", function () {
            closePopup(popup);
          });
        }

        startGame();
        document.addEventListener("keydown", handleKey);

        if (!popup.cleanup) popup.cleanup = [];
        popup.cleanup.push(function () {
          document.removeEventListener("keydown", handleKey);
        });
      }

      function showLoadingScreen(opts) {
        // Timed (faux) loader
        opts = opts || {};
        var fillId = "loaderFill_" + Math.random().toString(16).slice(2);

        var popup = openPopup({
          title: "",
          okText: null,
          preservePosition: true,
          content: [
            { type: "loader", id: fillId, label: opts.label || "Loading…", hint: opts.hint || "" }
          ]
        });
        if (!popup) return;

        var labelEl = popup.el ? popup.el.querySelector(".loader-label") : null;
        startLoaderDots(popup, labelEl);
        var hintEl = popup.el ? popup.el.querySelector(".loader-hint") : null;
        startLoaderHintCycle(popup, hintEl, opts.hints);
        var fill = popup.el ? popup.el.querySelector("#" + fillId) : null;

        runLoader(popup, fill, opts.durationMs || 750, function () {
          try { closePopup(popup); } catch (e) {}
          if (typeof opts.onDone === "function") opts.onDone();
        });
      }

      // Real-duration loader: stays up until this page finishes loading.
      function showLoadingUntilPageLoad(opts) {
        opts = opts || {};
        var fillId = "loaderFill_" + Math.random().toString(16).slice(2);
        var blocks = [];
        if (opts.icon !== null) {
          blocks.push({ type: "image", src: opts.icon || assetPath("assets/images/earth.webp"), alt: "", size: "sm" });
        }
        blocks.push({ type: "loader", id: fillId, label: opts.label || "Loading…", hint: opts.hint || "" });

        var popup = openPopup({
          title: "",
          okText: null,
          preservePosition: true,
          content: blocks
        });
        if (!popup) return;

        var labelEl = popup.el ? popup.el.querySelector(".loader-label") : null;
        startLoaderDots(popup, labelEl);
        var hintEl = popup.el ? popup.el.querySelector(".loader-hint") : null;
        startLoaderHintCycle(popup, hintEl, opts.hints);

        // Indeterminate barber-pole until load completes
        var indeterminateTimer = setTimeout(function () {
          var fill = popup.el ? popup.el.querySelector("#" + fillId) : null;
          if (fill) {
            fill.classList.add("indeterminate");
            fill.style.width = "100%";
          }
        }, 0);
        addPopupTimer(popup, "timeout", indeterminateTimer);

        var closed = false;
        function done() {
          if (closed) return;
          closed = true;
          window.removeEventListener("load", onL);
          try { closePopup(popup); } catch (e) {}
          if (typeof opts.onDone === "function") opts.onDone();
        }

        function onL() { done(); }
        window.addEventListener("load", onL);

        var maxWaitMs = Number(opts.maxWaitMs);
        if (!(maxWaitMs > 0)) maxWaitMs = 4500;
        var maxWaitTimer = setTimeout(done, maxWaitMs);
        addPopupTimer(popup, "timeout", maxWaitTimer);
      }

      // Cross-page loader (Option A): previous page sets a flag; next page shows until load.
      function maybeStartPendingLoader() {
        var key = "prtf_pending_loader_v1";
        var raw = null;
        try { raw = sessionStorage.getItem(key); } catch (e) {}
        if (!raw) return false;

        try { sessionStorage.removeItem(key); } catch (e) {}

        var opts = null;
        try { opts = JSON.parse(raw); } catch (e) { opts = null; }
        if (!opts || typeof opts !== "object") opts = {};

        showLoadingUntilPageLoad(opts);
        return true;
      }

      window.showLoadingScreen = showLoadingScreen;
      window.showLoadingUntilPageLoad = showLoadingUntilPageLoad;
      window.maybeStartPendingLoader = maybeStartPendingLoader;

      var mediaOverlay = null;
      var mediaOverlayImg = null;

      function ensureMediaOverlay() {
        if (mediaOverlay) return;
        mediaOverlay = document.createElement("div");
        mediaOverlay.className = "media-overlay";
        mediaOverlay.setAttribute("aria-hidden", "true");

        mediaOverlayImg = document.createElement("img");
        mediaOverlayImg.className = "media-overlay-img";
        mediaOverlayImg.alt = "";

        mediaOverlay.appendChild(mediaOverlayImg);
        document.body.appendChild(mediaOverlay);

        mediaOverlay.addEventListener("click", function () {
          closeMediaOverlay();
        });
      }

      function openMediaOverlay(src, alt) {
        var s = safeText(src);
        if (!s) return;
        ensureMediaOverlay();
        if (mediaOverlayImg) {
          mediaOverlayImg.src = s;
          mediaOverlayImg.alt = alt || "";
        }
        mediaOverlay.classList.add("show");
        mediaOverlay.setAttribute("aria-hidden", "false");
      }

      function closeMediaOverlay() {
        if (!mediaOverlay) return;
        mediaOverlay.classList.remove("show");
        mediaOverlay.setAttribute("aria-hidden", "true");
        if (mediaOverlayImg) mediaOverlayImg.removeAttribute("src");
      }

      if (popupOverlay) {
        popupOverlay.addEventListener("mousedown", function (e) {
          if (e.target !== popupOverlay) return;
          var activePopup = getActivePopup();
          if (activePopup && activePopup.closeOnBackdrop) closePopup(activePopup);
        });
      }

      document.addEventListener("click", function (e) {
        var target = e.target;
        if (!target || !target.closest) return;
        var img = target.closest(".popup-media img, .popup-artwork img");
        if (!img) return;
        if (mediaOverlay && mediaOverlay.contains(img)) return;
        openMediaOverlay(img.currentSrc || img.src, img.alt || "");
      });

      function openAboutPopup() {
        openPopup({
          key: "about",
          title: "About Me",
          okText: "Done",
          className: "about-popup",
          content: POPUP_CONTENT.about()
        });
      }

      if (aboutBtn) aboutBtn.addEventListener("click", function (e) { e.preventDefault(); openAboutPopup(); });

      function showSearch() {
        if (!searchBarEl) return;
        // Rebuild local index each time (so it matches the current page)
        try { SEARCH_INDEX = buildLocalIndex(); } catch (e) {}

        // Clear previous query so user can immediately type
        if (searchInput) {
          searchInput.value = "";
          try { searchInput.setSelectionRange(0, 0); } catch (e) {}
        }
        if (searchResultsEl) {
          searchResultsEl.innerHTML = "";
          searchResultsEl.style.display = "none";
        }

        searchBarEl.style.display = "flex";
        positionSearchBar();
        if (searchInput) searchInput.focus();

        // Always show top suggestions (recents) when opening Find
        showRecentsIfEmpty();
      }
      function hideSearch() {
        if (!searchBarEl) return;
        searchBarEl.style.display = "none";
        if (searchResultsEl) searchResultsEl.style.display = "none";
        if (searchResultsEl) searchResultsEl.innerHTML = "";
      }
      function toggleSearch() {
        if (!searchBarEl) return;
        if (searchBarEl.style.display === "flex") hideSearch();
        else showSearch();
      }

      if (findBtn) findBtn.addEventListener("click", function (e) { e.preventDefault(); toggleSearch(); });
      if (searchInput) searchInput.addEventListener("blur", function () { hideSearch(); });

      document.addEventListener("click", function (e) {
        var link = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!link) return;
        var href = link.getAttribute("href") || "";
        if (!href || href === "#") return;
        if (normalizeHrefForKey({ href: href }) === "index.html") {
          markSkipWelcomeOnce();
        }
      });

      var returnLinks = document.querySelectorAll(".return-to-desktop");
      if (returnLinks && returnLinks.length) {
        Array.prototype.forEach.call(returnLinks, function (el) {
          el.addEventListener("click", function () { markSkipWelcomeOnce(); });
        });
      }



      // =====================
      // Find / Search Index (Spotlight-ish)
      // =====================
      function safeText(s) { return String(s || ""); }
      function escHtml(s) {
        return safeText(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\\"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function formatTime(secs) {
        if (!isFinite(secs) || secs < 0) return "0:00";
        var m = Math.floor(secs / 60);
        var s = Math.floor(secs % 60);
        return m + ":" + (s < 10 ? "0" + s : "" + s);
      }

      function canUseMediaSession() {
        return typeof navigator !== "undefined" && "mediaSession" in navigator;
      }

      function buildArtworkSet(url) {
        if (!url) return [];
        var sizes = [96, 128, 192, 256, 384, 512];
        return sizes.map(function (s) {
          return { src: url, sizes: s + "x" + s };
        });
      }

      function setMediaSessionMetadata(meta) {
        if (!canUseMediaSession() || !meta) return;
        try {
          var md = {};
          if (meta.title) md.title = meta.title;
          if (meta.artist) md.artist = meta.artist;
          if (meta.album) md.album = meta.album;
          var artwork = buildArtworkSet(meta.artwork);
          if (artwork.length) md.artwork = artwork;
          navigator.mediaSession.metadata = new MediaMetadata(md);
        } catch (e) {}
      }

      function setMediaSessionPlaybackState(state) {
        if (!canUseMediaSession()) return;
        try { navigator.mediaSession.playbackState = state; } catch (e) {}
      }

      function updateMediaSessionPosition(audio) {
        if (!canUseMediaSession()) return;
        if (!audio || typeof navigator.mediaSession.setPositionState !== "function") return;
        if (!isFinite(audio.duration) || audio.duration <= 0) return;
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1,
            position: audio.currentTime || 0
          });
        } catch (e) {}
      }

      function bindMediaSessionActions(audio, opts) {
        if (!canUseMediaSession() || !audio) return;
        opts = opts || {};
        var ms = navigator.mediaSession;
        function safeSet(action, handler) {
          try { ms.setActionHandler(action, handler); } catch (e) {}
        }
        safeSet("play", function () { audio.play().catch(function () {}); });
        safeSet("pause", function () { audio.pause(); });
        safeSet("stop", function () { audio.pause(); audio.currentTime = 0; });
        safeSet("seekto", function (details) {
          if (details && isFinite(details.seekTime)) audio.currentTime = details.seekTime;
        });
        safeSet("seekbackward", function (details) {
          var offset = (details && details.seekOffset) || 10;
          audio.currentTime = Math.max(0, (audio.currentTime || 0) - offset);
        });
        safeSet("seekforward", function (details) {
          var offset = (details && details.seekOffset) || 10;
          var dur = audio.duration || 0;
          if (dur > 0) audio.currentTime = Math.min(dur, (audio.currentTime || 0) + offset);
        });
        if (typeof opts.onPrev === "function") safeSet("previoustrack", function () { opts.onPrev(); });
        else safeSet("previoustrack", null);
        if (typeof opts.onNext === "function") safeSet("nexttrack", function () { opts.onNext(); });
        else safeSet("nexttrack", null);
      }

      function initNostalgiaPlayer(root, audio, opts) {
        if (!root || !audio) return function () {};
        opts = opts || {};

        var controlsRoot = opts.controlsRoot || root;
        var playBtn = root.querySelector(".np-play") || (controlsRoot && controlsRoot.querySelector(".np-play"));
        var prevBtn = root.querySelector(".np-prev") || (controlsRoot && controlsRoot.querySelector(".np-prev"));
        var nextBtn = root.querySelector(".np-next") || (controlsRoot && controlsRoot.querySelector(".np-next"));
        var timeEl = root.querySelector(".np-time");
        var seekEl = root.querySelector(".np-seek");
        var toggleBtn = root.querySelector(".np-toggle-btn") || (controlsRoot && controlsRoot.querySelector(".np-toggle-btn"));
        var titleEl = opts.titleEl || null;

        function setPlayState(isPlaying) {
          if (playBtn) playBtn.classList.toggle("is-playing", !!isPlaying);
        }

        function updateTime() {
          var cur = audio.currentTime || 0;
          var dur = audio.duration || 0;
          if (timeEl) timeEl.textContent = formatTime(cur) + " / " + formatTime(dur);
          if (seekEl && dur > 0) {
            seekEl.value = String((cur / dur) * 100);
          } else if (seekEl) {
            seekEl.value = "0";
          }
        }

        function setTitle(text) {
          if (!titleEl) return;
          titleEl.textContent = safeText(text || "");
        }

        function onPlayClick() {
          if (audio.paused) {
            audio.play().catch(function () {});
          } else {
            audio.pause();
          }
        }

        function onSeekInput() {
          var dur = audio.duration || 0;
          var pct = parseFloat(seekEl.value || "0") / 100;
          if (dur > 0) audio.currentTime = dur * pct;
        }

        function onPrevClick() {
          if (typeof opts.onPrev === "function") opts.onPrev();
        }

        function onNextClick() {
          if (typeof opts.onNext === "function") opts.onNext();
        }

        function getToggleState() {
          if (!toggleBtn) return "off";
          var state = toggleBtn.getAttribute("data-state");
          if (state === "autoplay" || state === "replay" || state === "off") return state;
          if (toggleBtn.classList.contains("is-replay")) return "replay";
          if (toggleBtn.classList.contains("is-on") || toggleBtn.getAttribute("aria-pressed") === "true") return "autoplay";
          return "off";
        }

        function applyToggleState(state) {
          if (!toggleBtn) return;
          var next = (state === "autoplay" || state === "replay") ? state : "off";
          toggleBtn.classList.toggle("is-on", next === "autoplay");
          toggleBtn.classList.toggle("is-replay", next === "replay");
          toggleBtn.setAttribute("data-state", next);
          toggleBtn.setAttribute("aria-pressed", next === "off" ? "false" : "true");
          toggleBtn.setAttribute("aria-label", next === "autoplay" ? "Autoplay on" : (next === "replay" ? "Replay on" : "Autoplay off"));
        }

        function onToggleClick() {
          if (!toggleBtn) return;
          var cur = getToggleState();
          var next = (cur === "off") ? "autoplay" : (cur === "autoplay" ? "replay" : "off");
          applyToggleState(next);
          if (typeof opts.onToggle === "function") opts.onToggle(next);
        }

        if (playBtn) playBtn.addEventListener("click", onPlayClick);
        if (seekEl) seekEl.addEventListener("input", onSeekInput);
        if (prevBtn) prevBtn.addEventListener("click", onPrevClick);
        if (nextBtn) nextBtn.addEventListener("click", onNextClick);
        if (toggleBtn) toggleBtn.addEventListener("click", onToggleClick);
        if (toggleBtn && typeof opts.initialToggleState === "string") {
          applyToggleState(opts.initialToggleState);
        } else if (toggleBtn) {
          applyToggleState(getToggleState());
        }

        function onPlay() { setPlayState(true); setMediaSessionPlaybackState("playing"); }
        function onPause() { setPlayState(false); setMediaSessionPlaybackState("paused"); }
        function onTime() { updateTime(); updateMediaSessionPosition(audio); }
        function onLoaded() { updateTime(); updateMediaSessionPosition(audio); }

        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("timeupdate", onTime);
        audio.addEventListener("loadedmetadata", onLoaded);

        audio.volume = 1;
        if (opts.titleText) setTitle(opts.titleText);
        if (opts.mediaMeta) setMediaSessionMetadata(opts.mediaMeta);
        bindMediaSessionActions(audio, opts);
        if (opts.autoPlay) {
          audio.play().catch(function () {});
        }
        updateTime();

        return function cleanup() {
          if (playBtn) playBtn.removeEventListener("click", onPlayClick);
          if (seekEl) seekEl.removeEventListener("input", onSeekInput);
          if (prevBtn) prevBtn.removeEventListener("click", onPrevClick);
          if (nextBtn) nextBtn.removeEventListener("click", onNextClick);
          if (toggleBtn) toggleBtn.removeEventListener("click", onToggleClick);
          audio.removeEventListener("play", onPlay);
          audio.removeEventListener("pause", onPause);
          audio.removeEventListener("timeupdate", onTime);
          audio.removeEventListener("loadedmetadata", onLoaded);
        };
      }
      var FIND_DEBUG_KEY = "prtf_find_debug_v1";
      var FIND_DEBUG = false;
      try { FIND_DEBUG = localStorage.getItem(FIND_DEBUG_KEY) === "1"; } catch (e) {}

      function debugFind(msg, data) {
        if (!FIND_DEBUG) return;
        try { console.log("[Find]", msg, data || ""); } catch (e) {}
      }

      function normalizeNameKey(name) {
        if (name == null) return "";
        return safeText(name).trim().replace(/\s+/g, " ").toLowerCase();
      }

      function buildFindKey(it) {
        return keyKind(it.kind) + "|" + normalizeHrefForKey(it).toLowerCase() + "|" + normalizeNameKey(it.name);
      }

      function buildFindLooseKey(it) {
        return keyKind(it.kind) + "|" + normalizeNameKey(it.name);
      }

      function debugItem(it) {
        if (!it) return null;
        return { name: it.name, kind: it.kind, href: it.href, hasEl: !!it.el };
      }

      function buildLocalIndex() {
        var items = [];
        document.querySelectorAll(".icon").forEach(function (el) {
          var name = ((el.querySelector("span") && el.querySelector("span").textContent) || "").trim();
          var href = el.getAttribute("href") || "";
          var kind = el.getAttribute("data-kind") || "folder";
          // Hide items that should never appear in Find.
          if (kind === "trash" || kind === "reset") return;
          var imgEl = el.querySelector("img");
          var iconSrc = (imgEl && (imgEl.getAttribute("src") || imgEl.src)) || "";
          if (!name) return;
          items.push({ name: name, kind: kind, href: href, icon: iconSrc, el: el });
        });
        return items;
      }

      var SEARCH_INDEX = buildLocalIndex();
      var GLOBAL_INDEX = [];
      var GLOBAL_INDEX_READY = false;
      var activeIdx = -1;
      var currentMatches = [];
      var findIsRecentsView = false;
      var RECENTS_KEY = "prtf_find_recents_v1";
      var RECENTS_SESSION_KEY = "prtf_find_recents_session_v1";
      var SKIP_WELCOME_KEY = "prtf_skip_welcome_once";

      function resetRecentsOnNewSession() {
        try {
          if (!sessionStorage.getItem(RECENTS_SESSION_KEY)) {
            sessionStorage.setItem(RECENTS_SESSION_KEY, "1");
            localStorage.removeItem(RECENTS_KEY);
          }
        } catch (e) {}
      }
      resetRecentsOnNewSession();

      function markSkipWelcomeOnce() {
        try { sessionStorage.setItem(SKIP_WELCOME_KEY, "1"); } catch (e) {}
      }

      function consumeSkipWelcomeOnce() {
        try {
          if (sessionStorage.getItem(SKIP_WELCOME_KEY) === "1") {
            sessionStorage.removeItem(SKIP_WELCOME_KEY);
            return true;
          }
        } catch (e) {}
        return false;
      }

      function normalizeItem(it) {
        if (!it) return null;
        var out = {
          name: safeText(it.name).trim(),
          kind: safeText(it.kind || "").trim() || "file",
          href: normalizeHrefForKey({ href: safeText(it.href || "").trim(), name: it.name, kind: it.kind }),
          icon: safeText(it.icon || "").trim()
        };
        if (!out.name) return null;
        if (!out.kind) out.kind = "file";
        return out;
      }

      function normalizeRecentItem(it) {
        var out = normalizeItem(it);
        if (!out) return null;
        out.href = normalizeHrefForKey(out);
        return out;
      }

      function loadGlobalIndex() {
        // Optional: create a search-index.json at site root.
        // Format: {"_note":"...","items":[{"name":"J-Mac","kind":"folder","href":"pages/j-mac.html","icon":"assets/icons/folder-160.png"}, ...]}
        try {
          if (!window.fetch) return;
          var indexPath = isSubpage() ? "../search-index.json" : "search-index.json";
          fetch(indexPath, { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
              var items = null;
              if (Array.isArray(data)) items = data;
              else if (data && Array.isArray(data.items)) items = data.items;
              if (!items) return;
              GLOBAL_INDEX = items.map(normalizeItem).filter(Boolean);
              GLOBAL_INDEX_READY = true;
              if (searchBarEl && searchBarEl.style.display === "flex" && searchInput && !(searchInput.value || "").trim()) {
                showRecentsIfEmpty();
              }
            })
            .catch(function () {});
        } catch (e) {}
      }
      loadGlobalIndex();

      function getCombinedIndex() {
        // Local (current desktop/page) first, then global.
        var seenStrict = Object.create(null);
        var localNameKind = Object.create(null);
        var localByNameKind = Object.create(null);
        var globalByNameKind = Object.create(null);
        var out = [];

        function add(it, source) {
          var strictKey = buildFindKey(it);
          var nameKey = buildFindLooseKey(it);

          if (source === "local") {
            localNameKind[nameKey] = 1;
            localByNameKind[nameKey] = it;
          } else if (source === "global") {
            if (globalByNameKind[nameKey] && !localNameKind[nameKey]) {
              if (FIND_DEBUG) {
                debugFind("global name/kind duplicate", {
                  first: debugItem(globalByNameKind[nameKey]),
                  next: debugItem(it)
                });
              }
            } else if (!globalByNameKind[nameKey]) {
              globalByNameKind[nameKey] = it;
            }
          }

          if (seenStrict[strictKey]) {
            if (FIND_DEBUG) {
              debugFind("skip duplicate strict key", { key: strictKey, item: debugItem(it), source: source });
            }
            return;
          }

          if (source === "global" && localNameKind[nameKey]) {
            if (FIND_DEBUG) {
              debugFind("skip global duplicate name/kind", {
                local: debugItem(localByNameKind[nameKey]),
                global: debugItem(it)
              });
            }
            return;
          }

          seenStrict[strictKey] = 1;
          out.push(it);
        }

        SEARCH_INDEX.forEach(function (it) { add(it, "local"); });
        GLOBAL_INDEX.forEach(function (it) { add(it, "global"); });
        return out;
      }

      function fuzzyMatch(name, q) {
        // Returns {score, idxs} or null.
        name = safeText(name);
        q = safeText(q);
        var n = name.toLowerCase();
        var qq = q.toLowerCase();
        if (!qq) return null;

        // Exact substring bonus
        var pos = n.indexOf(qq);
        if (pos !== -1) {
          var idxs = [];
          for (var i = 0; i < qq.length; i++) idxs.push(pos + i);
          // lower score = better
          var score = 0 + pos * 2 + (name.length * 0.05);
          // prefix gets extra boost
          if (pos === 0) score -= 5;
          // word boundary gets boost
          if (pos > 0 && /[^a-z0-9]/i.test(name[pos - 1])) score -= 2;
          return { score: score, idxs: idxs };
        }

        // Fuzzy: letters in order
        var idxs2 = [];
        var last = -1;
        var gaps = 0;
        for (var j = 0; j < qq.length; j++) {
          var ch = qq[j];
          var found = n.indexOf(ch, last + 1);
          if (found === -1) return null;
          if (last !== -1) gaps += Math.max(0, found - last - 1);
          idxs2.push(found);
          last = found;
        }

        // score: prefer early + tight + shorter
        var start = idxs2[0];
        var span = idxs2[idxs2.length - 1] - idxs2[0];
        var score2 = 20 + start * 1.5 + gaps * 1.2 + span * 0.2 + (name.length * 0.08);

        // bonus if first char matches word boundary
        if (start === 0) score2 -= 4;
        else if (start > 0 && /[^a-z0-9]/i.test(name[start - 1])) score2 -= 2;

        return { score: score2, idxs: idxs2 };
      }

      function highlightName(name, idxs) {
        name = safeText(name);
        if (!idxs || !idxs.length) return escHtml(name);

        var set = Object.create(null);
        idxs.forEach(function (i) { set[i] = 1; });

        // Inverse highlight: matched chars stay normal, non-matched chars are dimmed.
        var out = "";
        for (var i = 0; i < name.length; i++) {
          var ch = escHtml(name[i]);
          if (set[i]) out += ch;
          else out += '<span class="search-dim">' + ch + "</span>";
        }
        return out;
      }

      function getRecents() {
        try {
          var raw = localStorage.getItem(RECENTS_KEY);
          var arr = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(arr)) return [];
          var seen = Object.create(null);
          var out = [];
          arr.map(normalizeRecentItem).filter(Boolean).forEach(function (it) {
            var key = buildFindKey(it);
            if (seen[key]) return;
            seen[key] = 1;
            out.push(it);
          });
          return out.slice(0, 10);
        } catch (e) {
          return [];
        }
      }

      function pushRecent(it) {
        try {
          var rec = getRecents();
          var norm = normalizeRecentItem(it);
          if (!norm) return;
          var key = buildFindKey(norm);
          rec = rec.filter(function (r) {
            return (buildFindKey(r) !== key);
          });
          rec.unshift(norm);
          rec = rec.filter(Boolean).slice(0, 10);
          localStorage.setItem(RECENTS_KEY, JSON.stringify(rec));
        } catch (e) {}
      }

      function setActiveRow(i) {
        activeIdx = i;
        if (!searchResultsEl) return;
        Array.prototype.slice.call(searchResultsEl.children).forEach(function (el, idx) {
          el.classList.toggle("active", idx === activeIdx);
        });
      }

      function activateTopSuggestion() {
        try {
          // Recents (empty query) require explicit selection via arrows/click.
          if (findIsRecentsView && activeIdx < 0) return false;
          if (!currentMatches || !currentMatches.length) return false;
          var pick = null;
          if (activeIdx >= 0 && currentMatches[activeIdx]) pick = currentMatches[activeIdx].item || currentMatches[activeIdx];
          else if (currentMatches[0]) pick = currentMatches[0].item || currentMatches[0];
          activateItem(pick);
          return true;
        } catch (e) {
          return false;
        }
      }

      function resolveLiveItem(it) {
        try {
          if (!it) return null;
          var key = buildFindKey(it);
          var combined = getCombinedIndex();
          for (var i = 0; i < combined.length; i++) {
            var c = combined[i];
            var ckey = buildFindKey(c);
            if (ckey === key) return c;
          }
          // Fallback: match by name/kind against the current page icons.
          var name = normalizeNameKey(it.name);
          var kind = keyKind(it.kind);
          for (var j = 0; j < SEARCH_INDEX.length; j++) {
            var local = SEARCH_INDEX[j];
            if (!local) continue;
            var lname = normalizeNameKey(local.name);
            var lkind = keyKind(local.kind);
            if (lname === name && lkind === kind) return local;
          }
        } catch (e) {}
        return null;
      }

      function activateItem(it) {
        hideSearch();
        if (!it) return;

        // If this item exists on the current site/page, prefer the live copy (so it can actually open).
        var live = resolveLiveItem(it);
        if (live) it = live;

        // Time-sensitive: re-clicking an existing recent bumps it to the top.
        pushRecent(it);

        // Prefer explicit open handlers
        if (typeof it.open === "function") {
          it.open();
          return;
        }

        // If this came from a real desktop icon, open it directly on mobile or dblclick on desktop.
        if (it.el) {
          if (isMobile()) {
            openIcon(it.el);
          } else {
            it.el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
          }
          return;
        }

        // Fall back to navigation only when href is meaningful
        if (it.href && it.href !== "#") {
          if (normalizeHrefForKey(it) === "index.html") markSkipWelcomeOnce();
          var targetHref = it.href;
          if (isSubpage()) {
            var isAbsolute = targetHref.indexOf("http:") === 0 || targetHref.indexOf("https:") === 0;
            var isMail = targetHref.indexOf("mailto:") === 0;
            var isTel = targetHref.indexOf("tel:") === 0;
            var isRoot = targetHref.indexOf("/") === 0;
            var isUp = targetHref.indexOf("../") === 0;
            if (!(isAbsolute || isMail || isTel || isRoot || isUp)) {
              targetHref = "../" + targetHref;
            }
          }
          window.location.href = targetHref;
        }
      }

      function renderResults(list, q, opts) {
        opts = opts || {};
        currentMatches = (list || []).slice(0);
        activeIdx = -1;
        findIsRecentsView = !!opts.isRecentsView;

        if (!searchResultsEl) return;
        searchResultsEl.innerHTML = "";

        if (!currentMatches.length) {
          searchResultsEl.style.display = "none";
          return;
        }

        currentMatches.forEach(function (rowData, idx) {
          var it = rowData.item || rowData;
          var idxs = rowData.idxs || [];

          var row = document.createElement("button");
          row.type = "button";
          row.className = "search-result";
          row.setAttribute("data-idx", String(idx));

          var leftWrap = document.createElement("span");
          leftWrap.className = "search-result-left";

          var icon = document.createElement("img");
          icon.className = "search-result-icon";
          icon.alt = "";
          if (it.icon) icon.src = normalizeIconPath(it.icon);

          var nameEl = document.createElement("span");
          nameEl.className = "search-result-name";
          nameEl.innerHTML = highlightName(it.name, idxs);

          leftWrap.appendChild(icon);
          leftWrap.appendChild(nameEl);

          var right = document.createElement("span");
          right.className = "search-result-kind";
          right.textContent = (opts && opts.isRecentsView)
            ? "Recent"
            : ((it.kind === "folder") ? "Folder" : "File");

          row.appendChild(leftWrap);
          row.appendChild(right);

          function activateFromEvent(e) {
            e.preventDefault();
            activateItem(it);
          }

          row.addEventListener("mousedown", activateFromEvent);
          row.addEventListener("touchstart", activateFromEvent, { passive: false });
          row.addEventListener("click", activateFromEvent);

          searchResultsEl.appendChild(row);
        });

        searchResultsEl.style.display = "block";

        // Spotlight behavior: default to top result (but NOT for Recents)
        if (opts.defaultSelectTop && currentMatches.length && !opts.isRecentsView) {
          setActiveRow(0);
        }
      }

      function matchItems(q) {
        var combined = getCombinedIndex();
        q = safeText(q).trim();
        if (!q) return [];

        var scoredMap = Object.create(null);
        combined.forEach(function (it) {
          var m = fuzzyMatch(it.name, q);
          if (!m) return;
          var key = buildFindKey(it);
          var existing = scoredMap[key];
          if (!existing || m.score < existing.score) {
            scoredMap[key] = { item: it, score: m.score, idxs: m.idxs };
          }
        });
        var scored = Object.keys(scoredMap).map(function (k) { return scoredMap[k]; });

        // Better ranking: folders can come first when score ties
        scored.sort(function (a, b) {
          if (a.score !== b.score) return a.score - b.score;
          if (a.item.kind !== b.item.kind) return (a.item.kind === "folder") ? -1 : 1;
          return (a.item.name || "").length - (b.item.name || "").length;
        });

        return scored.slice(0, 8);
      }

      function showRecentsIfEmpty() {
        // Only show recents that still exist in the current combined index.
        var rec = getRecents();
        if (GLOBAL_INDEX_READY) {
          var combined = getCombinedIndex();
          var exists = Object.create(null);
          combined.forEach(function (it) {
            var k = buildFindKey(it);
            exists[k] = 1;
          });

          rec = rec.filter(function (it) {
            var k = buildFindKey(it);
            return !!exists[k];
          });
        }

        if (!rec.length) {
          if (searchResultsEl) searchResultsEl.style.display = "none";
          return;
        }
        // Render as rows without scoring
        var rows = rec.map(function (it) { return { item: it, score: 999, idxs: [] }; });
        renderResults(rows, "", { defaultSelectTop: false, isRecentsView: true });
      }

      // Keyboard shortcut: Cmd/Ctrl+F or Cmd/Ctrl+K opens Find
      document.addEventListener("keydown", function (e) {
        var key = (e.key || "").toLowerCase();
        var combo = (e.metaKey || e.ctrlKey) && (key === "f" || key === "k");
        if (!combo) return;
        e.preventDefault();
        toggleSearch();
      });

      // Enter behavior:
      // 1) If a popup exists, Enter closes the active popup.
      // 2) If Find is open, Enter activates the first (top) suggestion.
      // 3) Otherwise, Enter does nothing special.
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;

        var t = e.target;
        // If popup is open, close only the active one.
        var hasAnyPopups = popupOrder && popupOrder.length > 0;
        if (hasAnyPopups) {
          if (t) {
            var tag = (t.tagName || "").toUpperCase();
            if (t.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
          }
          var activePopup = getActivePopup();
          if (activePopup) {
            e.preventDefault();
            if (activePopup.el && activePopup.el.classList && activePopup.el.classList.contains("welcome-popup")) {
              playWelcomeEnterSound();
            }
            closePopup(activePopup);
          }
          return;
        }

        var isSearchField = (t === searchInput);
        if (t && !isSearchField) {
          var tag = (t.tagName || "").toUpperCase();
          if (t.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
        }

        // If Find is open, Enter activates the selected row.
        // For Recents (empty query), Enter only works after the user selects a recent via arrows/click.
        if (searchBarEl && searchBarEl.style.display === "flex") {
          e.preventDefault();
          setTimeout(function () { activateTopSuggestion(); }, 0);
          return;
        }

        // If no popups are open and Find is closed, Enter opens Find.
        if (searchBarEl && searchBarEl.style.display !== "flex") {
          e.preventDefault();
          showSearch();
          return;
        }

        // Otherwise: no special Enter behavior
      }, true);

      // Spacebar toggles play/pause for active audio popup (unless typing or focused on controls).
      document.addEventListener("keydown", function (e) {
        if (!(e.code === "Space" || e.key === " ")) return;

        var t = e.target;
        if (t) {
          var tag = (t.tagName || "").toUpperCase();
          if (t.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
        }

        var activePopup = getActivePopup();
        if (!activePopup || !activePopup.el || !activePopup.el.classList.contains("audio-popup")) return;
        var audio = activePopup.el.querySelector(".popup-embed-body audio");
        if (!audio) return;

        e.preventDefault();
        if (audio.paused) audio.play().catch(function () {});
        else audio.pause();
      }, true);

      // Arrow keys scrub 5% backward/forward for active audio popup.
      document.addEventListener("keydown", function (e) {
        if (!(e.key === "ArrowLeft" || e.key === "ArrowRight")) return;

        var t = e.target;
        if (t) {
          var tag = (t.tagName || "").toUpperCase();
          if (t.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
        }

        var activePopup = getActivePopup();
        if (!activePopup || !activePopup.el || !activePopup.el.classList.contains("audio-popup")) return;
        var audio = activePopup.el.querySelector(".popup-embed-body audio");
        if (!audio || !isFinite(audio.duration) || audio.duration <= 0) return;

        e.preventDefault();
        var delta = audio.duration * 0.05 * (e.key === "ArrowRight" ? 1 : -1);
        var nextTime = audio.currentTime + delta;
        if (nextTime < 0) nextTime = 0;
        if (nextTime > audio.duration) nextTime = audio.duration;
        audio.currentTime = nextTime;
      }, true);

      // Arrow up/down moves to previous/next track for album popups.
      document.addEventListener("keydown", function (e) {
        if (!(e.key === "ArrowUp" || e.key === "ArrowDown")) return;

        var t = e.target;
        if (t) {
          var tag = (t.tagName || "").toUpperCase();
          if (t.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
        }

        var activePopup = getActivePopup();
        if (!activePopup || !activePopup.el || !activePopup.el.classList.contains("audio-popup")) return;
        if (!activePopup.audioNav) return;

        e.preventDefault();
        if (e.key === "ArrowUp" && typeof activePopup.audioNav.prev === "function") activePopup.audioNav.prev();
        if (e.key === "ArrowDown" && typeof activePopup.audioNav.next === "function") activePopup.audioNav.next();
      }, true);

      if (searchInput) {
        searchInput.addEventListener("input", function () {
          var q = searchInput.value || "";
          var trimmed = q.trim();
          var cmd = trimmed.toLowerCase();
          if (cmd === "grid") {
            if (desktopEl) desktopEl.classList.toggle("grid-on");
            if (searchInput) searchInput.value = "";
            if (searchResultsEl) {
              searchResultsEl.innerHTML = "";
              searchResultsEl.style.display = "none";
            }
            hideSearch();
            return;
          }
          if (cmd === "snake") {
            startSnakeGame();
            if (searchInput) searchInput.value = "";
            if (searchResultsEl) {
              searchResultsEl.innerHTML = "";
              searchResultsEl.style.display = "none";
            }
            hideSearch();
            return;
          }
          if (cmd === "click") {
            toggleClickSoundEnabled();
            if (searchInput) searchInput.value = "";
            if (searchResultsEl) {
              searchResultsEl.innerHTML = "";
              searchResultsEl.style.display = "none";
            }
            hideSearch();
            return;
          }

          if (!trimmed) {
            showRecentsIfEmpty();
            return;
          }
          // once typing starts, recents go away and results show default class labels
          renderResults(matchItems(q), q, { defaultSelectTop: true });
        });

        searchInput.addEventListener("keydown", function (e) {
          if (!searchResultsEl || searchResultsEl.style.display !== "block") return;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveRow(Math.min(currentMatches.length - 1, activeIdx + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveRow(Math.max(0, activeIdx - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            activateTopSuggestion();
          } else if (e.key === "Escape") {
            e.preventDefault();
            hideSearch();
          }
        });
      }

      // When Find opens, show recents immediately (SEARCH_INDEX is rebuilt in showSearch())
      var __oldShowSearch = showSearch;
      showSearch = function () {
        __oldShowSearch();
        if (searchInput) {
          if (!(searchInput.value || "").trim()) showRecentsIfEmpty();
        }
      };

      function positionSearchBar() {
        if (!searchBarEl) return;
        if (!isMobile()) {
          searchBarEl.style.left = "";
          searchBarEl.style.right = "";
          searchBarEl.style.transform = "";
          searchBarEl.style.width = "";
          if (searchInput) searchInput.style.width = "";
          return;
        }
        var items = document.querySelectorAll(".taskbar .menu-item:not(.taskbar-return), .taskbar .menubar-clock");
        if (!items || !items.length) return;
        var left = Infinity;
        var right = -Infinity;
        Array.prototype.slice.call(items).forEach(function (el) {
          var r = el.getBoundingClientRect();
          left = Math.min(left, r.left);
          right = Math.max(right, r.right);
        });
        if (!isFinite(left) || !isFinite(right) || right <= left) return;
        searchBarEl.style.left = Math.round(left) + "px";
        searchBarEl.style.right = "auto";
        searchBarEl.style.transform = "none";
        searchBarEl.style.width = Math.round(right - left) + "px";
        if (searchInput) searchInput.style.width = "100%";
      }

      window.addEventListener("resize", function () {
        if (searchBarEl && searchBarEl.style.display === "flex") positionSearchBar();
      });

      (function initClock() {
        if (!clockEl) return;

        function tick() {
          var now = new Date();
          var h = now.getHours();
          var m = now.getMinutes();
          var ampm = h >= 12 ? "PM" : "AM";
          h = h % 12;
          if (h === 0) h = 12;
          var mm = (m < 10 ? "0" + m : "" + m);
          var colon = (now.getSeconds() % 2 === 0) ? ":" : " ";
          clockEl.textContent = "" + h + colon + mm + " " + ampm;
        }

        tick();
        setInterval(tick, 1000);
      })();

      var icons = Array.prototype.slice.call(document.querySelectorAll(".icon"));
      var pageKey = (document.body && document.body.getAttribute("data-page")) || "home";
      var ICON_POS_KEY = "prtf_icon_positions_v1_" + pageKey;
      var savedIconPositions = loadIconPositions();
      var TRASH_KEY = "prtf_trash_v1_" + pageKey;
      var TRASH_POS_KEY = "prtf_trash_pos_v1_" + pageKey;
      var trashedIcons = loadTrashState();
      var trashPos = loadTrashPos();
      var trashIconEl = document.querySelector(".icon[data-kind=\"trash\"]");
      var lastGrid = null;
      var lastViewportW = window.innerWidth || 0;
      var lastViewportH = window.innerHeight || 0;

      function applyVideoIcon(icon) {
        if (!icon) return;
        var kind = icon.getAttribute("data-kind") || "";
        if (kind !== "video") return;
        icon.classList.add("video-icon");
        var imgEl = icon.querySelector("img");
        if (imgEl) {
          imgEl.src = normalizeIconPath("assets/icons/movie.png");
          if (!imgEl.getAttribute("alt")) imgEl.setAttribute("alt", "Video");
        }
      }

      icons.forEach(function (icon) { applyVideoIcon(icon); });

      function iconKey(icon) {
        var label = icon.querySelector("span");
        var name = label ? label.textContent : "";
        var href = icon.getAttribute("href") || "";
        var kind = icon.getAttribute("data-kind") || "";
        return (kind + "|" + href + "|" + name).toLowerCase();
      }

      function isTrashIcon(icon) {
        return !!(icon && icon.getAttribute("data-kind") === "trash");
      }

      function isIconTrashed(icon) {
        if (!icon || isTrashIcon(icon)) return false;
        var key = iconKey(icon);
        return !!(trashedIcons && trashedIcons[key]);
      }

      function loadTrashState() {
        try {
          var raw = localStorage.getItem(TRASH_KEY);
          var data = raw ? JSON.parse(raw) : null;
          return (data && typeof data === "object") ? data : {};
        } catch (e) {
          return {};
        }
      }

      function saveTrashState() {
        try { localStorage.setItem(TRASH_KEY, JSON.stringify(trashedIcons)); } catch (e) {}
      }

      function loadTrashPos() {
        try {
          var raw = localStorage.getItem(TRASH_POS_KEY);
          var data = raw ? JSON.parse(raw) : null;
          if (data && typeof data.x === "number" && typeof data.y === "number") return data;
          return null;
        } catch (e) {
          return null;
        }
      }

      function saveTrashPos() {
        if (!trashIconEl) return;
        trashPos = { x: trashIconEl.offsetLeft, y: trashIconEl.offsetTop };
        try { localStorage.setItem(TRASH_POS_KEY, JSON.stringify(trashPos)); } catch (e) {}
      }

      function clearTrashPos() {
        trashPos = null;
        try { localStorage.removeItem(TRASH_POS_KEY); } catch (e) {}
      }

      function applyTrashState() {
        icons.forEach(function (icon) {
          if (isTrashIcon(icon)) return;
          var key = iconKey(icon);
          if (trashedIcons[key]) {
            icon.classList.add("in-trash");
            moveIconToDesktop(icon);
            var pos = trashedIcons[key];
            if (pos && typeof pos.x === "number") icon.style.left = pos.x + "px";
            if (pos && typeof pos.y === "number") icon.style.top = pos.y + "px";
          } else {
            icon.classList.remove("in-trash");
            moveIconToDesktop(icon);
          }
        });
      }

      function moveIconToDesktop(icon, rect) {
        if (!desktopEl || !icon || icon.parentNode === desktopEl) return;
        desktopEl.appendChild(icon);
        if (rect) {
          var deskRect = desktopEl.getBoundingClientRect();
          icon.style.left = Math.max(0, rect.left - deskRect.left) + "px";
          icon.style.top = Math.max(0, rect.top - deskRect.top) + "px";
        }
      }

      function getDesktopBounds() {
        var r = desktopEl ? desktopEl.getBoundingClientRect() : null;
        var w = (r && r.width) ? r.width : (window.innerWidth || 0);
        var h = (r && r.height) ? r.height : (window.innerHeight || 0);
        return { width: w, height: h };
      }

      function rectsOverlap(a, b) {
        return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      }

      function collectOccupiedRects(excludeSet) {
        var rects = [];
        icons.forEach(function (icon) {
          if (!icon || (excludeSet && excludeSet[iconKey(icon)])) return;
          if (icon.classList.contains("in-trash")) return;
          var left = icon.offsetLeft || 0;
          var top = icon.offsetTop || 0;
          var w = icon.offsetWidth || 99;
          var h = icon.offsetHeight || 120;
          rects.push({ left: left, top: top, right: left + w, bottom: top + h });
        });
        return rects;
      }

      function placeIconWithoutOverlap(icon, occupied, bounds, anchor) {
        if (!icon) return;
        var iconW = icon.offsetWidth || 99;
        var iconH = icon.offsetHeight || 120;
        var stepX = (lastGrid && lastGrid.x) ? lastGrid.x : (iconW + 12);
        var stepY = (lastGrid && lastGrid.y) ? lastGrid.y : (iconH + 16);
        var maxR = 12;

        function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
        function canPlace(l, t) {
          var rect = { left: l, top: t, right: l + iconW, bottom: t + iconH };
          for (var i = 0; i < occupied.length; i++) {
            if (rectsOverlap(rect, occupied[i])) return false;
          }
          occupied.push(rect);
          icon.style.left = l + "px";
          icon.style.top = t + "px";
          return true;
        }

        var centerX = anchor.x;
        var centerY = anchor.y;
        for (var r = 1; r <= maxR; r++) {
          for (var dx = -r; dx <= r; dx++) {
            for (var dy = -r; dy <= r; dy++) {
              if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
              var left = centerX + (dx * stepX) - (iconW / 2);
              var top = centerY + (dy * stepY) - (iconH / 2);
              left = clamp(left, 0, Math.max(0, bounds.width - iconW));
              top = clamp(top, 0, Math.max(0, bounds.height - iconH));
              if (canPlace(left, top)) return;
            }
          }
        }
        // Fallback: place at current position if no gap found.
      }

      function spitOutTrashContents() {
        if (!trashIconEl) return;
        var inTrash = icons.filter(function (icon) { return icon.classList.contains("in-trash"); });
        if (!inTrash.length) return;

        var excludeSet = Object.create(null);
        inTrash.forEach(function (icon) { excludeSet[iconKey(icon)] = 1; });

        var bounds = getDesktopBounds();
        var anchor = {
          x: (trashIconEl.offsetLeft || 0) + (trashIconEl.offsetWidth || 99) / 2,
          y: (trashIconEl.offsetTop || 0) + (trashIconEl.offsetHeight || 120) / 2
        };
        var occupied = collectOccupiedRects(excludeSet);
        if (trashIconEl) {
          var tleft = trashIconEl.offsetLeft || 0;
          var ttop = trashIconEl.offsetTop || 0;
          var tw = trashIconEl.offsetWidth || 99;
          var th = trashIconEl.offsetHeight || 120;
          occupied.push({ left: tleft, top: ttop, right: tleft + tw, bottom: ttop + th });
        }

        inTrash.forEach(function (icon) {
          restoreIcon(icon);
          moveIconToDesktop(icon);
          placeIconWithoutOverlap(icon, occupied, bounds, anchor);
        });
        saveTrashState();
      }

      function trashIcon(icon) {
        if (!icon || isTrashIcon(icon)) return;
        var key = iconKey(icon);
        if (!trashedIcons[key]) {
          trashedIcons[key] = { x: icon.offsetLeft, y: icon.offsetTop };
        }
        icon.classList.add("in-trash");
        icon.classList.remove("selected");
        saveTrashState();
      }

      function restoreIcon(icon) {
        if (!icon || isTrashIcon(icon)) return;
        var key = iconKey(icon);
        if (!trashedIcons[key]) return;
        delete trashedIcons[key];
        icon.classList.remove("in-trash");
        saveTrashState();
      }

      function isOverTrash(icon) {
        if (!trashIconEl || !icon) return false;
        var r1 = icon.getBoundingClientRect();
        var r2 = trashIconEl.getBoundingClientRect();
        return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
      }

      function snapIconToGrid(icon) {
        if (!icon || !lastGrid) return;
        if (icon.classList.contains("in-trash")) return;
        var gx = lastGrid.x;
        var gy = lastGrid.y;
        if (!(gx > 0 && gy > 0)) return;
        var col = Math.round((icon.offsetLeft - lastGrid.offsetX) / gx);
        var row = Math.round((icon.offsetTop - lastGrid.offsetY) / gy);
        col = Math.max(0, col);
        row = Math.max(0, row);
        var targetX = Math.round(lastGrid.offsetX + (col * gx));
        var targetY = Math.round(lastGrid.offsetY + (row * gy));
        var excludeSet = Object.create(null);
        excludeSet[iconKey(icon)] = 1;
        var occupied = collectOccupiedRects(excludeSet);
        var iconW = icon.offsetWidth || 99;
        var iconH = icon.offsetHeight || 120;
        var pad = 4;
        var targetRect = {
          left: targetX + pad,
          top: targetY + pad,
          right: targetX + iconW - pad,
          bottom: targetY + iconH - pad
        };
        var blocked = occupied.some(function (r) {
          var rPad = {
            left: r.left + pad,
            top: r.top + pad,
            right: r.right - pad,
            bottom: r.bottom - pad
          };
          return rectsOverlap(targetRect, rPad);
        });

        if (blocked) {
          var neighborOffsets = [
            { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
            { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
          ];
          var placed = false;
          for (var i = 0; i < neighborOffsets.length; i++) {
            var nx = targetX + (neighborOffsets[i].dx * gx);
            var ny = targetY + (neighborOffsets[i].dy * gy);
            nx = Math.max(0, Math.min(getDesktopBounds().width - iconW, nx));
            ny = Math.max(0, Math.min(getDesktopBounds().height - iconH, ny));

            var nRect = {
              left: nx + pad,
              top: ny + pad,
              right: nx + iconW - pad,
              bottom: ny + iconH - pad
            };
            var nBlocked = occupied.some(function (r) {
              var rPad = {
                left: r.left + pad,
                top: r.top + pad,
                right: r.right - pad,
                bottom: r.bottom - pad
              };
              return rectsOverlap(nRect, rPad);
            });
            if (!nBlocked) {
              animateIconTo(icon, nx, ny, 140);
              placed = true;
              break;
            }
          }

          if (!placed) {
            var backX = (typeof icon.__startX === "number") ? icon.__startX : icon.offsetLeft;
            var backY = (typeof icon.__startY === "number") ? icon.__startY : icon.offsetTop;
            animateIconTo(icon, backX, backY, 140);
          }
        } else {
          animateIconTo(icon, targetX, targetY, 140);
        }
      }

      function animateIconTo(icon, x, y, durationMs) {
        if (!icon) return;
        var startX = icon.offsetLeft || 0;
        var startY = icon.offsetTop || 0;
        var dx = x - startX;
        var dy = y - startY;
        var duration = Math.max(40, Number(durationMs) || 0);
        var start = performance.now();

        if (icon.__snapAnimId) cancelAnimationFrame(icon.__snapAnimId);

        function easeOut(t) {
          return 1 - Math.pow(1 - t, 3);
        }

        function step(now) {
          var p = Math.min(1, (now - start) / duration);
          var e = easeOut(p);
          icon.style.left = Math.round(startX + (dx * e)) + "px";
          icon.style.top = Math.round(startY + (dy * e)) + "px";
          if (p < 1) {
            icon.__snapAnimId = requestAnimationFrame(step);
          } else {
            icon.__snapAnimId = 0;
          }
        }

        icon.__snapAnimId = requestAnimationFrame(step);
      }

      function updateTrashHover(icon) {
        if (!trashIconEl) return;
        var shouldHover = !!(icon && !isTrashIcon(icon) && isOverTrash(icon));
        trashIconEl.classList.toggle("trash-hover", shouldHover);
      }

      function handleTrashDrop(icon) {
        if (!icon || isTrashIcon(icon)) return;
        if (trashIconEl) trashIconEl.classList.remove("trash-hover");
        if (isOverTrash(icon)) {
          trashIcon(icon);
          return;
        }
      }

      function loadIconPositions() {
        try {
          var raw = localStorage.getItem(ICON_POS_KEY);
          var data = raw ? JSON.parse(raw) : null;
          return (data && typeof data === "object") ? data : null;
        } catch (e) {
          return null;
        }
      }

      function saveIconPositions() {
        try {
          var out = {};
          icons.forEach(function (icon) {
            if (isIconTrashed(icon)) return;
            if (isTrashIcon(icon)) return;
            out[iconKey(icon)] = { x: icon.offsetLeft, y: icon.offsetTop };
          });
          savedIconPositions = out;
          localStorage.setItem(ICON_POS_KEY, JSON.stringify(out));
        } catch (e) {}
      }

      function hasSavedPositions() {
        return !!(savedIconPositions && Object.keys(savedIconPositions).length);
      }

      function applySavedPositions() {
        if (!hasSavedPositions() || isMobile()) return;
        icons.forEach(function (icon) {
          if (isIconTrashed(icon)) return;
          if (isTrashIcon(icon)) return;
          var pos = savedIconPositions[iconKey(icon)];
          if (!pos) return;
          if (typeof pos.x === "number") icon.style.left = pos.x + "px";
          if (typeof pos.y === "number") icon.style.top = pos.y + "px";
        });
      }

      function resetIconPositions() {
        try {
          for (var i = localStorage.length - 1; i >= 0; i--) {
            var key = localStorage.key(i);
            if (key && key.indexOf("prtf_icon_positions_v1_") === 0) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {}
        savedIconPositions = null;
        trashedIcons = {};
        saveTrashState();
        clearTrashPos();
        icons.forEach(function (icon) {
          icon.style.left = "";
          icon.style.top = "";
          icon.classList.remove("in-trash");
        });
      }

      function fitIconLabel(icon) {
        var label = icon ? icon.querySelector("span") : null;
        if (!label) return;

        // Keep icon label font size consistent; allow wrapping instead of shrinking.
        label.style.fontSize = "";
      }

      function adjustIconLabels() {
        icons.forEach(function (icon) { fitIconLabel(icon); });
      }

      function getArtworkFromIcon(icon) {
        if (!icon) return "";
        var artwork = icon.getAttribute("data-artwork") || "";
        return artwork ? resolveArtworkSrc(normalizeIconPath(artwork)) : "";
      }

      function prewarmAudioIcon(icon) {
        if (!icon) return;
        var kind = icon.getAttribute("data-kind") || "";
        if (kind !== "audio" && kind !== "album") return;
        var artworkSrc = getArtworkFromIcon(icon);
        if (artworkSrc) prefetchImage(artworkSrc);
      }

      function openIcon(icon) {
        if (!icon) return;
        var href = icon.getAttribute("href");
        var kind = icon.getAttribute("data-kind") || "folder";
        var imgEl = icon.querySelector("img");
        var labelEl = icon.querySelector("span");
        var name = labelEl ? labelEl.textContent : "";
        var dataTitle = icon.getAttribute("data-title") || "";
        var dataFile = icon.getAttribute("data-file") || "";
        var dataText = icon.getAttribute("data-text") || "";
        var dataTextSize = icon.getAttribute("data-text-size") || "";
        var dataTextImage = icon.getAttribute("data-text-image") || "";
        var dataQuote = icon.getAttribute("data-quote") || "";
        var dataQuoteSignature = icon.getAttribute("data-quote-signature") || "";
        var dataSpotify = icon.getAttribute("data-spotify") || "";
        var dataApple = icon.getAttribute("data-apple") || "";
        var dataAudio = icon.getAttribute("data-audio") || "";
        var dataTracks = icon.getAttribute("data-tracks") || "";
        var dataTrackNames = icon.getAttribute("data-track-names") || "";
        var dataArtwork = icon.getAttribute("data-artwork") || "";
        var dataArtist = icon.getAttribute("data-artist") || "";
        if (kind === "audio" || kind === "album") {
          var warmArtwork = dataArtwork ? resolveArtworkSrc(normalizeIconPath(dataArtwork)) : "";
          if (warmArtwork) prefetchImage(warmArtwork);
        }

        var dataFull = icon.getAttribute("data-full") || "";
        var previewSrc = (imgEl && (imgEl.getAttribute("src") || "")) || "";
        var popupSrc = dataFull ? normalizeIconPath(dataFull) : "";
        if (!popupSrc) popupSrc = normalizeIconPath(previewSrc) || previewSrc;

        // Image preview (desktop files)
        if (kind === "file" && popupSrc && /\.(png|jpg|jpeg|gif|webp)$/i.test(popupSrc)) {
          openPopup({
            title: icon.querySelector("span") ? icon.querySelector("span").textContent : "Image",
            key: "file:" + popupSrc,
            content: [
              { type: "image", src: popupSrc, alt: "Preview", size: "xl" }
            ]
          });
          return;
        }

        if (kind === "text") {
          if (dataFile === "quote") {
            openPopup({
              title: name || "note.txt",
              key: "text:" + (name || "note.txt"),
              content: POPUP_CONTENT.quoteFile()
            });
            return;
          }

          openPopup({
            title: dataTitle || name || "note.txt",
            key: "text:" + (dataTitle || name || "note.txt"),
            content: (function () {
              var blocks = [];
              if (dataTextImage) {
              blocks.push({ type: "image", src: normalizeIconPath(dataTextImage), alt: "", size: "sm" });
            }
            blocks.push({ type: "text", role: "body", size: dataTextSize || "md", align: "left", text: dataText || "Placeholder text." });
            if (dataQuote) {
              var qHtml = escHtml(dataQuote);
              if (dataQuoteSignature) {
                qHtml += "<br><div class=\"popup-quote-signature\">" + escHtml(dataQuoteSignature) + "</div>";
              }
              blocks.push({ type: "quote", html: qHtml });
            }
            return blocks;
          })()
          });
          return;
        }

        if (kind === "music" || kind === "video") {
          var blocks = [];
          if (dataSpotify) blocks.push({ type: "embed", html: dataSpotify });
          if (dataApple) blocks.push({ type: "embed", html: dataApple });
          if (!blocks.length) {
            blocks.push({ type: "text", role: "body", size: "md", align: "left", text: "No embeds provided." });
          }

          openPopup({
            title: name || (kind === "video" ? "Video" : "Music"),
            key: (kind === "video" ? "video:" : "music:") + (name || "track"),
            content: blocks
          });
          return;
        }

        var isSingleAudio = false;
        if (kind === "audio") {
          if (!dataTracks && dataAudio) dataTracks = dataAudio;
          if (!dataTrackNames) dataTrackNames = dataTitle || name || "Track 01";
          if (!dataTitle) dataTitle = name || "Album";
          isSingleAudio = true;
          kind = "album";
        }

        if (kind === "album") {
          var albumTitle = dataTitle || name || "Album";
          var albumArtist = safeText(dataArtist).trim();
          var tracksRaw = safeText(dataTracks).trim();
          var albumArtwork = dataArtwork ? resolveArtworkSrc(normalizeIconPath(dataArtwork)) : "";
          if (!tracksRaw) {
            openPopup({
              title: albumTitle,
              key: "album:" + (albumTitle || "album"),
              content: [
                { type: "text", role: "body", size: "md", align: "left", text: "No tracks provided." }
              ]
            });
            return;
          }

          var trackPaths = tracksRaw.split("|").map(function (t) { return safeText(t).trim(); }).filter(Boolean);
          var nameParts = safeText(dataTrackNames).trim().split("|").map(function (t) { return safeText(t).trim(); });
          var trackList = trackPaths.map(function (p, i) {
            return {
              src: normalizeIconPath(p),
              name: nameParts[i] || ("Track " + String(i + 1).padStart(2, "0"))
            };
          });

          var albumId = "album" + String(Math.random()).slice(2);
          var listHtml = trackList.map(function (t, i) {
            return "<button type=\"button\" class=\"album-track\" data-idx=\"" + i + "\">" +
              "<span class=\"track-num\">" + String(i + 1).padStart(2, "0") + ".</span>" +
              "<span class=\"track-name\">" + escHtml(t.name) + "</span>" +
            "</button>";
          }).join("");

          var albumHtml =
            "<div class=\"popup-embed-frame\">" +
              "<div class=\"popup-embed-bar\">" +
                "<span class=\"embed-title-italic np-title\">" + escHtml(albumTitle) + "</span>" +
              "</div>" +
              (albumArtwork
                ? "<div class=\"popup-artwork\"><img src=\"" + escHtml(albumArtwork) + "\" alt=\"\" loading=\"eager\" decoding=\"async\" fetchpriority=\"high\" /></div>"
                : "<div class=\"popup-artwork placeholder\"><div class=\"popup-artwork-text\">No Artwork Available</div></div>") +
              "<div class=\"popup-embed-body popup-audio\" id=\"" + albumId + "\">" +
                "<audio preload=\"auto\"></audio>" +
                "<div class=\"nostalgia-player\">" +
                  "<div class=\"np-top\">" +
                    "<div class=\"np-time\">0:00 / 0:00</div>" +
                    "<input class=\"np-seek\" type=\"range\" min=\"0\" max=\"100\" value=\"0\" step=\"0.1\" />" +
                    "<a class=\"np-download-btn\" href=\"#\" download aria-label=\"Download track\" title=\"Download\"></a>" +
                    "<button type=\"button\" class=\"np-toggle-btn\" aria-pressed=\"false\" aria-label=\"Toggle\"></button>" +
                  "</div>" +
                  "<div class=\"np-controls\">" +
                    "<button type=\"button\" class=\"np-btn np-prev\" aria-label=\"Previous\"></button>" +
                    "<button type=\"button\" class=\"np-btn np-play\" aria-label=\"Play\"></button>" +
                    "<button type=\"button\" class=\"np-btn np-next\" aria-label=\"Next\"></button>" +
                  "</div>" +
                "</div>" +
                (trackList.length > 1
                  ? "<div class=\"album-tracklist\">" + listHtml + "</div>"
                  : "") +
              "</div>" +
            "</div>";

          openPopup({
            title: albumTitle,
            key: "album:" + albumTitle,
            className: isSingleAudio ? "audio-popup audio-single" : "audio-popup",
            content: [
              { type: "embed", html: albumHtml }
            ],
            onOpen: function (popup) {
              if (!popup || !popup.el) return;
              var root = popup.el.querySelector("#" + albumId);
              if (!root) return;
              var audio = root.querySelector("audio");
              var buttons = Array.prototype.slice.call(root.querySelectorAll(".album-track"));
              var current = 0;
              var cleanupPlayer = null;
              var titleEl = popup.el.querySelector(".np-title");
              var downloadBtn = popup.el.querySelector(".np-download-btn");
              var toggleBtn = root.querySelector(".np-toggle-btn");
              var AUTOPLAY_KEY = "prtf_nostalgia_autoplay_v1";
              var skipEl = null;
              var bodyWrap = null;
              if (popup.bodyEl) {
                bodyWrap = popup.bodyEl.querySelector(".popup-audio-actions");
                if (!bodyWrap) {
                  bodyWrap = document.createElement("div");
                  bodyWrap.className = "popup-audio-actions";
                  popup.bodyEl.appendChild(bodyWrap);
                }
                var player = root.querySelector(".nostalgia-player");
                if (player) bodyWrap.appendChild(player);
              }
              if (root) skipEl = root.querySelector(".np-skip");

              function updateMediaSessionForIdx(idx) {
                setMediaSessionMetadata({
                  title: trackList[idx].name,
                  artist: albumArtist,
                  album: albumTitle,
                  artwork: albumArtwork
                });
              }

              function setActive(idx, shouldPlay) {
                current = idx;
                buttons.forEach(function (btn, i) { btn.classList.toggle("is-active", i === idx); });
                if (audio) {
                  audio.src = trackList[idx].src;
                  try { audio.load(); } catch (e) {}
                  if (shouldPlay) audio.play().catch(function () {});
                }
                if (titleEl) titleEl.textContent = trackList[idx].name;
                if (downloadBtn) {
                  downloadBtn.href = trackList[idx].src;
                  downloadBtn.setAttribute("download", trackList[idx].name || "track");
                  downloadBtn.setAttribute("aria-label", "Download " + trackList[idx].name);
                  downloadBtn.setAttribute("title", "Download " + trackList[idx].name);
                }
                updateMediaSessionForIdx(idx);
              }

              buttons.forEach(function (btn) {
                btn.addEventListener("click", function () {
                  var idx = Number(btn.getAttribute("data-idx") || 0);
                  if (isNaN(idx)) return;
                  setActive(idx, true);
                });
              });

              function getToggleState() {
                if (!toggleBtn) return "off";
                var state = toggleBtn.getAttribute("data-state");
                if (state === "autoplay" || state === "replay" || state === "off") return state;
                if (toggleBtn.classList.contains("is-replay")) return "replay";
                if (toggleBtn.classList.contains("is-on") || toggleBtn.getAttribute("aria-pressed") === "true") return "autoplay";
                return "off";
              }

              function isAutoplayOn() {
                return getToggleState() === "autoplay";
              }

              function isReplayOn() {
                return getToggleState() === "replay";
              }

              function readAutoplayPref() {
                try {
                  var raw = localStorage.getItem(AUTOPLAY_KEY);
                  if (raw === "autoplay" || raw === "replay" || raw === "off") return raw;
                } catch (e) {}
                return "off";
              }

              function writeAutoplayPref(state) {
                try { localStorage.setItem(AUTOPLAY_KEY, state); } catch (e) {}
              }

              if (audio) {
                audio.addEventListener("ended", function () {
                  if (isReplayOn()) {
                    audio.currentTime = 0;
                    audio.play().catch(function () {});
                    return;
                  }
                  if (isAutoplayOn()) {
                    var next = current + 1;
                    if (next < trackList.length) setActive(next, true);
                  }
                });
              }

              var autoplayPref = readAutoplayPref();
              setActive(0, autoplayPref === "autoplay" || autoplayPref === "replay");
              if (skipEl) skipEl.style.display = (trackList.length > 1) ? "inline-flex" : "none";
              function prevTrack() {
                var prev = current - 1;
                if (prev < 0) prev = trackList.length - 1;
                setActive(prev, true);
              }

              function nextTrack() {
                var next = current + 1;
                if (next >= trackList.length) next = 0;
                setActive(next, true);
              }

              if (popup) popup.audioNav = { prev: prevTrack, next: nextTrack };
              if (audio) cleanupPlayer = initNostalgiaPlayer(popup.bodyEl || root, audio, {
                autoPlay: false,
                onPrev: prevTrack,
                onNext: nextTrack,
                initialToggleState: autoplayPref,
                onToggle: function (state) {
                  writeAutoplayPref(state);
                  if ((state === "autoplay" || state === "replay") && audio.paused) audio.play().catch(function () {});
                }
              });
              return function () {
                if (cleanupPlayer) cleanupPlayer();
                if (popup && popup.audioNav) delete popup.audioNav;
              };
            }
          });
          return;
        }

        if (kind === "trash") {
          spitOutTrashContents();
          return;
        }

        if (kind === "reset") {
          resetIconPositions();
          layoutIcons();
          return;
        }

        if (href && href !== "#") {
          // Cross-page loader (Option A): set a flag, navigate immediately.
          try {
            sessionStorage.setItem(
              "prtf_pending_loader_v1",
              JSON.stringify({
                title: "Loading...",
                headline: (icon.querySelector("span") ? icon.querySelector("span").textContent : "Folder"),
                label: "Loading items…",
                hint: "Reading folder contents…",
                icon: assetPath("assets/icons/folder-160.png")
              })
            );
          } catch (e) {}
          window.location.href = href;
        }
      }

      function layoutIcons() {
        if (!icons.length) return;

        // Responsive spacing + sizing (mobile aims for 4 columns on iPhone)
        var mobile = isMobile();
        var gapX = mobile ? 4 : 2;
        var gapY = mobile ? 8 : 12;

        // Read actual icon dimensions (so CSS mobile overrides are honored)
        var iconW = icons[0].offsetWidth || 99;
        var iconH = icons[0].offsetHeight || 120;

        var gridX = iconW + gapX - 8;
        var gridY = (iconH + gapY) * 0.8;

        var margin = mobile ? 4 : 10;
        var available = Math.max(1, window.innerWidth - margin * 2);
        var cols = Math.max(1, Math.floor((available + (gridX - iconW)) / gridX));

        var gridW = (cols * gridX) - (gridX - iconW);

        // Center only on mobile (<=768px)
        var paddingLeft = isMobile()
          ? Math.max(margin, Math.round((window.innerWidth - gridW) / 2))
          : margin;

        var paddingTop = 10;

        if (desktopEl) {
          desktopEl.style.setProperty("--grid-x", gridX + "px");
          desktopEl.style.setProperty("--grid-y", gridY + "px");
          desktopEl.style.setProperty("--grid-offset-x", paddingLeft + "px");
          desktopEl.style.setProperty("--grid-offset-y", paddingTop + "px");
        }
        lastGrid = {
          x: gridX,
          y: gridY,
          offsetX: paddingLeft,
          offsetY: paddingTop
        };

        var x = paddingLeft;
        var y = paddingTop;
        var col = 0;
        var visibleCount = 0;

        icons.forEach(function (icon) {
          if (isIconTrashed(icon)) return;
          if (isTrashIcon(icon)) return;
          icon.style.left = x + "px";
          icon.style.top = y + "px";
          visibleCount += 1;

          col++;
          if (col >= cols) {
            col = 0;
            x = paddingLeft;
            y += gridY;
          } else {
            x += gridX;
          }
        });

        if (trashIconEl) {
          if (trashPos && typeof trashPos.x === "number" && typeof trashPos.y === "number") {
            trashIconEl.style.left = trashPos.x + "px";
            trashIconEl.style.top = trashPos.y + "px";
          } else {
            var deskRect = desktopEl ? desktopEl.getBoundingClientRect() : { top: 0 };
            var availableH = Math.max(0, window.innerHeight - deskRect.top - 10);
            var rowsFit = Math.max(1, Math.floor((availableH - paddingTop - iconH) / gridY) + 1);
            var trashCol = Math.max(0, cols - 1);
            var trashRow = Math.max(0, rowsFit - 1);
            trashIconEl.style.left = Math.round(paddingLeft + (trashCol * gridX)) + "px";
            trashIconEl.style.top = Math.round(paddingTop + (trashRow * gridY)) + "px";
          }
        }

        adjustIconLabels();
        applySavedPositions();
        applyTrashState();

        // Make the page scrollable on mobile by giving the desktop a real height.
        // (Icons are absolutely positioned, so without this the document height stays tiny.)
        try {
          var rows = Math.ceil(visibleCount / cols);
          var totalH = paddingTop + ((rows - 1) * gridY) + iconH;
          var extra = mobile ? 80 : 20;
          if (desktopEl) desktopEl.style.height = (totalH + extra) + "px";
        } catch (e) {}

        lastViewportW = window.innerWidth || lastViewportW;
        lastViewportH = window.innerHeight || lastViewportH;
      }

      function clearSelections() { icons.forEach(function (i) { i.classList.remove("selected"); }); }

      var draggingIcon = false;
      var possibleDrag = false;
      var startX = 0, startY = 0;
      var offX2 = 0, offY2 = 0;
      var activeIcon = null;
      var threshold = 5;

      icons.forEach(function (icon) {
        icon.addEventListener("mouseenter", function () { prewarmAudioIcon(icon); });
        icon.addEventListener("focus", function () { prewarmAudioIcon(icon); });

        icon.addEventListener("mousedown", function (e) {
          e.preventDefault();

          startX = e.clientX;
          startY = e.clientY;
          activeIcon = icon;
          activeIcon.__startX = icon.offsetLeft || 0;
          activeIcon.__startY = icon.offsetTop || 0;
          offX2 = e.clientX - icon.offsetLeft;
          offY2 = e.clientY - icon.offsetTop;

          possibleDrag = true;
          draggingIcon = false;

          clearSelections();
          icon.classList.add("selected");
        });

        icon.addEventListener("touchstart", function (e) {
          prewarmAudioIcon(icon);
          if (!isMobile()) return;
          var t = e.touches && e.touches[0];
          if (!t) return;

          startX = t.clientX;
          startY = t.clientY;
          activeIcon = icon;
          activeIcon.__startX = icon.offsetLeft || 0;
          activeIcon.__startY = icon.offsetTop || 0;
          offX2 = t.clientX - icon.offsetLeft;
          offY2 = t.clientY - icon.offsetTop;

          possibleDrag = true;
          draggingIcon = false;

          clearSelections();
          icon.classList.add("selected");
        }, { passive: true });

        icon.addEventListener("click", function (e) {
          e.preventDefault();
          clearSelections();
          icon.classList.add("selected");
          if (isMobile() && !isTouchDevice()) {
            openIcon(icon);
          }
        });

        icon.addEventListener("dblclick", function (e) {
          e.preventDefault();
          if (isMobile()) return;
          openIcon(icon);
        });

        icon.addEventListener("contextmenu", function (e) {
          if (!isMobile()) return;
          e.preventDefault();
        });
      });

      document.addEventListener("mousemove", function (e) {
        if (!possibleDrag || !activeIcon) return;

        if (!draggingIcon) {
          var dx = e.clientX - startX;
          var dy = e.clientY - startY;
          if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
            draggingIcon = true;
            activeIcon.style.zIndex = 1000;
          }
        }

        if (draggingIcon) {
          var x = e.clientX - offX2;
          var y = e.clientY - offY2;
          x = Math.max(0, Math.min(window.innerWidth - activeIcon.offsetWidth, x));
          y = Math.max(0, Math.min(window.innerHeight - activeIcon.offsetHeight, y));
          activeIcon.style.left = x + "px";
          activeIcon.style.top = y + "px";
          updateTrashHover(activeIcon);
        }
      });

      document.addEventListener("mouseup", function () {
        if (draggingIcon && activeIcon) handleTrashDrop(activeIcon);
        if (draggingIcon && activeIcon) snapIconToGrid(activeIcon);
        if (draggingIcon && activeIcon && isTrashIcon(activeIcon)) saveTrashPos();
        if (draggingIcon) saveIconPositions();
        possibleDrag = false;
        draggingIcon = false;
        if (activeIcon) activeIcon.style.zIndex = "";
        activeIcon = null;
      });

      document.addEventListener("touchmove", function (e) {
        if (!possibleDrag || !activeIcon) return;
        var t = e.touches && e.touches[0];
        if (!t) return;

        if (!draggingIcon) {
          var dx = t.clientX - startX;
          var dy = t.clientY - startY;
          if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
            draggingIcon = true;
            activeIcon.style.zIndex = 1000;
          }
        }

        if (draggingIcon) {
          e.preventDefault();
          var x = t.clientX - offX2;
          var y = t.clientY - offY2;
          x = Math.max(0, Math.min(window.innerWidth - activeIcon.offsetWidth, x));
          y = Math.max(0, Math.min(window.innerHeight - activeIcon.offsetHeight, y));
          activeIcon.style.left = x + "px";
          activeIcon.style.top = y + "px";
          updateTrashHover(activeIcon);
        }
      }, { passive: false });

      function endTouchDrag() {
        if (!activeIcon) return;
        if (draggingIcon) handleTrashDrop(activeIcon);
        if (draggingIcon) snapIconToGrid(activeIcon);
        if (draggingIcon && isTrashIcon(activeIcon)) saveTrashPos();
        if (draggingIcon) saveIconPositions();
        if (!draggingIcon && isMobile()) openIcon(activeIcon);
        possibleDrag = false;
        draggingIcon = false;
        if (activeIcon) activeIcon.style.zIndex = "";
        activeIcon = null;
      }

      document.addEventListener("touchend", endTouchDrag);
      document.addEventListener("touchcancel", endTouchDrag);

      document.addEventListener("click", function (e) {
        if (!e.target.closest(".icon")) clearSelections();
      });

      window.addEventListener("resize", function () {
        if (!draggingIcon) {
          if (isMobile()) {
            var w = window.innerWidth || 0;
            if (w === lastViewportW) return;
          }
          layoutIcons();
        }
      });

      applyTrashState();
      layoutIcons();
      window.addEventListener("load", function () {
        layoutIcons();
        requestAnimationFrame(layoutIcons);
      });

      function maybeWelcome() {
        var page = document.body ? document.body.getAttribute("data-page") : "";
        if (page !== "home") return;
        if (consumeSkipWelcomeOnce()) return;

        var popup = openPopup({
          title: "Welcome Board",
          okText: "Enter",
          closeOnBackdrop: true,
          dimOverlay: true,
          content: POPUP_CONTENT.welcome()
        });
        if (!popup) return;
        if (popup.el) popup.el.classList.add("welcome-popup");

        try {
          var welcomeLine = popup.bodyEl ? popup.bodyEl.querySelector(".popup-text.role-welcome") : null;
          if (welcomeLine && !welcomeLine.classList.contains("wave")) {
            var raw = welcomeLine.textContent || "";
            var html = "";
            for (var i = 0; i < raw.length; i++) {
              var ch = raw[i];
              if (ch === " ") {
                html += "&nbsp;";
              } else {
                if (ch === "&") ch = "&amp;";
                else if (ch === "<") ch = "&lt;";
                else if (ch === ">") ch = "&gt;";
                html += '<span style="--i:' + i + '">' + ch + "</span>";
              }
            }
            welcomeLine.innerHTML = html;
            welcomeLine.classList.add("wave");
          }
        } catch (e) {}

        var welcomeTitleEl = popup.bodyEl ? popup.bodyEl.querySelector(".popup-text.role-title") : null;
        function tickWelcomeTitle() {
          if (!welcomeTitleEl) return;
          var d = new Date();
          var dateStrNow = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
          var h = d.getHours();
          var m = d.getMinutes();
          var ampm = h >= 12 ? "PM" : "AM";
          h = h % 12;
          if (h === 0) h = 12;
          var mm = (m < 10 ? "0" + m : "" + m);
          var colon = (d.getSeconds() % 2 === 0) ? ":" : " ";
          welcomeTitleEl.innerHTML = h + colon + mm + " " + ampm + "<br><span class=\"welcome-date\">" + dateStrNow + "</span>";
        }
        tickWelcomeTitle();
        var clockTimer = setInterval(tickWelcomeTitle, 1000);
        addPopupTimer(popup, "interval", clockTimer);
      }

      // If we navigated here from a folder click, show a real-duration loader until this page finishes loading.
      var hadPending = false;
      try { hadPending = maybeStartPendingLoader(); } catch (e) { hadPending = false; }

      // Otherwise, show an OS9-style boot/loading screen on page load (timed), then the welcome popup (home only).
      if (!hadPending) {
        var page = document.body ? document.body.getAttribute("data-page") : "";
        var loadHints = [
          "Flipping switches",
          "Tightening screws",
          "Checking wires",
          "Filing papers",
          "Submitting taxes"
        ];
        var loadLabel = loadHints[Math.floor(Math.random() * loadHints.length)];
        if (document.readyState === "complete") {
          if (page === "home") maybeWelcome();
        } else {
          showLoadingUntilPageLoad({
            icon: null,
            label: "Loading...",
            hint: loadLabel,
            hints: loadHints,
            onDone: function () {
              if (page === "home") maybeWelcome();
            }
          });
        }
      } else {
        // If pending loader just ran and we're on home, show welcome after load.
        window.addEventListener("load", function () {
          var page2 = document.body ? document.body.getAttribute("data-page") : "";
          if (page2 === "home") maybeWelcome();
        });
      }

    })();
  
