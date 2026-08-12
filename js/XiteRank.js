(function() {

// Top xites as a ranked horizontal bar list (replaces the radar: log-scaled
// spokes made a 150 GB xite and a 12 KB one look like neighbours, and the
// polygon wasted the panel's width). Linear truth: the indigo bar is the
// active measure scaled to the top row; the value column carries the small
// rows a dominant xite squeezes flat. Same 7-day query as the radar had.
class XiteRank {
  constructor() {
    this.render = this.render.bind(this);
    this.update = this.update.bind(this);
    this.site_stats = [];
    this.need_update = false;
    this.order_by = "site_bw";
    // maquette forbids handler identity changing across renders: bind once.
    // Sorting happens at render over the FULL stat list - re-sorting a cached
    // top-8 would rank "by size" among the bandwidth winners only, and the
    // 5-minute refresh would then silently swap the rows.
    this.handleOrderClick = (e) => {
      this.order_by = e.currentTarget.getAttribute("href").replace("#", "");
      Page.projector.scheduleRender();
      return false;
    };
    this.orders = [
      {
        id: "site_bw",
        title: "Transferred (7d)"
      }, {
        id: "site_size",
        title: "Size"
      }
    ];
  }

  update() {
    var query, type_ids, type_name;
    query = "SELECT type_id, site_id, SUM(value) AS sum, value\nFROM data\nWHERE type_id IN :type_ids AND date_added > " + (Time.timestamp() - 60 * 60 * 24 * 7) + "\nGROUP BY type_id, site_id";
    type_ids = (() => {
      var j, len, ref, results;
      ref = ["site_bytes_sent", "site_bytes_recv", "site_size"];
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        type_name = ref[j];
        results.push(Page.page_stats.type_id_db[type_name]);
      }
      return results;
    })();
    return Page.cmd("chartDbQuery", [
      query, {
        type_ids: type_ids
      }
    ], (res) => {
      res = Page.rows(res);
      var address, data, j, len, row, site, stat;
      this.logStart("Parse result");
      data = {};
      for (j = 0, len = res.length; j < len; j++) {
        row = res[j];
        address = Page.page_stats.site_address_db[row.site_id];
        type_name = Page.page_stats.type_name_db[row.type_id];
        site = Page.site_list.sites_byaddress[address];
        if (!site) {
          continue;
        }
        if (data[address] == null) {
          data[address] = {
            address: address,
            site: site,
            site_bytes_sent: 0,
            site_bytes_recv: 0,
            site_size: 0
          };
        }
        if (type_name === "site_size") {
          data[address][type_name] = row.value;
        } else {
          data[address][type_name] = row.sum || 0;
        }
      }
      this.site_stats = [];
      for (address in data) {
        stat = data[address];
        stat.site_bw = stat.site_bytes_sent + stat.site_bytes_recv;
        this.site_stats.push(stat);
      }
      if (res.length && !this.site_stats.length && !(Page.site_list && Page.site_list.loaded)) {
        // The chart db knows these xites but siteList hasn't answered yet
        // (cold load), so every row missed the lookup. Retry once it has.
        setTimeout((() => {
          this.need_update = true;
          return Page.projector.scheduleRender();
        }), 2500);
      }
      this.logEnd("Parse result", "sites: " + this.site_stats.length);
      return Page.projector.scheduleRender();
    });
  }

  renderRow(stat, max_value) {
    var other, value;
    value = stat[this.order_by];
    other = this.order_by === "site_bw" ? stat.site_size : stat.site_bw;
    return h("div.xr-row", {
      key: stat.address
    }, [
      h("a.xr-name", {
        href: stat.site.getHref(),
        title: stat.site.row.content.title
      }, stat.site.row.content.title || stat.address),
      h("span.xr-bar", [
        h("span.xr-fill", {
          styles: {
            width: Math.max(1, Math.round(value / Math.max(1, max_value) * 100)) + "%"
          }
        })
      ]),
      h("span.xr-val", Text.formatSize(value) || "0 B"),
      h("span.xr-sub", Text.formatSize(other) || "0 B")
    ]);
  }

  render() {
    var max_value, ranked, stat;
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    // Sort + top-8 derived from the FULL list at render time, so the order
    // toggle really re-ranks everything.
    ranked = this.site_stats.slice().sort((a, b) => {
      return b[this.order_by] - a[this.order_by];
    }).slice(0, 8);
    max_value = Math.max.apply(null, [1].concat((() => {
      var j, len, results;
      results = [];
      for (j = 0, len = ranked.length; j < len; j++) {
        stat = ranked[j];
        results.push(stat[this.order_by]);
      }
      return results;
    })()));
    return h("div.XiteRank.spanel", [
      h("div.phead", [
        h("span.plabel", _("Top xites")),
        h("span.xr-orders", this.orders.map((order) => {
          return h("a.xr-order", {
            key: order.id,
            href: "#" + order.id,
            onclick: this.handleOrderClick,
            classes: {
              active: this.order_by === order.id
            }
          }, _(order.title));
        }))
      ]),
      h("div.xr-cols", [
        h("span.xr-col-active", this.order_by === "site_bw" ? _("Transferred (7d)") : _("Size")),
        h("span.xr-col-other", this.order_by === "site_bw" ? _("Size") : _("Transferred (7d)"))
      ]),
      h("div.xr-rows", ranked.length ? ranked.map((row_stat) => {
        return this.renderRow(row_stat, max_value);
      }) : [h("div.xr-empty", _("No transfer data yet"))])
    ]);
  }
}

Object.assign(XiteRank.prototype, LogMixin);
window.XiteRank = XiteRank;

})();
