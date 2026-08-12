(function() {

// Chart ink resolved from the --viz-* CSS custom properties AT DRAW TIME.
// Canvases don't re-read CSS on their own, so every painter asks here on each
// repaint and NetworkStats repaints them when the theme flips - that is the
// whole theming pipeline for the stats page. One encoding page-wide:
// out = outbound (teal), in = inbound (purple), mag = xite magnitude (indigo),
// grid/ink = chart furniture.
window.Viz = {
  color: function(name) {
    var val = getComputedStyle(document.body).getPropertyValue("--viz-" + name);
    return (val || "").trim() || "#31BDC6";
  },
  // The token with an alpha applied (fills under lines). Non-hex tokens
  // (the rgba grid) pass through unchanged.
  alpha: function(name, a) {
    var c = this.color(name);
    var m = c.match(/^#([0-9a-f]{6})$/i);
    if (!m) {
      return c;
    }
    var n = parseInt(m[1], 16);
    return "rgba(" + (n >> 16) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ", " + a + ")";
  },
  // Compact count for request totals: 14419 -> "14.4K".
  compact: function(num) {
    if (num == null) {
      return "0";
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return "" + Math.round(num);
  }
};

})();
