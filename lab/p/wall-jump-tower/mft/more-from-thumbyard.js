/* More from Thumbyard - the web panel (plain JS, no build step, palette C).
 *
 *   <script src="mft/more-from-thumbyard.js"></script>
 *   await MFT.load("mft/products.json", { from: "date-ninja", base: "mft/" });
 *   if (MFT.available()) settingsRow.hidden = false;      // hide the Settings entry when the list is empty
 *   settingsRow.onclick = () => MFT.show();               // only ever from a tap; never on a timer or at launch
 *
 * Opening a product, in this order:
 *   iOS app      window.webkit.messageHandlers.mft  -> MoreFromThumbyard.swift shows SKStoreProductViewController
 *   Android app  window.MFTAndroid.open(pkg, ref)   -> the app opens the Play page (README, Android web view)
 *   browser      the product's App Store page in a new tab (with ct=)
 * On Android only products with play_live true are listed. Kids-directed apps get enabled:false from build.py and
 * the panel never opens. Options: { from, base, theme: "light"|"dark"|null, logo: "<url of the mark>"|null }.
 */
(function () {
  "use strict";
  var TIMES = String.fromCharCode(215);   // the close mark, kept out of the source so the file stays ASCII
  // Layout from Mobbin references (README, "Design references"): Jira Cloud "Discover more" sheet (inset grouped
  // card, icon + name + one line + capsule Get), App Store "More by" rows (separator inset to the text column, tinted
  // Get capsule), Locket "Choose service" sheet (grabber, plain header), Apple Games dark lists (dark rows).
  var CSS = [
    ".mft-root{--mft-primary:#6E8E2E;--mft-ink:#2A231C;--mft-paper:#FFF8EC;",
    "--mft-sheet:#F5ECDD;--mft-card:var(--mft-paper);--mft-fg:var(--mft-ink);--mft-muted:rgba(42,35,28,.6);",
    "--mft-line:rgba(42,35,28,.1);--mft-grab:rgba(42,35,28,.18);--mft-btn:rgba(42,35,28,.06);",
    "--mft-get-bg:rgba(110,142,46,.16);--mft-get-fg:#4E6A1C;--mft-yard:var(--mft-primary);--mft-scrim:rgba(30,26,21,.4);",
    "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;",
    "font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}",
    ".mft-root[data-theme=dark]{--mft-sheet:#16130F;--mft-card:#1E1A15;--mft-fg:var(--mft-paper);",
    "--mft-muted:rgba(255,248,236,.58);--mft-line:rgba(255,248,236,.09);--mft-grab:rgba(255,248,236,.22);",
    "--mft-btn:rgba(255,248,236,.08);--mft-get-bg:rgba(110,142,46,.24);--mft-get-fg:#A3BF63;--mft-yard:#8DAA4A;",
    "--mft-scrim:rgba(0,0,0,.56)}",
    "@media (min-width:640px){.mft-root{align-items:center}}",
    ".mft-scrim{position:absolute;inset:0;background:var(--mft-scrim);opacity:0;transition:opacity .2s}",
    ".mft-root.mft-in .mft-scrim{opacity:1}",
    ".mft-sheet{position:relative;width:100%;max-width:420px;max-height:86vh;overflow:auto;background:var(--mft-sheet);",
    "color:var(--mft-fg);border:1px solid var(--mft-line);border-bottom:0;border-radius:16px 16px 0 0;",
    "padding:8px 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box;",
    "transform:translateY(24px);opacity:0;transition:transform .22s ease,opacity .22s ease}",
    "@media (min-width:640px){.mft-sheet{border-bottom:1px solid var(--mft-line);border-radius:16px;padding:16px}",
    ".mft-grab{display:none}}",
    ".mft-root.mft-in .mft-sheet{transform:none;opacity:1}",
    ".mft-sheet:focus{outline:none}",
    ".mft-grab{width:36px;height:5px;border-radius:3px;background:var(--mft-grab);margin:0 auto 10px}",
    ".mft-head{display:flex;align-items:center;gap:10px;padding:4px 4px 14px}",
    ".mft-logo{width:28px;height:28px;border-radius:8px;flex:none;object-fit:contain}",
    ".mft-logo[hidden]{display:none}",
    ".mft-title{flex:1;min-width:0;margin:0;font-size:20px;line-height:1.2;font-weight:700;letter-spacing:-.015em}",
    ".mft-title span{font-weight:500;color:var(--mft-muted)}",
    ".mft-title i{font-style:normal;color:var(--mft-yard)}",
    ".mft-close{flex:none;width:30px;height:30px;border-radius:15px;border:0;background:var(--mft-btn);",
    "color:var(--mft-muted);font:inherit;font-size:18px;line-height:1;cursor:pointer;display:grid;place-items:center}",
    ".mft-list{list-style:none;margin:0;padding:0 0 0 14px;background:var(--mft-card);border:1px solid var(--mft-line);",
    "border-radius:12px;overflow:hidden}",
    ".mft-row{display:flex;align-items:center;gap:12px;padding:0}",
    ".mft-icon{width:52px;height:52px;border-radius:12px;flex:none;object-fit:cover;background:var(--mft-btn);",
    "box-shadow:inset 0 0 0 .5px var(--mft-line)}",
    ".mft-letter{display:grid;place-items:center;font-size:22px;font-weight:700;color:var(--mft-paper);background:var(--mft-primary)}",
    ".mft-body{flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:12px 14px 12px 0;min-height:52px}",
    ".mft-row+.mft-row .mft-body{border-top:1px solid var(--mft-line)}",
    ".mft-text{flex:1;min-width:0}",
    ".mft-name{font-size:16px;font-weight:600;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".mft-line{font-size:13px;line-height:1.3;color:var(--mft-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".mft-get{flex:none;min-width:68px;height:28px;padding:0 14px;border-radius:14px;border:0;background:var(--mft-get-bg);",
    "color:var(--mft-get-fg);font:inherit;font-size:14px;font-weight:700;cursor:pointer}",
    ".mft-get:active,.mft-close:active{opacity:.6}",
    ".mft-get:focus-visible,.mft-close:focus-visible{outline:2px solid var(--mft-primary);outline-offset:2px}",
    "@media (prefers-reduced-motion:reduce){.mft-scrim,.mft-sheet{transition:none}}"
  ].join("");

  var state = { doc: null, from: null, base: "", theme: null, logo: null, root: null };

  function isAndroid() { return /Android/i.test(navigator.userAgent || ""); }
  function hasIOSBridge() {
    return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mft);
  }
  function products() {
    if (!state.doc || state.doc.enabled === false) return [];
    return (state.doc.products || []).filter(function (p) {
      if (p.id === state.from) return false;
      if (isAndroid()) return !!(p.play_live && p.android_package);
      return !!p.app_store_id;
    });
  }
  function token(p) { return String(p.ct || "mft-<from-app>").replace("<from-app>", state.from || "web"); }

  function open(p) {
    var ct = token(p);
    if (hasIOSBridge()) {
      window.webkit.messageHandlers.mft.postMessage({ open: p.app_store_id, ct: ct });
    } else if (isAndroid() && window.MFTAndroid && window.MFTAndroid.open) {
      window.MFTAndroid.open(p.android_package, "utm_source=" + (state.from || "web") + "&utm_campaign=" + ct);
    } else if (isAndroid()) {
      window.open("https://play.google.com/store/apps/details?id=" + encodeURIComponent(p.android_package) +
        "&referrer=" + encodeURIComponent("utm_source=" + (state.from || "web") + "&utm_campaign=" + ct), "_blank");
    } else if (p.app_store_url) {
      window.open(p.app_store_url + "?ct=" + encodeURIComponent(ct), "_blank", "noopener");
    }
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function icon(p) {
    var img = el("img", "mft-icon");
    img.alt = "";
    img.decoding = "async";
    var tries = [state.base && p.icon ? state.base + p.icon : null, p.icon_url].filter(Boolean);
    function next() {
      var src = tries.shift();
      if (src) { img.src = src; return; }
      var letter = el("div", "mft-icon mft-letter", (p.name || "?").charAt(0).toUpperCase());
      if (img.parentNode) img.parentNode.replaceChild(letter, img);
    }
    img.onerror = next;
    next();
    return img;
  }

  function theme() {
    if (state.theme) return state.theme;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function hide() {
    var r = state.root;
    if (!r) return;
    r.classList.remove("mft-in");
    document.removeEventListener("keydown", onKey, true);
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 220);
    state.root = null;
  }
  function onKey(e) { if (e.key === "Escape") hide(); }

  function show() {
    var list = products();
    if (!list.length || state.root) return false;
    if (!document.getElementById("mft-css")) {
      var st = el("style"); st.id = "mft-css"; st.textContent = CSS; document.head.appendChild(st);
    }
    var root = el("div", "mft-root");
    root.setAttribute("data-theme", theme());
    var scrim = el("div", "mft-scrim");
    scrim.onclick = hide;
    var sheet = el("div", "mft-sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "More from Thumbyard");
    sheet.tabIndex = -1;

    sheet.appendChild(el("div", "mft-grab"));
    var head = el("div", "mft-head");
    var logo = el("img", "mft-logo");          // the slot for the Thumbyard mark; hidden until a logo is set
    logo.alt = "";
    logo.setAttribute("data-slot", "logo");
    var logoSrc = state.logo || (state.doc.brand && state.doc.brand.logo);
    if (logoSrc) logo.src = logoSrc; else logo.hidden = true;
    var title = el("h2", "mft-title");
    title.appendChild(el("span", null, "More from "));
    title.appendChild(document.createTextNode("Thumb"));
    title.appendChild(el("i", null, "yard"));
    var close = el("button", "mft-close", TIMES);
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.onclick = hide;
    head.appendChild(logo); head.appendChild(title); head.appendChild(close);
    sheet.appendChild(head);

    var ul = el("ul", "mft-list");
    list.forEach(function (p) {
      var li = el("li", "mft-row");
      li.appendChild(icon(p));
      var body = el("div", "mft-body");
      var t = el("div", "mft-text");
      t.appendChild(el("div", "mft-name", p.name));
      t.appendChild(el("div", "mft-line", p.line));
      body.appendChild(t);
      var get = el("button", "mft-get", "Get");
      get.type = "button";
      get.setAttribute("aria-label", "Get " + p.name);
      get.onclick = function () { open(p); };
      body.appendChild(get);
      li.appendChild(body);
      ul.appendChild(li);
    });
    sheet.appendChild(ul);
    root.appendChild(scrim); root.appendChild(sheet);
    document.body.appendChild(root);
    state.root = root;
    document.addEventListener("keydown", onKey, true);
    requestAnimationFrame(function () { root.classList.add("mft-in"); sheet.focus({ preventScroll: true }); });
    return true;
  }

  window.MFT = {
    load: function (src, opts) {
      opts = opts || {};
      state.from = opts.from || null;
      state.base = opts.base || "";
      state.theme = opts.theme || null;
      state.logo = opts.logo || null;
      if (src && typeof src === "object") { state.doc = src; return Promise.resolve(state.doc); }
      if (window.__mft) { state.doc = window.__mft; return Promise.resolve(state.doc); }  // injected by the app
      return fetch(src).then(function (r) { return r.json(); }).then(function (d) { state.doc = d; return d; })
        .catch(function () { state.doc = null; return null; });
    },
    available: function () { return products().length > 0; },
    show: show,
    hide: hide
  };
})();
