/* Ramara Hub — client-side search + category rendering. No build step, no tracking. */
(function () {
  "use strict";

  var KB = null;
  var BASE = document.body.getAttribute("data-base") || "";

  function fetchKB(cb) {
    if (KB) return cb(KB);
    fetch(BASE + "data/kb.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { KB = data; cb(KB); })
      .catch(function () {
        var el = document.getElementById("results");
        if (el) el.innerHTML = '<div class="no-result"><strong>Search is unavailable right now.</strong> Call the Township at 705-484-5374 (Mon–Fri 9–4:30).</div>';
      });
  }

  function norm(s) { return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " "); }

  var STOP = {};
  ("a an and are as at be but by can could did do does for from get has have how i if in is it me my of on or our should so that the their there they this to was we what when where which who why will with would you your").split(" ").forEach(function (w) { STOP[w] = true; });

  function words(s) { return norm(s).split(/\s+/).filter(Boolean); }

  // A term hits a word if the word starts with it (so "run" matches "running",
  // "goose" doesn't match "good"). No substring matches — "ran" must not hit "grant".
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

  function score(entry, terms) {
    var meaningful = terms.filter(function (t) { return t.length >= 2 && !STOP[t]; });
    if (!meaningful.length) return 0;
    var qw = words(entry.q + " " + (entry.keywords || ""));
    var aw = words(entry.a + " " + entry.cat);
    return hitCount(meaningful, qw) * 3 + hitCount(meaningful, aw);
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

  function noResult(q) {
    return '<div class="no-result"><strong>No confident answer for that yet.</strong> ' +
      'This site never guesses. Call the Township of Ramara at <strong>705-484-5374</strong> ' +
      "(Mon–Fri 9 a.m.–4:30 p.m.) or use the official " +
      '<a href="https://v4.citywidesolutions.com/csr/ramara/" target="_blank" rel="noopener">Report a Concern portal ↗</a>. ' +
      "Your question helps us improve — more answers are added every week.</div>";
  }

  function doSearch(q) {
    var out = document.getElementById("results");
    if (!out) return;
    if (!q || q.trim().length < 2) { out.innerHTML = ""; return; }
    fetchKB(function (kb) {
      var terms = norm(q).split(/\s+/).filter(Boolean);
      var scored = kb.entries
        .map(function (e) { return { e: e, s: score(e, terms) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 6);
      if (!scored.length) { out.innerHTML = noResult(q); return; }
      out.innerHTML = scored.map(function (x) { return renderEntry(x.e); }).join("");
    });
  }

  function initSearch() {
    var input = document.getElementById("q");
    if (!input) return;
    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      var v = input.value;
      timer = setTimeout(function () { doSearch(v); }, 220);
    });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); doSearch(input.value); }
    });
  }

  // Tiles expand in place: click a topic -> grid is replaced by that topic's
  // answers with an "All topics" button to go back. Deep-linkable via #cat=.
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
      var m = (window.location.hash || "").match(/cat=([a-z-]+)/) ||
              (window.location.search || "").match(/cat=([a-z-]+)/);
      if (m) renderCategoryView(holder, kb, m[1], false);
      else renderTileGrid(holder, kb);
    });
  }

  function initBackToTop() {
    var b = document.createElement("button");
    b.type = "button";
    b.id = "toTop";
    b.textContent = "↑ Back to top";
    b.setAttribute("aria-label", "Back to top");
    document.body.appendChild(b);
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    window.addEventListener("scroll", function () {
      b.className = window.scrollY > 500 ? "show" : "";
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSearch();
    initTiles();
    initBackToTop();
  });
})();
