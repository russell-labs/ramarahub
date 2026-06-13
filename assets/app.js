/* Ramara Hub — chat-style ask, category browsing, back-to-top. No build step, no tracking. */
(function () {
  "use strict";

  var KB = null;
  var BASE = document.body.getAttribute("data-base") || "";

  function fetchKB(cb) {
    if (KB) return cb(KB);
    fetch(BASE + "data/kb.json")
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

  /* ---------------- Backend (Supabase REST, insert-only) ---------------- */

  var SB = {
    url: "https://pchdckgdrigevxfjwgom.supabase.co",
    key: "sb_publishable_-4wN6ifFXmn10ZAwqwN_Nw_0TvL_usD",
    jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaGRja2dkcmlnZXZ4Zmp3Z29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzI5NzYsImV4cCI6MjA5NjgwODk3Nn0.l4NEaRtHzI9C8d2XZV7ZDDhxBN3CuX84K6Wj-gA4AZc"
  };
  SB.ok = SB.url.indexOf("http") === 0;

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

  // Ask the LLM answer engine (activates once the Gemini key is configured server-side).
  function askLLM(q, picks) {
    if (!SB.ok) return Promise.resolve(null);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 9000);
    return fetch(SB.url + "/functions/v1/hub-answer", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SB.jwt, "apikey": SB.jwt },
      body: JSON.stringify({ q: q, picks: picks.map(function (p) { return { q: p.q, a: p.a, phone: p.phone || null }; }) })
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) return null;
      return r.json().then(function (d) { return d && d.answer ? d : null; });
    }).catch(function () { clearTimeout(timer); return null; });
  }

  function sbInsert(table, row) {
    if (!SB.ok) return Promise.resolve(false);
    return fetch(SB.url + "/rest/v1/" + table, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SB.key,
        "Authorization": "Bearer " + SB.key,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(row)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function logQuestion(q, verdict, topId, answer) {
    sbInsert("questions", { q: q.slice(0, 500), verdict: verdict, top_entry: topId || null, answer: (answer || "").slice(0, 4000) });
  }

  // Tier 2: full-text search across the township record (899 ramara.ca pages, bylaws, reports).
  // Tries all-words first; falls back to any-word so "how many pets can a resident have" still hits.
  function searchDocuments(q) {
    if (!SB.ok) return Promise.resolve([]);
    var terms = meaningfulTerms(q).slice(0, 6);
    if (!terms.length) return Promise.resolve([]);
    function query(t) {
      var url = SB.url + "/rest/v1/documents?select=title,source_url,doc_type" +
        "&fts=wfts(english)." + encodeURIComponent(t) + "&limit=3";
      return fetch(url, { headers: { "apikey": SB.key, "Authorization": "Bearer " + SB.key } })
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    }
    return query(terms.join(" ")).then(function (docs) {
      if (docs.length || terms.length < 2) return docs;
      return query(terms.join(" OR "));
    });
  }

  function docResultsHtml(docs) {
    var labels = { bylaw: "Bylaw", news: "Township news", "staff-report": "Report/plan", other: "Township page", minutes: "Minutes", agenda: "Agenda" };
    return '<p class="lead-line" style="margin-top:0.8rem">From the township record (verify with the source):</p>' +
      docs.map(function (d) {
        return '<p class="doc-hit"><span class="pill">' + (labels[d.doc_type] || "Document") + "</span> " +
          '<a href="' + d.source_url + '" target="_blank" rel="noopener">' + escapeHtml(d.title) + " ↗</a></p>";
      }).join("");
  }

  /* ---------------- Chat ---------------- */

  function bubble(cls, html) {
    var d = document.createElement("div");
    d.className = "msg " + cls;
    d.innerHTML = html;
    return d;
  }

  function followupFormHtml(q, context) {
    return '<form class="followup" data-q="' + escapeHtml(q).replace(/"/g, "&quot;") + '">' +
      '<p class="fu-line">' + context + "</p>" +
      '<div class="fu-row"><input type="email" name="email" placeholder="Your email" required>' +
      '<button type="submit">Get my answer</button></div>' +
      '<input type="text" name="note" placeholder="Anything to add? (optional)">' +
      "</form>";
  }

  function feedbackBarHtml(q) {
    return '<div class="fb-bar" data-q="' + escapeHtml(q).replace(/"/g, "&quot;") + '">' +
      '<span>Did this answer it?</span>' +
      '<button type="button" class="fb-yes" aria-label="Yes, helpful">👍</button>' +
      '<button type="button" class="fb-no" aria-label="No, could be better">👎</button>' +
      "</div>";
  }

  function initChatDelegation(chat) {
    chat.addEventListener("click", function (ev) {
      var yes = ev.target.closest(".fb-yes");
      var no = ev.target.closest(".fb-no");
      if (!yes && !no) return;
      var bar = ev.target.closest(".fb-bar");
      var q = bar.getAttribute("data-q");
      if (yes) {
        sbInsert("feedback", { q: q, helpful: true });
        bar.innerHTML = "<span>Glad it helped. 🤝</span>";
      } else {
        sbInsert("feedback", { q: q, helpful: false });
        bar.outerHTML = followupFormHtml(q,
          "Sorry it fell short. Leave your email — <strong>Russell Cole will get back to you</strong> with a better answer, and your question goes on the research list.");
      }
    });
    chat.addEventListener("submit", function (ev) {
      var form = ev.target.closest(".followup");
      if (!form) return;
      ev.preventDefault();
      var email = form.email.value.trim();
      var note = form.note ? form.note.value.trim() : "";
      var q = form.getAttribute("data-q");
      sbInsert("feedback", { q: q, helpful: false, email: email, comment: note || null }).then(function (ok) {
        form.outerHTML = ok || SB.ok
          ? '<p class="fu-done">Got it — you\'ll hear back soon. Your question just made the Hub better. 🤝</p>'
          : '<p class="fu-done">Couldn\'t send right now — email <a href="mailto:russellcolevop@gmail.com?subject=' + encodeURIComponent("Ramara Hub question: " + q) + '">russellcolevop@gmail.com</a> instead.</p>';
      });
    });
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
        '<a href="https://v4.citywidesolutions.com/csr/ramara/" target="_blank" rel="noopener">Report a Concern portal ↗</a>.</p>' +
        followupFormHtml(q, "Or leave your email — <strong>Russell Cole will get back to you</strong> with the answer, and it gets added to the Hub so the next neighbour finds it instantly.");
      // Even on a fallback verdict, hand the answer engine the 3 best-scoring KB
      // entries. The server prompt treats them as "may or may not be relevant," so
      // a near-miss KB entry can still seed a useful answer instead of a dead end.
      return { html: fb, verdict: "fallback", topId: null, showFeedback: false,
               picks: ranked.slice(0, 3).map(function (x) { return x.e; }) };
    }

    // Keep only results in the same league as the top hit, max 3.
    var picks = ranked.filter(function (x) {
      return x.s >= Math.max(5, top.s * 0.6) && x.cov >= 0.34;
    }).slice(0, 3);

    var lead = confident
      ? "<p class=\"lead-line\">Here's what the record says:</p>"
      : "<p class=\"lead-line\">I don't have an exact answer to that, but this is the closest sourced information I have:</p>";

    var html = lead + picks.map(function (x) { return renderEntry(x.e); }).join("");
    return { html: html, verdict: confident ? "confident" : "related", topId: top.e.id, showFeedback: true,
             picks: picks.map(function (x) { return x.e; }) };
  }

  function llmHtml(d) {
    var html = '<p class="lead-line">' + escapeHtml(d.answer).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>") + "</p>";
    if (d.sources && d.sources.length) {
      html += '<p class="after-line">Sources from the township record (verify with the document):</p>' +
        d.sources.map(function (s) {
          return '<p class="doc-hit"><a href="' + s.url + '" target="_blank" rel="noopener">' + escapeHtml(s.title) + " ↗</a></p>";
        }).join("");
    }
    return html;
  }

  function askQuestion(q, chat, input) {
    chat.appendChild(bubble("user", escapeHtml(q)));
    var think = bubble("hub thinking",
      '<span class="community-pulse" aria-hidden="true">🤝</span> Checking the township record…');
    chat.appendChild(think);
    think.scrollIntoView({ behavior: "smooth", block: "nearest" });
    fetchKB(function (kb) {
      var ans = composeAnswer(kb, q);
      // Try the LLM engine first; it gracefully returns null until the key is configured.
      var llmP = askLLM(q, ans.picks || []);
      var docsP = ans.verdict === "confident" ? Promise.resolve([]) : searchDocuments(q);
      var delay = new Promise(function (res) { setTimeout(res, 800 + Math.random() * 400); });
      Promise.all([llmP, docsP, delay]).then(function (r) {
        var llm = r[0], docs = r[1] || [];
        think.remove();
        var html;
        if (llm) {
          logQuestion(q, "llm", ans.topId, llm.answer);
          html = llmHtml(llm) + feedbackBarHtml(q);
        } else {
          logQuestion(q, ans.verdict, ans.topId, ans.verdict === "fallback" ? "" : (ans.picks && ans.picks[0] ? ans.picks[0].a : ""));
          html = ans.html + (docs.length ? docResultsHtml(docs) : "") +
            (ans.showFeedback ? feedbackBarHtml(q) : "");
        }
        var reply = bubble("hub", html);
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
    initChatDelegation(chat);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = (input.value || "").trim();
      if (q.length < 2) return;
      input.value = "";
      askQuestion(q, chat, input);
    });
  }

  /* ---------------- Mailing list signup ---------------- */

  // Newsletter list lives in Buttondown (double opt-in + unsubscribe handling);
  // a backup copy is written to our own DB so a subscriber is never lost.
  var BUTTONDOWN_SUBSCRIBE = "https://buttondown.com/api/emails/embed-subscribe/russellcole143";
  function bindSubscribe(form, source, withTopics) {
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = form.email.value.trim();
      if (!email) return;
      // Add to Buttondown — fire-and-forget, opaque response (no-cors), urlencoded like the native embed form.
      try {
        var body = new URLSearchParams();
        body.append("email", email);
        fetch(BUTTONDOWN_SUBSCRIBE, { method: "POST", mode: "no-cors", body: body });
      } catch (e) {}
      var topics = withTopics && form.topics ? form.topics.value.trim() : "";
      function done(ok) {
        form.outerHTML = ok || SB.ok
          ? '<p class="fu-done">You\'re on the list. If a confirmation email arrives, click it to finish. No spam, unsubscribe anytime. 🤝</p>'
          : '<p class="fu-done">Couldn\'t sign you up right now — email <a href="mailto:russellcolevop@gmail.com?subject=Ramara%20Hub%20updates">russellcolevop@gmail.com</a> and we\'ll add you.</p>';
      }
      // Backup to our DB; this confirmed write also drives the inline confirmation.
      var row = { email: email, source: source };
      if (topics) row.topics = topics;
      sbInsert("subscribers", row).then(function (ok) {
        // If the insert failed and we sent a topics field the DB may not have yet,
        // retry without it so the email is never lost.
        if (!ok && topics) sbInsert("subscribers", { email: email, source: source }).then(done);
        else done(ok);
      });
    });
  }
  function initSubscribe() {
    bindSubscribe(document.getElementById("subscribeForm"), "home");
    bindSubscribe(document.getElementById("footerSubscribe"), "footer");
    bindSubscribe(document.getElementById("newsSubscribeForm"), "news", true);
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
    fetch(BASE + "data/asks.json")
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
    fetch(BASE + "data/great.json")
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

  var DOC_LABELS = { bylaw: "Bylaw", news: "Township news", "staff-report": "Report/plan", other: "Township page", minutes: "Minutes", agenda: "Agenda" };

  function initDocuments() {
    var holder = document.getElementById("docs");
    if (!holder) return;
    var searchInput = document.getElementById("docSearch");
    var filterSel = document.getElementById("docFilter");
    var countEl = document.getElementById("docCount");
    var moreBtn = document.getElementById("docMore");
    var PAGE = 50;
    var state = { mode: "browse", filter: "", offset: 0, total: null };

    function setCount(t) { if (countEl) countEl.textContent = t || ""; }
    function hideMore() { if (moreBtn) moreBtn.hidden = true; }
    function showError() {
      holder.innerHTML = '<p class="muted">The record is temporarily unavailable — try again shortly.</p>';
      setCount(""); hideMore();
    }

    function docRow(d, withSnippet) {
      var pill = '<span class="pill">' + (DOC_LABELS[d.doc_type] || "Document") + "</span>";
      var date = '<span class="doc-date">' + (d.doc_date ? escapeHtml(dateHuman(d.doc_date)) : "date not recorded") + "</span>";
      // Only allow http(s) sources; escape into the attribute (same allowlist pattern as great photos).
      var href = /^https?:\/\//i.test(d.source_url || "") ? d.source_url : "#";
      var html = '<div class="doc-row"><p class="doc-hit">' + pill +
        '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(d.title || "Untitled") + " ↗</a> " + date + "</p>";
      // snippet is ts_headline output: escape everything, then re-allow only the <b>/</b> highlight tags.
      if (withSnippet && d.snippet) {
        var snip = escapeHtml(d.snippet).replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>");
        html += '<p class="doc-snippet">' + snip + "</p>";
      }
      return html + "</div>";
    }

    function renderBrowse(reset) {
      if (reset) { holder.innerHTML = '<p class="muted">Loading the record…</p>'; hideMore(); }
      var url = SB.url + "/rest/v1/documents?select=title,source_url,doc_type,doc_date" +
        "&order=doc_date.desc.nullslast&limit=" + PAGE + "&offset=" + state.offset;
      if (state.filter) url += "&doc_type=eq." + encodeURIComponent(state.filter);
      fetch(url, { headers: { apikey: SB.key, Authorization: "Bearer " + SB.key, Prefer: "count=exact" } })
        .then(function (r) {
          var cr = r.headers.get("Content-Range");
          if (cr && cr.indexOf("/") >= 0) {
            var tot = cr.split("/")[1];
            if (tot && tot !== "*") state.total = parseInt(tot, 10);
          }
          if (!r.ok) return Promise.reject();
          return r.json();
        })
        .then(function (docs) {
          docs = docs || [];
          if (reset) holder.innerHTML = "";
          if (reset && !docs.length) { holder.innerHTML = '<p class="muted">No documents found for this filter.</p>'; setCount(""); hideMore(); return; }
          holder.insertAdjacentHTML("beforeend", docs.map(function (d) { return docRow(d, false); }).join(""));
          state.offset += docs.length;
          setCount(state.total != null ? "Showing " + state.offset + " of " + state.total : "Showing " + state.offset);
          if (moreBtn) moreBtn.hidden = !(state.total != null && state.offset < state.total);
        })
        .catch(showError);
    }

    function renderSearch(q) {
      holder.innerHTML = '<p class="muted">Searching…</p>'; setCount(""); hideMore();
      fetch(SB.url + "/rest/v1/rpc/search_docs", {
        method: "POST",
        headers: { apikey: SB.key, Authorization: "Bearer " + SB.key, "Content-Type": "application/json" },
        body: JSON.stringify({ q: q, cnt: 25 })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (docs) {
          docs = docs || [];
          if (!docs.length) {
            holder.innerHTML = '<p class="muted">No matches for “' + escapeHtml(q) + '”. Try fewer or different words.</p>';
            setCount(""); return;
          }
          // Render in the order the RPC returns (recency-ranked) — do not re-sort.
          holder.innerHTML = docs.map(function (d) { return docRow(d, true); }).join("");
          setCount("Showing " + docs.length + " best matches for “" + escapeHtml(q) + "”");
        })
        .catch(showError);
    }

    function refresh() {
      var q = searchInput ? searchInput.value.trim() : "";
      if (q) { state.mode = "search"; renderSearch(q); }
      else { state.mode = "browse"; state.offset = 0; renderBrowse(true); }
    }

    if (filterSel) filterSel.addEventListener("change", function () {
      state.filter = filterSel.value;
      if (searchInput) searchInput.value = "";
      state.mode = "browse"; state.offset = 0;
      renderBrowse(true);
    });
    if (searchInput) {
      var deb;
      searchInput.addEventListener("input", function () { clearTimeout(deb); deb = setTimeout(refresh, 300); });
      searchInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); clearTimeout(deb); refresh(); } });
    }
    if (moreBtn) moreBtn.addEventListener("click", function () { renderBrowse(false); });

    renderBrowse(true);
  }

  /* ---------------- Latest from the Township (news feed) ---------------- */

  // RPC latest_news(cnt) returns { title, source_url, doc_date, teaser }, newest first.
  function fetchLatestNews(cnt) {
    if (!SB.ok) return Promise.reject();
    return fetch(SB.url + "/rest/v1/rpc/latest_news", {
      method: "POST",
      headers: { apikey: SB.key, Authorization: "Bearer " + SB.key, "Content-Type": "application/json" },
      body: JSON.stringify({ cnt: cnt })
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(); });
  }

  // News uses its own .news-item card markup (NOT the shared .doc-row, which The Record
  // and chat answers also render). The whole card links to the official ramara.ca source.
  function newsRowHtml(item, withTeaser) {
    var dateLabel = item.doc_date ? dateHuman(item.doc_date) : "Date not recorded";
    // Only allow http(s) sources; escape the url into the attribute (same allowlist as the record).
    var href = /^https?:\/\//i.test(item.source_url || "") ? item.source_url : "#";
    var html = '<a class="news-item" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="news-date">' + escapeHtml(dateLabel) + "</span>" +
      "<h3>" + escapeHtml(item.title || "Untitled") + "</h3>";
    if (withTeaser && item.teaser) html += '<p class="news-teaser">' + escapeHtml(item.teaser) + "</p>";
    if (withTeaser) html += '<p class="news-src">Read it on ramara.ca ↗</p>';
    return html + "</a>";
  }

  function renderNewsInto(holder, cnt, withTeaser, errLink) {
    fetchLatestNews(cnt)
      .then(function (items) {
        items = items || [];
        if (!items.length) { holder.innerHTML = '<p class="news-empty">No township posts yet — check back soon.</p>'; return; }
        holder.innerHTML = '<div class="news-feed' + (withTeaser ? "" : " teaser") + '">' +
          items.map(function (it) { return newsRowHtml(it, withTeaser); }).join("") + "</div>";
      })
      .catch(function () {
        holder.innerHTML = '<p class="news-error">Couldn\'t load township news right now — ' + errLink + "</p>";
      });
  }

  function initNews() {
    var full = document.getElementById("news");
    if (full) renderNewsInto(full, 30, true,
      'read it directly at <a href="https://www.ramara.ca/news/" target="_blank" rel="noopener">ramara.ca/news ↗</a>.');
    var teaser = document.getElementById("newsTeaser");
    if (teaser) renderNewsInto(teaser, 3, false,
      'see <a href="news.html">all township news</a>.');
  }

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
    initTiles();
    initAsks();
    initGreat();
    initDocuments();
    initNews();
    initAvatar();
    initBackToTop();
    initSubscribe();
    initMenu();
  });
})();
