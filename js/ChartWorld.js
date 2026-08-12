(function() {

// The peer map: dots on canvas over img/world.png (the projection constants
// below are tuned to that PNG - don't swap the art without retuning). Feeds
// the country rail (StatList) from the same chartGetPeerLocations answer, so
// map and rail can never disagree.
class ChartWorld {
  constructor() {
    this.render = this.render.bind(this);
    this.initCanvas = this.initCanvas.bind(this);
    this.drawPoints = this.drawPoints.bind(this);
    this.update = this.update.bind(this);
    this.points = [];
    this.need_update = false;
  }

  update() {
    return Page.cmd("chartGetPeerLocations", [], (res) => {
      res = Page.rows(res);
      var country, country_db, i, item, items, j, len, len1, name, num, num_others, point, ref, ref1;
      this.points = res;
      country_db = {};
      items = Page.page_stats.country_list.items;
      items.length = 0;
      ref = this.points;
      for (i = 0, len = ref.length; i < len; i++) {
        point = ref[i];
        if (country_db[name = point.country] == null) {
          country_db[name] = 0;
        }
        country_db[point.country] += 1;
      }
      for (country in country_db) {
        num = country_db[country];
        items.push({
          title: country,
          value: num
        });
      }
      items.sort(function(a, b) {
        return b.value - a.value;
      });
      // 12 named rows + Other, sized to sit beside the map instead of under it.
      if (items.length > 13) {
        num_others = 0;
        ref1 = items.slice(12);
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          item = ref1[j];
          num_others += item.value;
        }
        items.length = 12;
        items.push({
          title: "Other",
          value: num_others,
          type: "other"
        });
      }
      Page.page_stats.country_list.total_peers = this.points.length;
      Page.page_stats.country_list.total_countries = Object.keys(country_db).length;
      this.drawPoints();
      return Page.projector.scheduleRender();
    });
  }

  // Peer dots in the outbound teal with a surface-colored ring. Peers within
  // a few pixels of each other merge into one bubble sized by headcount
  // (area-ish: sqrt), carrying the count once it is big enough to read -
  // dense regions read as "34 here" instead of a smear of overlapping dots.
  // Colors resolved per draw - the theme flip just calls this again.
  drawPoints() {
    var c, clusters, found, i, j, k, left, len, len1, point, r, ref, ring, threshold, top;
    if (!this.ctx) {
      return;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ring = getComputedStyle(document.body).getPropertyValue("--epix-surface-2").trim() || "#F6F6F9";
    threshold = 12;
    clusters = [];
    ref = this.points;
    for (i = 0, len = ref.length; i < len; i++) {
      point = ref[i];
      left = (47 + (point.lon / 3.65)) * this.canvas.width / 100;
      top = (59 - (point.lat / 1.52)) * this.canvas.height / 100;
      found = null;
      for (j = 0, len1 = clusters.length; j < len1; j++) {
        c = clusters[j];
        if ((c.x - left) * (c.x - left) + (c.y - top) * (c.y - top) < threshold * threshold) {
          found = c;
          break;
        }
      }
      if (found) {
        found.count += 1;
        // Running average keeps the bubble centered over its group.
        found.x += (left - found.x) / found.count;
        found.y += (top - found.y) / found.count;
      } else {
        clusters.push({x: left, y: top, count: 1});
      }
    }
    // Small dots first, so the big labeled bubbles stay readable on top.
    clusters.sort(function(a, b) {
      return a.count - b.count;
    });
    for (k = 0; k < clusters.length; k++) {
      c = clusters[k];
      r = c.count === 1 ? 2.4 : Math.min(10, 3.2 + 1.4 * Math.sqrt(c.count - 1));
      this.ctx.beginPath();
      this.ctx.fillStyle = ring;
      this.ctx.arc(c.x, c.y, r + 1.2, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.fillStyle = Viz.color("out");
      this.ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
      this.ctx.fill();
      if (c.count >= 4) {
        this.ctx.fillStyle = ring;
        this.ctx.font = "700 8px " + (getComputedStyle(document.body).fontFamily || "sans-serif");
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(c.count > 99 ? "99+" : "" + c.count, c.x, c.y + 0.5);
      }
    }
  }

  initCanvas(node) {
    this.canvas = node;
    this.ctx = node.getContext("2d");
    return this.drawPoints();
  }

  render() {
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    return h("div.ChartWorld", [
      h("canvas.map-points", {
        width: 878,
        height: 371,
        afterCreate: this.initCanvas
      }), h("img.map", {
        src: "img/world.png"
      })
    ]);
  }
}

Object.assign(ChartWorld.prototype, LogMixin);
window.ChartWorld = ChartWorld;

})();
