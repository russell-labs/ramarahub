import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const textExtensions = new Set([".html", ".js", ".py", ".md"]);
const ignoredDirs = new Set([".git", "Outputs", "__pycache__"]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirs.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const textFiles = walk(root).filter((file) =>
  textExtensions.has(path.extname(file))
);
const combined = textFiles
  .filter((file) => file !== import.meta.filename)
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

for (const forbidden of [
  new RegExp(["supa", "base"].join(""), "i"),
  new RegExp(["pchdckgd", "rigevxfjwgom"].join(""), "i"),
  new RegExp(["/re", "st/v1/"].join(""), "i"),
  new RegExp(["/func", "tions/v1/"].join(""), "i"),
  new RegExp(["sb_", "publishable_"].join(""), "i"),
  new RegExp(["button", "down\\.com\\/api"].join(""), "i"),
]) {
  assert.doesNotMatch(combined, forbidden);
}

const htmlFiles = textFiles.filter((file) => file.endsWith(".html"));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (file.endsWith("index.html") && path.dirname(file) === root) {
    assert.match(html, /<form id="askForm"/);
    continue;
  }
  assert.doesNotMatch(html, /<form\b/);
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (html.includes("assets/app.js?v=")) {
    assert.match(html, /assets\/app\.js\?v=36/);
  }
}

for (const [file, expected] of Object.entries({
  "documents.html": "searchable document index is unavailable",
  "news.html": "live feed formerly",
  "comment-box.html": "Comment Box is unavailable",
  "volunteer.html": "Applications unavailable",
  "take-action.html": "Idea and feedback forms are unavailable",
})) {
  assert.match(
    fs.readFileSync(path.join(root, file), "utf8"),
    new RegExp(expected, "i")
  );
}

console.log(
  `Static read-only checks passed across ${textFiles.length} text files and ${htmlFiles.length} pages.`
);
