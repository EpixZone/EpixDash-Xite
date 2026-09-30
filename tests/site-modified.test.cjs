const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const now = Date.parse("2026-09-30T18:00:00Z");
const published = now / 1000 - 10 * 24 * 60 * 60;

function dashboard() {
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() { return now; }
  }
  const context = {
    Date: FixedDate,
    _: text => text === "Unknown" ? "Translated unknown" : text,
    LogMixin: {},
    Page: { settings: { sites_orderby: "modified" }, site_list: {} },
    h(selector, properties, ...children) {
      if (!properties || Array.isArray(properties) || typeof properties !== "object") {
        children.unshift(properties);
        properties = {};
      }
      return { selector, properties, children: children.flat(Infinity) };
    },
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ["js/utils/Time.js", "js/Site.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, {
      filename: file
    });
  }
  return context;
}

function row(settings) {
  return {
    address: "example.epix", peers: 1, settings,
    content: { title: "Example", modified: published }
  };
}

function site(context, settings) {
  const result = Object.create(context.Site.prototype);
  // Keep the production setRow/render paths; unrelated chrome needs no DOM.
  Object.assign(result, {
    renderMergedExpander: () => null,
    renderMarker: () => null,
    renderActions: () => null,
    getHref: () => "/example.epix/",
    isWorking: () => false,
    setMessage: () => {},
  });
  result.setRow(row(settings));
  return result;
}

function find(node, selector) {
  if (!node || typeof node !== "object") return null;
  if (node.selector === selector) return node;
  for (const child of node.children || []) {
    const match = find(child, selector);
    if (match) return match;
  }
  return null;
}

function displayedDate(site) {
  const modified = find(site.render(), "span.modified");
  return modified.children.filter(child => typeof child === "string").join("");
}

test("a new row without an update timestamp shows translated Unknown", () => {
  const context = dashboard();
  assert.equal(displayedDate(site(context, {})), "Translated unknown");
});

test("partial clone progress preserves the previously received update timestamp", () => {
  const context = dashboard();
  const existing = site(context, { modified: published, size: 100 });
  const before = displayedDate(existing);
  existing.setRow({
    address: "example.epix", content: {}, settings: { size: 0 },
    peers: 0, tasks: 0, bad_files: 0, event: ["peers_added"]
  });
  assert.equal(existing.row.settings.modified, published);
  assert.equal(existing.row.settings.size, 0);
  assert.equal(displayedDate(existing), before);
});

test("an explicit replacement timestamp supersedes the previous value", () => {
  const context = dashboard();
  const existing = site(context, { modified: published });
  for (const modified of [now / 1000 - 120, published - 86400]) {
    existing.setRow(row({ modified }));
    assert.equal(existing.row.settings.modified, modified);
    assert.equal(displayedDate(existing), context.Time.sinceShort(modified));
  }
});

test("an explicit zero or null clears an old update timestamp", () => {
  const context = dashboard();
  for (const modified of [0, null]) {
    const existing = site(context, { modified: published });
    existing.setRow(row({ modified }));
    assert.equal(existing.row.settings.modified, 0);
    assert.equal(displayedDate(existing), "Translated unknown");
  }
});

test("invalid relative timestamps show translated Unknown", () => {
  const context = dashboard();
  for (const timestamp of [undefined, null, 0, -1, NaN, Infinity, -Infinity, "", "0", "invalid"]) {
    assert.equal(context.Time.since(timestamp), "Translated unknown", String(timestamp));
    assert.equal(context.Time.sinceShort(timestamp), "Translated unknown", String(timestamp));
  }
});

test("valid second and millisecond timestamps retain their age formatting", () => {
  const context = dashboard();
  for (const scale of [1, 1000]) {
    for (const encode of [value => value, String]) {
      assert.equal(context.Time.since(encode((now / 1000 - 20) * scale)), "Just now");
      assert.equal(context.Time.since(encode((now / 1000 - 120) * scale)), "2 minutes ago");
      assert.equal(context.Time.since(encode((now / 1000 - 7200) * scale)), "2 hours ago");
      assert.equal(context.Time.since(encode(published * scale)), "on " + context.Time.date(published));
    }
  }
  assert.equal(context.Time.date(), context.Time.date(now / 1000));
  assert.equal(context.Time.dateIso(), context.Time.dateIso(now / 1000));
});
