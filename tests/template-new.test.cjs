const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Settings > Create new xite clones template-new/ into the new xite, so the
// starter page may only use files that live under template-new/.
const templateDir = path.join(__dirname, "..", "template-new");
const html = fs.readFileSync(path.join(templateDir, "index.html"), "utf8");
// Code shown to the reader inside <pre> is text, not markup the page loads.
const markup = html.replace(/<pre>[\s\S]*?<\/pre>/g, "");

test("starter page loads only files shipped in template-new", () => {
  const refs = [...markup.matchAll(/<(?:script|img|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(ref => !/^(?:[a-z]+:|\/|#)/i.test(ref));
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(templateDir, ref)), `template-new/${ref} is missing`);
  }
});

test("starter EpixFrame example runs against the shipped library", () => {
  assert.match(html, /new EpixFrame\(\)/);
  const inline = [...markup.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join("\n");
  assert.match(inline, /new EpixFrame\(\)/, "the page runs its own EpixFrame example");

  const elements = {};
  const posted = [];
  const listeners = {};
  const context = {
    console,
    document: {
      location: { href: "http://127.0.0.1/media/epix1test/index.html?wrapper_nonce=abc123" },
      documentElement: { scrollTop: 0 },
      getElementById(id) {
        return elements[id] || (elements[id] = { textContent: "", hidden: true });
      },
    },
    parent: { postMessage: message => posted.push(message) },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(templateDir, "js/lib/epixframe.min.js"), "utf8"), context, {
    filename: "template-new/js/lib/epixframe.min.js"
  });
  assert.equal(typeof context.EpixFrame, "function");
  vm.runInContext(inline, context, { filename: "template-new/index.html" });

  const deliver = data => listeners.message.forEach(fn => fn({ data }));
  deliver({ cmd: "wrapperOpenedWebsocket" });
  const siteInfo = posted.find(message => message.cmd === "siteInfo");
  assert.ok(siteInfo, "siteInfo is requested once the socket is open");
  assert.equal(siteInfo.wrapper_nonce, "abc123");
  deliver({ cmd: "response", to: siteInfo.id, result: { address: "epix1test", peers: 3 } });

  assert.equal(elements["live-address"].textContent, "epix1test");
  assert.equal(elements["live-peers"].textContent, 3);
  assert.equal(elements["live-info"].hidden, false);
});
