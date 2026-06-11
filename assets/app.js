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

  function score(entry, terms) {
    var hay = norm(entry.q) + " " + norm(entry.a) + " " + norm(entry.keywords || "") + " " + norm(entry.cat);
    var qhay = norm(entry.q) + " " + norm(entry.keywords || "");
    var s = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (!t || t.length < 2) continue;
      if (qhay.indexOf(t) !== -1) s += 3;
      else if (hay.indexOf(t) !== -1) s += 1;
    }
    return s;
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

  function initTiles() {
    var holder = document.getElementById("tiles");
    if (!holder) return;
    fetchKB(function (kb) {
      holder.innerHTML = kb.categories.map(function (c) {
        return '<a class="tile" href="' + BASE + 'browse.html?cat=' + c.id + '"><span class="icon">' + c.icon + "</span>" + c.label + "</a>";
      }).join("");
    });
  }

  function initBrowse() {
    var holder = document.getElementById("browse");
    if (!holder) return;
    var params = new URLSearchParams(window.location.search);
    var cat = params.get("cat");
    fetchKB(function (kb) {
      var c = kb.categories.filter(function (x) { return x.id === cat; })[0];
      var title = document.getElementById("browse-title");
      if (!c) {
        if (title) title.textContent = "Browse everything";
        holder.innerHTML = kb.categories.map(function (cc) {
          var inner = kb.entries.filter(function (e) { return e.cat === cc.id; }).map(renderEntry).join("");
          return '<h2 class="section">' + cc.icon + " " + cc.label + "</h2>" + inner;
        }).join("");
        return;
      }
      if (title) title.textContent = c.icon + " " + c.label;
      var entries = kb.entries.filter(function (e) { return e.cat === cat; });
      holder.innerHTML = entries.map(renderEntry).join("") ||
        '<div class="no-result">Nothing here yet — call the Township at 705-484-5374.</div>';
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSearch();
    initTiles();
    initBrowse();
  });
})();
