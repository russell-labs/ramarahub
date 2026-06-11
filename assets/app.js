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
  ("a an and any about also are as at be been being but by can could did do does for from get got has have having how i if in into is it its just me my of on or our out really should so some that the their there they this to was we what when where which who why will with would you your").split(" ").forEach(function (w) { STOP[w] = true; });

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
    return { s: qHits * 3 + aHits, cov: Math.max(qHits, aHits) / terms.length };
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

  /* ---------------- Chat ---------------- */

  function bubble(cls, html) {
    var d = document.createElement("div");
    d.className = "msg " + cls;
    d.innerHTML = html;
    return d;
  }

  var FALLBACK_HTML =
    "I don't have a solid, sourced answer for that yet — and this site never guesses. " +
    "Call the Township of Ramara at <strong>705-484-5374</strong> (Mon–Fri 9–4:30), use the " +
    '<a href="https://v4.citywidesolutions.com/csr/ramara/" target="_blank" rel="noopener">Report a Concern portal ↗</a>, ' +
    'or email <a href="mailto:russellcolevop@gmail.com">the Hub team</a> — your question helps us add what\'s missing.';

  function composeAnswer(kb, q) {
    if (!kb) {
      return "<p>Search is unavailable right now. Call the Township at <strong>705-484-5374</strong> (Mon–Fri 9–4:30).</p>";
    }
    var terms = meaningfulTerms(q);
    var ranked = kb.entries.map(function (e) {
      var sc = scoreEntry(e, terms);
      return { e: e, s: sc.s, cov: sc.cov };
    }).sort(function (a, b) { return b.s - a.s; });

    var top = ranked[0];
    // Confident: top hit covers most of the meaningful words in the question.
    var confident = top && top.cov >= 0.62 && top.s >= 6;
    var related = top && !confident && top.cov >= 0.34 && top.s >= 5;

    if (!confident && !related) return "<p>" + FALLBACK_HTML + "</p>";

    // Keep only results in the same league as the top hit, max 3.
    var picks = ranked.filter(function (x) {
      return x.s >= Math.max(5, top.s * 0.6) && x.cov >= 0.34;
    }).slice(0, 3);

    var lead = confident
      ? "<p class=\"lead-line\">Here's what the record says:</p>"
      : "<p class=\"lead-line\">I don't have an exact answer to that, but this is the closest sourced information I have:</p>";

    var html = lead + picks.map(function (x) { return renderEntry(x.e); }).join("");
    if (!confident) {
      html += '<p class="after-line">Not what you needed? Call the Township at <strong>705-484-5374</strong> or ' +
              '<a href="mailto:russellcolevop@gmail.com">tell the Hub team</a> so we can add it.</p>';
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
      setTimeout(function () {
        think.remove();
        var reply = bubble("hub", composeAnswer(kb, q));
        chat.appendChild(reply);
        reply.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (input) input.focus();
      }, 800 + Math.random() * 400);
    });
  }

  function initChat() {
    var form = document.getElementById("askForm");
    if (!form) return;
    var input = document.getElementById("q");
    var chat = document.getElementById("chat");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = (input.value || "").trim();
      if (q.length < 2) return;
      input.value = "";
      askQuestion(q, chat, input);
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
  });
})();
