
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

      var aboutBtn = $("aboutBtn");
      var desktopEl = $("desktop");
      var findBtn = $("findBtn");
      var searchBarEl = $("searchBar");
      var searchInput = $("searchInput");
      var searchResultsEl = $("searchResults");
      var clockEl = $("menubarClock");

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
            { type: "image", src: assetPath("icons/apple folder.png"), alt: "Apple Folder", size: "sm", noFrame: true },
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
        okBtn.addEventListener("click", function (e) { e.stopPropagation(); closePopup(popup); });

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
        if (!popup || !hintEl || !Array.isArray(hints) || !hints.length) return;
        var order = [];
        var idx = 0;

        function shuffleHints() {
          order = hints.slice();
          for (var i = order.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = order[i];
            order[i] = order[j];
            order[j] = tmp;
          }
        }

        shuffleHints();
        hintEl.textContent = order[idx] || "";

        var t = setInterval(function () {
          idx += 1;
          if (idx >= order.length) {
            shuffleHints();
            idx = 0;
          }
          hintEl.textContent = order[idx] || "";
        }, 3000);
        addPopupTimer(popup, "interval", t);
      }

      function startSnakeGame() {
        var existing = popupKeyRegistry["snake-game"];
        if (existing) closePopup(existing);

        var cell = 20;
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
                  "<div class=\"snake-frame\">" +
                    "<canvas id=\"" + canvasId + "\" class=\"snake-canvas\" width=\"" + width + "\" height=\"" + height + "\"></canvas>" +
                  "</div>" +
                  "<div id=\"" + statusId + "\" class=\"snake-status\">Score: 0</div>" +
                  "<div class=\"snake-actions\">" +
                    "<button type=\"button\" class=\"popup-ok snake-btn\" data-action=\"yes\">Yes</button>" +
                    "<button type=\"button\" class=\"popup-ok snake-btn\" data-action=\"no\">No</button>" +
                  "</div>" +
                "</div>"
            }
          ]
        });
        if (!popup || !popup.el) return;

        var canvas = popup.el.querySelector("#" + canvasId);
        var statusEl = popup.el.querySelector("#" + statusId);
        var actionsEl = popup.el.querySelector(".snake-actions");
        var yesBtn = popup.el.querySelector(".snake-actions [data-action=\"yes\"]");
        var noBtn = popup.el.querySelector(".snake-actions [data-action=\"no\"]");
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
          if (statusEl) statusEl.textContent = "Score: " + score + "  Best: " + highScore + "  Play again?";
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
            if (statusEl) statusEl.textContent = "Score: " + score;
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
          if (statusEl) statusEl.textContent = "Score: 0";
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
          blocks.push({ type: "image", src: opts.icon || assetPath("images/earth.gif"), alt: "", size: "sm" });
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

        // Close when the page is fully loaded
        window.addEventListener("load", function onL() {
          window.removeEventListener("load", onL);
          try { closePopup(popup); } catch (e) {}
          if (typeof opts.onDone === "function") opts.onDone();
        });
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

      if (popupOverlay) {
        popupOverlay.addEventListener("mousedown", function (e) {
          if (e.target !== popupOverlay) return;
          var activePopup = getActivePopup();
          if (activePopup && activePopup.closeOnBackdrop) closePopup(activePopup);
        });
      }

      function openAboutPopup() {
        openPopup({
          title: "About Me",
          okText: "Done",
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
        // Format: {"_note":"...","items":[{"name":"J-Mac","kind":"folder","href":"pages/j-mac.html","icon":"icons/folder-160.png"}, ...]}
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

        // If popup is open, close only the active one.
        var activePopup = getActivePopup();
        if (activePopup) {
          e.preventDefault();
          closePopup(activePopup);
          return;
        }

        // If Find is open, Enter activates the selected row.
        // For Recents (empty query), Enter only works after the user selects a recent via arrows/click.
        if (searchBarEl && searchBarEl.style.display === "flex") {
          e.preventDefault();
          setTimeout(function () { activateTopSuggestion(); }, 0);
          return;
        }

        // Otherwise: no special Enter behavior
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
      var trashOpen = false;
      var trashPopup = null;
      var trashBinEl = null;
      var trashIconEl = document.querySelector(".icon[data-kind=\"trash\"]");
      var lastGrid = null;
      var lastViewportW = window.innerWidth || 0;
      var lastViewportH = window.innerHeight || 0;

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
            if (trashOpen && trashBinEl) {
              moveIconToBin(icon);
            } else {
              moveIconToDesktop(icon);
              var pos = trashedIcons[key];
              if (pos && typeof pos.x === "number") icon.style.left = pos.x + "px";
              if (pos && typeof pos.y === "number") icon.style.top = pos.y + "px";
            }
          } else {
            icon.classList.remove("in-trash");
            moveIconToDesktop(icon);
          }
        });

        if (trashOpen && trashBinEl) positionTrashIcons();
      }

      function positionTrashIcons() {
        if (!trashBinEl) return;
        var iconW = trashBinEl.querySelector(".icon") ? trashBinEl.querySelector(".icon").offsetWidth : 99;
        var iconH = trashBinEl.querySelector(".icon") ? trashBinEl.querySelector(".icon").offsetHeight : 120;
        var gap = 8;
        var binW = trashBinEl.clientWidth;
        var cols = Math.max(1, Math.floor((binW + gap) / (iconW + gap)));
        var baseX = Math.max(10, Math.round((binW - (cols * iconW + (cols - 1) * gap)) / 2));
        var baseY = 10;
        var idx = 0;
        icons.forEach(function (icon) {
          if (!icon.classList.contains("in-trash")) return;
          var col = idx % cols;
          var row = Math.floor(idx / cols);
          icon.style.left = (baseX + (col * (iconW + gap))) + "px";
          icon.style.top = (baseY + (row * (iconH + gap))) + "px";
          idx += 1;
        });
      }

      function moveIconToBin(icon) {
        if (!trashBinEl || !icon || icon.parentNode === trashBinEl) return;
        trashBinEl.appendChild(icon);
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

      function toggleTrash(open) {
        var shouldOpen = (typeof open === "boolean") ? open : !trashOpen;
        if (shouldOpen && trashPopup) return;
        if (!shouldOpen && trashPopup) {
          closePopup(trashPopup);
          return;
        }

        if (shouldOpen) {
          var binId = "trashBin_" + Math.random().toString(16).slice(2);
          trashPopup = openPopup({
            title: "Trash",
            key: "trash-popup",
            okText: "Done",
            content: [
              { type: "embed", html: "<div class=\"trash-bin\" id=\"" + binId + "\"></div>" }
            ]
          });
          if (!trashPopup || !trashPopup.el) return;
          trashPopup.el.classList.add("trash-popup");
          trashOpen = true;
          trashBinEl = trashPopup.el.querySelector("#" + binId);
          applyTrashState();

          if (!trashPopup.cleanup) trashPopup.cleanup = [];
          trashPopup.cleanup.push(function () {
            trashOpen = false;
            trashBinEl = null;
            trashPopup = null;
            if (trashIconEl) trashIconEl.classList.remove("trash-hover");
            applyTrashState();
          });
        }
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
        if (trashOpen) positionTrashIcons();
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
        if (trashBinEl && icon.parentNode === trashBinEl) return;
        var gx = lastGrid.x;
        var gy = lastGrid.y;
        if (!(gx > 0 && gy > 0)) return;
        var col = Math.round((icon.offsetLeft - lastGrid.offsetX) / gx);
        var row = Math.round((icon.offsetTop - lastGrid.offsetY) / gy);
        col = Math.max(0, col);
        row = Math.max(0, row);
        icon.style.left = Math.round(lastGrid.offsetX + (col * gx)) + "px";
        icon.style.top = Math.round(lastGrid.offsetY + (row * gy)) + "px";
      }

      function updateTrashHover(icon) {
        if (!trashIconEl) return;
        var shouldHover = !!(icon && !isTrashIcon(icon) && isOverTrash(icon));
        trashIconEl.classList.toggle("trash-hover", shouldHover);
      }

      function handleTrashDrop(icon) {
        if (!icon || isTrashIcon(icon)) return;
        if (trashIconEl) trashIconEl.classList.remove("trash-hover");
        if (trashOpen && trashPopup && trashBinEl && icon.classList.contains("in-trash")) {
          var binRect = trashBinEl.getBoundingClientRect();
          var iconRect = icon.getBoundingClientRect();
          var cx = iconRect.left + (iconRect.width / 2);
          var cy = iconRect.top + (iconRect.height / 2);
          var insideBin = (cx >= binRect.left && cx <= binRect.right && cy >= binRect.top && cy <= binRect.bottom);
          if (!insideBin) {
            moveIconToDesktop(icon, iconRect);
            restoreIcon(icon);
          }
          return;
        }

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

        label.style.fontSize = "";
        var maxH = label.clientHeight;
        var maxW = label.clientWidth;
        var size = parseFloat(window.getComputedStyle(label).fontSize) || 8;
        var minSize = 6;

        for (var i = 0; i < 10; i++) {
          if ((label.scrollWidth <= maxW && label.scrollHeight <= maxH) || size <= minSize) break;
          size = Math.max(minSize, size - 1);
          label.style.fontSize = size + "px";
        }
      }

      function adjustIconLabels() {
        icons.forEach(function (icon) { fitIconLabel(icon); });
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

        // Image preview (desktop files)
        if (kind === "file" && imgEl && imgEl.src && /\.(png|jpg|jpeg|gif|webp)$/i.test(imgEl.src)) {
            openPopup({
              title: icon.querySelector("span") ? icon.querySelector("span").textContent : "Image",
              key: "file:" + (imgEl.getAttribute("src") || imgEl.src || ""),
              content: [
                { type: "image", src: imgEl.src, alt: "Preview", size: "xl" }
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

        if (kind === "music") {
          var blocks = [];
          if (dataSpotify) blocks.push({ type: "embed", html: dataSpotify });
          if (dataApple) blocks.push({ type: "embed", html: dataApple });
          if (!blocks.length) {
            blocks.push({ type: "text", role: "body", size: "md", align: "left", text: "No embeds provided." });
          }

          openPopup({
            title: name || "Music",
            key: "music:" + (name || "track"),
            content: blocks
          });
          return;
        }

        if (kind === "trash") {
          toggleTrash();
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
                icon: assetPath("icons/folder-160.png")
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
        var gapX = mobile ? 6 : 8;
        var gapY = mobile ? 12 : 20;

        // Read actual icon dimensions (so CSS mobile overrides are honored)
        var iconW = icons[0].offsetWidth || 99;
        var iconH = icons[0].offsetHeight || 120;

        var gridX = (iconW + gapX) * 0.95;
        var gridY = (iconH + gapY) * 0.88;

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
        icon.addEventListener("mousedown", function (e) {
          e.preventDefault();

          startX = e.clientX;
          startY = e.clientY;
          activeIcon = icon;
          offX2 = e.clientX - icon.offsetLeft;
          offY2 = e.clientY - icon.offsetTop;

          possibleDrag = true;
          draggingIcon = false;

          clearSelections();
          icon.classList.add("selected");
        });

        icon.addEventListener("touchstart", function (e) {
          if (!isMobile()) return;
          var t = e.touches && e.touches[0];
          if (!t) return;

          startX = t.clientX;
          startY = t.clientY;
          activeIcon = icon;
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
  
