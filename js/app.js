// js/app.js
(function () {
    'use strict';
  
    function $(id) { return document.getElementById(id); }
    function isMobile() { return window.matchMedia && window.matchMedia('(max-width: 768px)').matches; }
  
    // ---------- Elements (safe if missing) ----------
    var desktopEl = $('desktop');
  
    var aboutBtn = $('aboutBtn');
    var findBtn = $('findBtn');
    var searchBarEl = $('searchBar');
    var searchInput = $('searchInput');
    var clockEl = $('menubarClock');
  
    var popupOverlay = $('popupOverlay');
    var popupWindow = $('popupWindow');
    var popupTitlebar = $('popupTitlebar');
    var popupClose = $('popupClose');
    var popupTitleEl = $('popupTitle');
    var popupBodyEl = $('popupBody');
    var popupCaptionEl = $('popupCaption');
    var popupOkBtn = $('popupOk');
  
    // ---------- Popup rendering ----------
    function renderPopupContent(content) {
      var wrap = document.createElement('div');
      wrap.className = 'popup-content';
  
      (content || []).forEach(function (block) {
        if (!block || !block.type) return;
  
        if (block.type === 'text') {
          var d = document.createElement('div');
          var size = block.size || 'md';
          var align = block.align || 'left';
          d.className = 'popup-text size-' + size + ' align-' + align;
          d.textContent = block.text || '';
          wrap.appendChild(d);
        }
      });
  
      return wrap;
    }
  
    function resetPopupPosition() {
      if (!popupWindow) return;
      popupWindow.style.left = '50%';
      popupWindow.style.top = '50%';
      popupWindow.style.transform = 'translate(-50%, -50%)';
    }
  
    function openPopup(opts) {
      opts = opts || {};
      if (!popupOverlay) return;
  
      if (!opts.preservePosition) resetPopupPosition();
  
      if (popupTitleEl) popupTitleEl.textContent = opts.title || 'Notice';
      if (popupCaptionEl) popupCaptionEl.textContent = opts.caption || '';
  
      if (popupBodyEl) {
        popupBodyEl.innerHTML = '';
        if (Array.isArray(opts.content)) {
          popupBodyEl.appendChild(renderPopupContent(opts.content));
        } else {
          popupBodyEl.textContent = (opts.text != null) ? String(opts.text) : '';
        }
      }
  
      var hasOk = (opts.okText != null);
      if (popupOkBtn) {
        if (hasOk) {
          popupOkBtn.textContent = String(opts.okText);
          popupOkBtn.style.display = 'inline-flex';
        } else {
          popupOkBtn.style.display = 'none';
        }
      }
      if (popupWindow) popupWindow.classList.toggle('has-ok', hasOk);
  
      popupOverlay.classList.add('show');
      popupOverlay.setAttribute('aria-hidden', 'false');
    }
  
    function closePopup() {
      if (!popupOverlay) return;
      popupOverlay.classList.remove('show');
      popupOverlay.setAttribute('aria-hidden', 'true');
      resetPopupPosition();
    }
  
    window.openPopup = openPopup;
    window.closePopup = closePopup;
  
    // ---------- Global About (ONE PLACE to edit forever) ----------
    function openAboutPopup() {
      openPopup({
        title: 'About',
        caption: 'Jordan A. McKenzie',
        okText: 'Enter',
        content: [
          { type: 'text', text: 'About This Portfolio', size: 'lg', align: 'center' },
          {
            type: 'text',
            size: 'md',
            align: 'left',
            text:
              'This site is a portfolio presented as a classic Macintosh desktop.\n\n' +
              'Click folders to explore projects and work.'
          }
        ]
      });
    }
  
    // ---------- About / Find bindings ----------
    if (aboutBtn) aboutBtn.addEventListener('click', function (e) { e.preventDefault(); openAboutPopup(); });
  
    function showSearch() {
      if (!searchBarEl) return;
      searchBarEl.style.display = 'flex';
      if (searchInput) searchInput.focus();
    }
    function hideSearch() {
      if (!searchBarEl) return;
      searchBarEl.style.display = 'none';
    }
    function toggleSearch() {
      if (!searchBarEl) return;
      if (searchBarEl.style.display === 'flex') hideSearch();
      else showSearch();
    }
  
    if (findBtn) findBtn.addEventListener('click', function (e) { e.preventDefault(); toggleSearch(); });
    if (searchInput) searchInput.addEventListener('blur', function () { hideSearch(); });
  
    // ---------- Popup controls ----------
    if (popupClose) popupClose.addEventListener('click', function (e) { e.stopPropagation(); closePopup(); });
    if (popupOkBtn) popupOkBtn.addEventListener('click', function (e) { e.stopPropagation(); closePopup(); });
  
    if (popupOverlay) {
      popupOverlay.addEventListener('mousedown', function (e) {
        if (e.target === popupOverlay) closePopup();
      });
    }
  
    // ---------- Draggable popup titlebar ----------
    (function bindPopupDrag() {
      if (!popupTitlebar || !popupWindow) return;
  
      var dragging = false;
      var offX = 0;
      var offY = 0;
  
      popupTitlebar.addEventListener('mousedown', function (e) {
        if (e.target && e.target.closest && e.target.closest('#popupClose')) return;
        e.preventDefault();
  
        var r = popupWindow.getBoundingClientRect();
        popupWindow.style.left = r.left + 'px';
        popupWindow.style.top = r.top + 'px';
        popupWindow.style.transform = 'none';
  
        dragging = true;
        offX = e.clientX - r.left;
        offY = e.clientY - r.top;
      });
  
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
  
        var r = popupWindow.getBoundingClientRect();
        var x = e.clientX - offX;
        var y = e.clientY - offY;
  
        var margin = 10;
        var maxX = window.innerWidth - r.width - margin;
        var maxY = window.innerHeight - r.height - margin;
  
        x = Math.max(margin, Math.min(maxX, x));
        y = Math.max(margin, Math.min(maxY, y));
  
        popupWindow.style.left = x + 'px';
        popupWindow.style.top = y + 'px';
      });
  
      document.addEventListener('mouseup', function () { dragging = false; });
  
      window.addEventListener('resize', function () {
        if (!popupWindow) return;
        if (popupWindow.style.transform && popupWindow.style.transform !== 'none') return;
  
        var r = popupWindow.getBoundingClientRect();
        var margin = 10;
        var x = Math.max(margin, Math.min(window.innerWidth - r.width - margin, r.left));
        var y = Math.max(margin, Math.min(window.innerHeight - r.height - margin, r.top));
        popupWindow.style.left = x + 'px';
        popupWindow.style.top = y + 'px';
      });
    })();
  
    // ---------- Clock ----------
    (function initClock() {
      if (!clockEl) return;
  
      function tick() {
        var now = new Date();
        var h = now.getHours();
        var m = now.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        var mm = (m < 10 ? '0' + m : '' + m);
        var colon = (now.getSeconds() % 2 === 0) ? ':' : ' ';
        clockEl.textContent = '' + h + colon + mm + ' ' + ampm;
      }
  
      tick();
      setInterval(tick, 1000);
    })();
  
    // ---------- Desktop icons: layout + select + drag + open on dblclick ----------
    var icons = Array.prototype.slice.call(document.querySelectorAll('.icon'));
  
    function layoutIcons() {
      if (!icons.length) return;
  
      var paddingLeft = 10;
      var paddingTop = 10;
      var gapX = 12;
      var gapY = 30;
      var iconW = 99;
      var iconH = 120;
  
      var x = paddingLeft;
      var y = paddingTop;
  
      icons.forEach(function (icon) {
        if (x + iconW > window.innerWidth - 10) {
          x = paddingLeft;
          y += iconH + gapY;
        }
        icon.style.left = x + 'px';
        icon.style.top = y + 'px';
        x += iconW + gapX;
      });
    }
  
    function clearSelections() { icons.forEach(function (i) { i.classList.remove('selected'); }); }
  
    var draggingIcon = false;
    var possibleDrag = false;
    var startX = 0, startY = 0;
    var offX2 = 0, offY2 = 0;
    var activeIcon = null;
    var threshold = 5;
  
    icons.forEach(function (icon) {
      icon.addEventListener('mousedown', function (e) {
        e.preventDefault();
  
        startX = e.clientX;
        startY = e.clientY;
        activeIcon = icon;
        offX2 = e.clientX - icon.offsetLeft;
        offY2 = e.clientY - icon.offsetTop;
  
        possibleDrag = true;
        draggingIcon = false;
  
        clearSelections();
        icon.classList.add('selected');
      });
  
      icon.addEventListener('click', function (e) {
        // Mac behavior: click selects (does NOT open)
        e.preventDefault();
        clearSelections();
        icon.classList.add('selected');
      });
  
      icon.addEventListener('dblclick', function (e) {
        e.preventDefault();
  
        // FILE OPEN
        if (icon.classList.contains('file')) {
          var file = icon.getAttribute('data-file') || '';
  
          if (file === 'example.txt') {
            openPopup({
              title: 'example.txt',
              caption: '',
              okText: 'Enter',
              content: [
                { type: 'text', size: 'lg', align: 'center', text: 'example.txt' },
                {
                  type: 'text',
                  size: 'md',
                  align: 'left',
                  text:
                    'This is an example text file inside the Architecture folder.\n\n' +
                    'Replace this with real notes, project links, or whatever you want.'
                }
              ]
            });
            return;
          }
  
          openPopup({
            title: file || 'File',
            okText: 'Enter',
            content: [{ type: 'text', size: 'md', align: 'left', text: 'No handler yet for this file.' }]
          });
          return;
        }
  
        // FOLDER / LINK OPEN
        var href = icon.getAttribute('href');
        if (href && href !== '#') window.location.href = href;
      });
    });
  
    document.addEventListener('mousemove', function (e) {
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
        activeIcon.style.left = x + 'px';
        activeIcon.style.top = y + 'px';
      }
    });
  
    document.addEventListener('mouseup', function () {
      possibleDrag = false;
      draggingIcon = false;
      if (activeIcon) activeIcon.style.zIndex = '';
      activeIcon = null;
    });
  
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.icon')) clearSelections();
    });
  
    window.addEventListener('resize', function () {
      if (!draggingIcon) layoutIcons();
    });
  
    layoutIcons();
    window.addEventListener('load', function () {
      layoutIcons();
      requestAnimationFrame(layoutIcons);
    });
  
    // ---------- Welcome (home only) ----------
    (function maybeWelcome() {
      var page = document.body ? document.body.getAttribute('data-page') : '';
      if (page !== 'home') return;
  
      // don’t do welcome on mobile
      if (isMobile()) return;
  
      openPopup({
        title: 'Welcome',
        caption: '',
        okText: 'Enter',
        content: [
          { type: 'text', text: 'WELCOME', size: 'xl', align: 'center' },
          {
            type: 'text',
            size: 'md',
            align: 'left',
            text:
              'This is a long placeholder welcome message intended to test scrolling behavior inside the popup window.\n\n' +
              'Replace this with your real introduction copy when you’re ready.'
          }
        ]
      });
    })();
  
  })();
  