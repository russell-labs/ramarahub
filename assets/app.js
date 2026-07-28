/* Ramara Hub — chat-style ask, category browsing, back-to-top. No build step, no tracking. */
(function () {
  "use strict";

  var KB = null;
  var BASE = document.body.getAttribute("data-base") || "";

  function fetchKB(cb) {
    if (KB) return cb(KB);
    fetch(BASE + "data/kb.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) { KB = data; cb(KB); })
      .catch(function () { cb(null); });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  // "2026-06-12" (or an ISO timestamp) -> "June 12, 2026". Parsed by parts to dodge timezone drift.
  function dateHuman(d) {
    if (!d) return "";
    var p = String(d).slice(0, 10).split("-");
    if (p.length < 3) return String(d);
    var mo = parseInt(p[1], 10), day = parseInt(p[2], 10);
    if (!mo || !day || mo < 1 || mo > 12) return String(d);
    return MONTHS[mo - 1] + " " + day + ", " + p[0];
  }

  function norm(s) { return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " "); }

  var STOP = {};
  ("a an and any about also are as at be been being but by can could did do does for from get got has have having how i if in into is it its just me my of on or our out really should so some that the their there they this to was we what when where which who why will with would you your wondering").split(" ").forEach(function (w) { STOP[w] = true; });

  // Ramara place names: they help RANK results but don't count against confidence —
  // "can I have an STR in Lagoon City" is an STR question, not a Lagoon City question.
  var PLACES = {};
  ("ramara lagoon city brechin atherley washago udney sebright uptergrove gamebridge bayshore village longford fawn floral talbot").split(" ").forEach(function (w) { PLACES[w] = true; });

  function words(s) { return norm(s).split(/\s+/).filter(Boolean); }

  // A term hits a word if one starts with the other (so "run" matches "running",
  // "converted" matches "convert"). No mid-word substrings — "ran" must not hit "grant".
  function hitCount(terms, wordList) {
    var n = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      for (var j = 0; j < wordList.length; j++) {
        if (wordList[j].indexOf(t) === 0 || (t.length > 4 && t.indexOf(wordList[j]) === 0)) { n++; break; }
      }
    }
    return n;
  }

  function meaningfulTerms(q) {
    return words(q).filter(function (t) { return t.length >= 2 && !STOP[t]; });
  }

  function scoreEntry(entry, terms) {
    if (!terms.length) return { s: 0, cov: 0 };
    var qw = words(entry.q + " " + (entry.keywords || ""));
    var aw = words(entry.a + " " + entry.cat);
    var qHits = hitCount(terms, qw);
    var aHits = hitCount(terms, aw);
    // cov counts ONLY question+keyword coverage: answer-body matches add score but
    // never confidence (prevents long answers from "confidently" matching everything).
    // Place names are excluded from the denominator: they rank, they don't gate.
    var core = terms.filter(function (t) { return !PLACES[t]; });
    var coreHits = hitCount(core, qw);
    var denom = core.length || terms.length;
    return { s: qHits * 3 + aHits, cov: (core.length ? coreHits : qHits) / denom };
  }

  function linkHref(url) {
    if (/^https?:\/\//.test(url)) return url;
    return BASE + url;
  }

  function renderEntry(e) {
    var html = '<div class="result-card">';
    html += "<h3>" + e.q + "</h3>";
    html += "<p>" + e.a + "</p>";
    if (e.phone) html += '<p class="phone">📞 ' + e.phone + "</p>";
    if (e.links && e.links.length) {
      html += '<p class="links">';
      e.links.forEach(function (l) {
        var ext = /^https?:\/\//.test(l.url);
        html += '<a href="' + linkHref(l.url) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + l.label + (ext ? " ↗" : "") + "</a>";
      });
      html += "</p>";
    }
    html += "</div>";
    return html;
  }

  /* ---------------- LiveAvatar config (experimental HeyGen AI avatar) ----------------
     Single switch for the whole feature. Runs only through election day; pull anytime.
       • enabled:false  -> the section is removed cleanly from every page (no empty box).
       • To turn ON:     set enabled:true AND paste the HeyGen embed URL into embedUrl.
       • To edit copy:    change heading / intro / disclaimer below (plain strings).
       • To remove for good: set enabled:false (done), or delete this block + initAvatar()
                            + the <section id="liveAvatar"> mount in index.html.
     ------------------------------------------------------------------------------------ */
  var AVATAR = {
    enabled: false,                 // <-- master toggle. OFF by default.
    embedUrl: "",                   // <-- PASTE HEYGEN EMBED URL HERE (the iframe src, https://...). Leave "" until ready.
    heading: "Ask Russell — AI avatar (experimental)",
    intro: "An experimental AI avatar of Russell that answers common questions about Ramara. It's a beta — always verify anything important against the sourced answers and official township channels.",
    disclaimer: "This is an experimental AI avatar and may be removed at any time."
  };

  /* ---------------- Chat ---------------- */

  function bubble(cls, html) {
    var d = document.createElement("div");
    d.className = "msg " + cls;
    d.innerHTML = html;
    return d;
  }

  function composeAnswer(kb, q) {
    if (!kb) {
      return { html: "<p>Search is unavailable right now. Call the Township at <strong>705-484-5374</strong> (Mon–Fri 9–4:30).</p>", verdict: "error", topId: null, showFeedback: false };
    }
    var terms = meaningfulTerms(q);
    var ranked = kb.entries.map(function (e) {
      var sc = scoreEntry(e, terms);
      return { e: e, s: sc.s, cov: sc.cov };
    }).sort(function (a, b) { return b.s - a.s; });

    var top = ranked[0];
    // Confident: top hit covers most of the meaningful words in the question.
    // Score floor scales down for short questions ("when is the election" = 1 term).
    var floor = Math.min(6, Math.max(4, terms.length * 2));
    var confident = top && top.cov >= 0.62 && top.s >= floor;
    var related = top && !confident && top.cov >= 0.34 && top.s >= 4;

    if (!confident && !related) {
      var fb = "<p>I don't have a solid, sourced answer for that yet — and this site never guesses. " +
        "It only publishes what clears <a href=\"" + BASE + "about.html#standard\">our standard</a>: every claim tied to a credible source. When there isn't one, it says so rather than guess. " +
        "For something urgent, call the Township of Ramara at <strong>705-484-5374</strong> (Mon–Fri 9–4:30) or use the " +
        '<a href="https://v4.citywidesolutions.com/csr/ramara/" target="_blank" rel="noopener">Report a Concern portal ↗</a>.</p>';
      return { html: fb, verdict: "fallback", topId: null };
    }

    // Keep only results in the same league as the top hit, max 3.
    var picks = ranked.filter(function (x) {
      return x.s >= Math.max(5, top.s * 0.6) && x.cov >= 0.34;
    }).slice(0, 3);

    var lead = confident
      ? "<p class=\"lead-line\">Here's what the record says:</p>"
      : "<p class=\"lead-line\">I don't have an exact answer to that, but this is the closest sourced information I have:</p>";

    var html = lead + picks.map(function (x) { return renderEntry(x.e); }).join("");
    return { html: html, verdict: confident ? "confident" : "related", topId: top.e.id };
  }

  function askQuestion(q, chat, input) {
    chat.appendChild(bubble("user", escapeHtml(q)));
    var think = bubble("hub thinking",
      '<span class="community-pulse" aria-hidden="true">🤝</span> Searching checked-in answers…');
    chat.appendChild(think);
    think.scrollIntoView({ behavior: "smooth", block: "nearest" });
    fetchKB(function (kb) {
      var ans = composeAnswer(kb, q);
      var delay = new Promise(function (res) { setTimeout(res, 800 + Math.random() * 400); });
      delay.then(function () {
        think.remove();
        var reply = bubble("hub", ans.html);
        chat.appendChild(reply);
        reply.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (input) input.focus();
      });
    });
  }

  function initChat() {
    var form = document.getElementById("askForm");
    if (!form) return;
    var input = document.getElementById("q");
    var chat = document.getElementById("chat");
    // "Clear answers" appears only once there's a conversation; empties the thread.
    var clearBtn = document.getElementById("clearChat");
    function syncClear() { if (clearBtn) clearBtn.hidden = !chat.children.length; }
    if (clearBtn) clearBtn.addEventListener("click", function () {
      chat.innerHTML = "";
      syncClear();
      if (input) input.focus();
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = (input.value || "").trim();
      if (q.length < 2) return;
      input.value = "";
      askQuestion(q, chat, input);
      syncClear();
    });

    // Tap-to-ask suggested questions: route straight through the engine.
    var suggest = document.getElementById("askSuggest");
    if (suggest) suggest.addEventListener("click", function (ev) {
      var chip = ev.target.closest("[data-ask]");
      if (!chip) return;
      input.value = "";
      askQuestion(chip.getAttribute("data-ask"), chat, input);
      syncClear();
    });
  }

  /* ---------------- Popular questions (progressive enhancement) ----------------
     Real, curated questions ship in the HTML so the chips always work. If the
     backend exposes a `popular_questions(cnt)` RPC — top asked questions returned
     display-ready (clean canonical text, NOT raw user input) — we swap in the live
     most-asked list. If the RPC is absent or empty, the curated chips stay. */
  function initPopularQuestions() { /* Curated chips are static in index.html. */ }

  /* ---------------- Mailing list signup ---------------- */

  function initSubscribe() {
    ["subscribeForm", "footerSubscribe", "newsSubscribeForm"].forEach(function (id) {
      var form = document.getElementById(id);
      if (!form) return;
      var note = document.createElement("p");
      note.className = "fu-done";
      note.textContent = "Email updates are unavailable while Ramara Hub is operating as a read-only reference site.";
      form.parentNode.replaceChild(note, form);
    });
  }

  /* ---------------- Topic tiles (in-place expand) ---------------- */

  function renderTileGrid(holder, kb) {
    holder.innerHTML = '<div class="tiles">' + kb.categories.map(function (c) {
      return '<button type="button" class="tile" data-cat="' + c.id + '"><span class="icon">' + c.icon + "</span>" + c.label + "</button>";
    }).join("") + "</div>";
    Array.prototype.forEach.call(holder.querySelectorAll(".tile"), function (btn) {
      btn.addEventListener("click", function () {
        history.replaceState(null, "", "#cat=" + btn.getAttribute("data-cat"));
        renderCategoryView(holder, kb, btn.getAttribute("data-cat"), true);
      });
    });
  }

  function renderCategoryView(holder, kb, catId, scroll) {
    var c = kb.categories.filter(function (x) { return x.id === catId; })[0];
    if (!c) return renderTileGrid(holder, kb);
    var entries = kb.entries.filter(function (e) { return e.cat === catId; });
    holder.innerHTML =
      '<button type="button" class="back-link" id="backToTopics">← All topics</button>' +
      '<h2 class="section" style="margin-top:0.6rem">' + c.icon + " " + c.label + "</h2>" +
      (entries.map(renderEntry).join("") ||
        '<div class="no-result">Nothing here yet — call the Township at 705-484-5374.</div>');
    document.getElementById("backToTopics").addEventListener("click", function () {
      history.replaceState(null, "", window.location.pathname);
      renderTileGrid(holder, kb);
    });
    if (scroll) window.scrollTo({ top: Math.max(holder.getBoundingClientRect().top + window.scrollY - 70, 0), behavior: "smooth" });
  }

  function initTiles() {
    var holder = document.getElementById("tiles");
    if (!holder) return;
    fetchKB(function (kb) {
      if (!kb) { holder.innerHTML = '<div class="no-result">Topics are unavailable right now — call 705-484-5374.</div>'; return; }
      var m = (window.location.hash || "").match(/cat=([a-z-]+)/) ||
              (window.location.search || "").match(/cat=([a-z-]+)/);
      if (m) renderCategoryView(holder, kb, m[1], false);
      else renderTileGrid(holder, kb);
    });
  }

  /* ---------------- Asked the Township (accordion log) ---------------- */

  var ASK_STATUS = {
    awaiting: "Awaiting reply",
    answered: "Answered",
    "follow-up": "Follow-up",
    closed: "Closed"
  };

  function askItemHtml(a, idx) {
    var status = ASK_STATUS[a.status] ? a.status : "awaiting";
    var label = ASK_STATUS[status];
    var updates = (a.updates && a.updates.length)
      ? '<ul class="ask-timeline">' + a.updates.map(function (u) {
          return '<li><span class="tl-date">' + escapeHtml(u.date) + "</span>" + escapeHtml(u.note) + "</li>";
        }).join("") + "</ul>"
      : '<p class="ask-empty">No reply logged yet — we update this the day the township responds.</p>';
    return '<div class="ask" data-idx="' + idx + '">' +
      '<button type="button" class="ask-head" aria-expanded="false">' +
        '<span class="ask-date">' + escapeHtml(a.date_asked) + "</span>" +
        '<span class="ask-subject">' + escapeHtml(a.subject) + "</span>" +
        '<span class="status-pill status-' + status + '">' + label + "</span>" +
        '<span class="ask-caret" aria-hidden="true">›</span>' +
      "</button>" +
      '<div class="ask-body" hidden>' +
        '<p class="ask-meta">Asked ' + escapeHtml(a.date_asked) + " · by " + escapeHtml(a.channel) +
          " · to " + escapeHtml(a.to) + "</p>" +
        "<p>" + escapeHtml(a.summary) + "</p>" +
        updates +
      "</div>" +
    "</div>";
  }

  function initAsks() {
    var holder = document.getElementById("asks");
    if (!holder) return;
    fetch(BASE + "data/asks.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var asks = (data && data.asks) || [];
        if (!asks.length) {
          holder.innerHTML = '<p class="muted">No questions logged yet — check back soon.</p>';
          return;
        }
        holder.innerHTML = asks.map(askItemHtml).join("");
        holder.addEventListener("click", function (ev) {
          var head = ev.target.closest(".ask-head");
          if (!head) return;
          var card = head.closest(".ask");
          var body = card.querySelector(".ask-body");
          var open = card.classList.toggle("open");
          body.hidden = !open;
          head.setAttribute("aria-expanded", open ? "true" : "false");
        });
      })
      .catch(function () {
        holder.innerHTML = '<p class="muted">Couldn\'t load the log right now — please try again later.</p>';
      });
  }

  /* ---------------- Great things about Ramara ---------------- */

  function greatTileHtml(it) {
    // Curator-supplied links/thumbs, but still allowlist http(s) and escape into the attribute.
    var href = /^https?:\/\//i.test(it.link || "") ? it.link : "#";
    var title = escapeHtml(it.title || "");
    var badge = it.media === "video" ? '<span class="play-badge" aria-hidden="true">▶</span>' : "";

    var thumb;
    var hasThumb = it.thumb && String(it.thumb).trim();
    if (hasThumb) {
      var src = /^https?:\/\//i.test(it.thumb) ? it.thumb : BASE + it.thumb;
      thumb = '<img src="' + escapeHtml(src) + '" alt="' + title + '" loading="lazy">' + badge;
    } else {
      // Missing image never breaks the grid: branded civic-green placeholder with the title.
      thumb = '<div class="great-placeholder"><span class="ph-title">' + title + "</span></div>" + badge;
    }

    var meta = "<h3>" + title + "</h3>";
    if (it.description) meta += '<p class="great-desc">' + escapeHtml(it.description) + "</p>";
    var sub = [];
    if (it.credit) sub.push(escapeHtml(it.credit));
    if (it.date) sub.push(escapeHtml(dateHuman(it.date)));
    if (sub.length) meta += '<p class="great-sub">' + sub.join(" · ") + "</p>";

    return '<a class="great-tile" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' +
      '<div class="great-thumb">' + thumb + "</div>" +
      '<div class="great-meta">' + meta + "</div>" +
    "</a>";
  }

  function initGreat() {
    var holder = document.getElementById("great");
    if (!holder) return;
    fetch(BASE + "data/great.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var intro = document.getElementById("greatIntro");
        if (intro && data && data.intro) intro.textContent = data.intro;
        var items = (data && data.items) || [];
        if (!items.length) {
          holder.innerHTML = '<p class="muted">Be the first — send us something good.</p>';
          return;
        }
        items = items.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
        holder.innerHTML = items.map(greatTileHtml).join("");
      })
      .catch(function () {
        holder.innerHTML = '<p class="muted">Couldn\'t load these right now — please try again later.</p>';
      });
  }

  /* ---------------- The Record (public document library) ---------------- */

  function initDocuments() {
    var holder = document.getElementById("docs");
    if (!holder) return;
    var controls = document.querySelector(".doc-controls");
    if (controls) controls.hidden = true;
    var count = document.getElementById("docCount");
    if (count) count.textContent = "";
    var more = document.getElementById("docMore");
    if (more) more.hidden = true;
    holder.innerHTML = '<div class="callout callout-teal"><strong>The Hub\'s searchable document index is unavailable in read-only mode.</strong> Read current records directly on the <a href="https://www.ramara.ca/municipal-office/" target="_blank" rel="noopener">Township website ↗</a> and <a href="https://ramara.civicweb.net/portal/" target="_blank" rel="noopener">Meeting Portal ↗</a>.</div>';
  }

  /* ---------------- Latest from the Township (news feed) ---------------- */

  function initNews() {
    var full = document.getElementById("news");
    if (full) full.innerHTML = '<div class="callout callout-teal"><strong>The live news feed is unavailable in read-only mode.</strong> Read current notices at <a href="https://www.ramara.ca/news/" target="_blank" rel="noopener">ramara.ca/news ↗</a>.</div>';
    var teaser = document.getElementById("newsTeaser");
    if (teaser) teaser.innerHTML = '<p class="muted">The live feed is unavailable in read-only mode. <a href="https://www.ramara.ca/news/" target="_blank" rel="noopener">Read current Township news ↗</a></p>';
  }

  /* ---------------- What's new (changelog, DB-driven) ---------------- */

  function initChangelog() { /* The checked-in historical archive is the complete view. */ }

  /* ---------------- LiveAvatar (experimental AI avatar) ---------------- */

  function initAvatar() {
    var mount = document.getElementById("liveAvatar");
    if (!mount) return;
    // OFF (or accidentally left on a page without the flag): remove the mount entirely
    // so there's no empty container, no broken spacing, and no dead links.
    if (!AVATAR.enabled) { mount.parentNode && mount.parentNode.removeChild(mount); return; }
    // Owner-configured URL: only allow https(s); anything else is treated as "not set yet".
    var src = /^https?:\/\//i.test(AVATAR.embedUrl || "") ? AVATAR.embedUrl : "";
    var inner = src
      ? '<div class="avatar-frame"><iframe src="' + escapeHtml(src) +
          '" allow="microphone; camera; autoplay; fullscreen" title="Experimental AI avatar of Russell" loading="lazy"></iframe></div>'
      : '<div class="avatar-frame"><div class="avatar-placeholder">Avatar is switched on but no HeyGen embed URL is set yet — paste it into <code>AVATAR.embedUrl</code> in app.js.</div></div>';
    mount.innerHTML =
      '<section class="avatar-section">' +
        '<span class="pill">Experimental</span>' +
        "<h2>" + escapeHtml(AVATAR.heading) + "</h2>" +
        '<p class="avatar-intro">' + escapeHtml(AVATAR.intro) + "</p>" +
        '<p class="avatar-disclaimer">' + escapeHtml(AVATAR.disclaimer) + "</p>" +
        inner +
      "</section>";
    mount.hidden = false;
  }

  /* ---------------- Issue brief: back link + "on this page" TOC ---------------- */

  function initBriefToc() {
    var p = location.pathname;
    if (!/\/briefs\/[^\/]+\.html$/.test(p) || /\/briefs\/index\.html$/.test(p)) return;
    var art = document.querySelector("article.brief");
    if (!art) return;

    if (!document.getElementById("briefNavCss")) {
      var st = document.createElement("style");
      st.id = "briefNavCss";
      st.textContent =
        ".brief-back{display:inline-block;margin:0 0 12px;font-size:.9rem;color:#185FA5;text-decoration:none;font-weight:600}" +
        ".brief-back:hover{text-decoration:underline}" +
        ".brief-toc{margin:14px 0 24px;padding:12px 16px;background:#f6f9fb;border:1px solid #e3eaf0;border-radius:10px;font-size:.9rem;line-height:1.9}" +
        ".brief-toc b{color:#0E3D59;margin-right:4px}" +
        ".brief-toc a{color:#185FA5;text-decoration:none}" +
        ".brief-toc a:hover{text-decoration:underline}";
      document.head.appendChild(st);
    }

    if (!art.querySelector(".brief-back")) {
      var back = document.createElement("a");
      back.className = "brief-back";
      back.href = "index.html";
      back.textContent = "← All issue briefs";
      art.insertBefore(back, art.firstChild);
    }

    var heads = art.querySelectorAll(":scope > h2");
    if (heads.length < 3) return;
    var used = {}, links = [];
    Array.prototype.forEach.call(heads, function (h) {
      var id = h.id;
      if (!id) {
        id = (h.textContent || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "section";
        while (used[id]) id = id + "-x";
        h.id = id;
      }
      used[id] = true;
      var a = document.createElement("a");
      a.href = "#" + id;
      a.textContent = (h.textContent || "").trim();
      links.push(a);
    });
    var toc = document.createElement("nav");
    toc.className = "brief-toc";
    toc.setAttribute("aria-label", "On this page");
    var label = document.createElement("b");
    label.textContent = "On this page:";
    toc.appendChild(label);
    links.forEach(function (a, i) {
      toc.appendChild(document.createTextNode(" "));
      toc.appendChild(a);
      if (i < links.length - 1) toc.appendChild(document.createTextNode(" ·"));
    });
    var updated = art.querySelector(".updated");
    if (updated && updated.parentNode) updated.parentNode.insertBefore(toc, updated.nextSibling);
  }

  /* ---------------- Back to top ---------------- */

  function initBackToTop() {
    var b = document.createElement("button");
    b.type = "button";
    b.id = "toTop";
    b.textContent = "↑ Back to top";
    b.setAttribute("aria-label", "Back to top");
    document.body.appendChild(b);
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    function update() { b.className = window.scrollY > 400 ? "show" : ""; }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("hashchange", function () { setTimeout(update, 50); });
    update();
  }

  /* ---------------- Mobile menu ---------------- */

  function initMenu() {
    var btn = document.getElementById("menuBtn");
    var nav = document.getElementById("siteNav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "✕ Close" : "☰ Menu";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initChat();
    initPopularQuestions();
    initTiles();
    initAsks();
    initGreat();
    initDocuments();
    initNews();
    initChangelog();
    initBriefToc();
    initAvatar();
    initBackToTop();
    initSubscribe();
    initMenu();
  });
})();
