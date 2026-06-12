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

  function logQuestion(q, verdict, topId) {
    sbInsert("questions", { q: q.slice(0, 500), verdict: verdict, top_entry: topId || null });
  }

  // Tier 2: full-text search across the township record (899 ramara.ca pages, bylaws, reports)
  function searchDocuments(q) {
    if (!SB.ok) return Promise.resolve([]);
    var terms = meaningfulTerms(q).slice(0, 6).join(" ");
    if (!terms) return Promise.resolve([]);
    var url = SB.url + "/rest/v1/documents?select=title,source_url,doc_type" +
      "&fts=wfts(english)." + encodeURIComponent(terms) + "&limit=3";
    return fetch(url, { headers: { "apikey": SB.key, "Authorization": "Bearer " + SB.key } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
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
        "For something urgent, call the Township of Ramara at <strong>705-484-5374</strong> (Mon–Fri 9–4:30) or use the " +
        '<a href="https://v4.citywidesolutions.com/csr/ramara/" target="_blank" rel="noopener">Report a Concern portal ↗</a>.</p>' +
        followupFormHtml(q, "Or leave your email — <strong>Russell Cole will get back to you</strong> with the answer, and it gets added to the Hub so the next neighbour finds it instantly.");
      return { html: fb, verdict: "fallback", topId: null, showFeedback: false, picks: [] };
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
          logQuestion(q, "llm", ans.topId);
          html = llmHtml(llm) + feedbackBarHtml(q);
        } else {
          logQuestion(q, ans.verdict, ans.topId);
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

  function initSubscribe() {
    var form = document.getElementById("subscribeForm");
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = form.email.value.trim();
      if (!email) return;
      sbInsert("subscribers", { email: email, source: "home" }).then(function (ok) {
        form.outerHTML = ok || SB.ok
          ? '<p class="fu-done">You\'re on the list. Expect plain, useful updates — no spam, unsubscribe anytime. 🤝</p>'
          : '<p class="fu-done">Couldn\'t sign you up right now — email <a href="mailto:russellcolevop@gmail.com?subject=Ramara%20Hub%20updates">russellcolevop@gmail.com</a> and we\'ll add you.</p>';
      });
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

  document.addEventListener("DOMContentLoaded", function () {
    initChat();
    initTiles();
    initBackToTop();
    initSubscribe();
  });
})();
