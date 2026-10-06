const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const now = Date.parse("2026-10-06T12:00:00Z") / 1000;
const day = 24 * 60 * 60;

function siteList(orderby, sites) {
  const context = {
    LogMixin: {},
    Time: { timestamp: () => now },
    Page: { settings: { sites_orderby: orderby } },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js/SiteList.js"), "utf8"), context, {
    filename: "js/SiteList.js"
  });
  // Skip the constructor: it wires timers and Page promises.
  const list = Object.create(context.SiteList.prototype);
  Object.assign(list, {
    sites: sites,
    sites_byaddress: Object.fromEntries(sites.map(site => [site.row.address, site])),
    filtering: "",
    limit: 100,
  });
  return list;
}

function site(address, settings, content = {}) {
  return {
    favorite: false,
    row: {
      address, peers: 0,
      settings: Object.assign({ size: 0, peers: 0, downloaded: now - 30 * day }, settings),
      size_limit: 10,
      content: Object.assign({ title: address }, content),
    },
  };
}

function order(list) {
  return list.sortRows(list.sites).map(site => site.row.address);
}

function fixture() {
  return [
    site("dash", { modified: now - 1 * day, peers: 5 }),
    site("post", { modified: now - 9 * day, peers: 2, permissions: ["Merger:Social"] }),
    site("talk", { modified: now - 3 * day, peers: 4 }),
    site("hub", { modified: now - 60, peers: 3 }, { merged_type: "Social" }),
  ];
}

test("a merger sorts by its newest merged xite when ordered by date", () => {
  const list = siteList("modified", fixture());
  // hub is newest (60s ago), so post's group floats above dash and talk.
  assert.deepEqual(order(list).filter(address => address !== "hub"), ["post", "dash", "talk"]);
  assert.equal(list.sites_byaddress.post.merged_stats.modified, now - 60);
});

test("a merger sorts by its group's summed peers when ordered by peers", () => {
  const list = siteList("peers", fixture());
  // post: 2 own + 3 from hub = 5, ties dash; both ahead of talk.
  const result = order(list);
  assert.deepEqual(result.slice(2), ["talk", "hub"]);
  assert.deepEqual(result.slice(0, 2).sort(), ["dash", "post"]);
});

test("a merger without merged xites sorts by its own date", () => {
  const sites = fixture().filter(site => site.row.address !== "hub");
  const list = siteList("modified", sites);
  assert.deepEqual(order(list), ["dash", "talk", "post"]);
});

test("a merger drops its group date once its merged xites are filtered out", () => {
  const list = siteList("modified", fixture());
  order(list);
  list.filtering = "post";
  assert.deepEqual(order(list), ["hub", "dash", "talk", "post"]);
  assert.equal(list.sites_byaddress.post.merged_stats, null);
});
