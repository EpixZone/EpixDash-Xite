(function() {

// The Stats page: toolbar (1D/1W + drill state), KPI row, the Transfer panel
// (chart + requests meta + clickable day strip), Connections / Total size
// mini panels, the Top xites ranked bars, and the peer map with its country
// rail. Only the Transfer chart needs the lazy Chart.js bundle; everything
// else is DOM or raw canvas and renders as soon as its data lands.
class NetworkStats {
  constructor() {
    this.render = this.render.bind(this);
    this.loadChartjs = this.loadChartjs.bind(this);
    this.update = this.update.bind(this);
    this.handleChartjsLoad = this.handleChartjsLoad.bind(this);
    this.handleThemeFlip = this.handleThemeFlip.bind(this);
    this.need_update = false;
    this.need_load_chartjs = true;
    this.chartjs_loaded = false;
    this.chart_timeline = new ChartTimeline();
    this.chart_big = new ChartBig();
    // The mirror layout, kept on purpose: upload plots up, download plots
    // down, and the request lanes ride the same split on a hidden second
    // axis - the user reads give-vs-take at a glance.
    this.chart_big.types = [
      {
        name: "file_bytes_sent",
        dataset_id: 0
      }, {
        name: "file_bytes_recv",
        dataset_id: 1,
        negative: true
      }, {
        name: "request_num_sent",
        dataset_id: 2,
        negative: true
      }, {
        name: "request_num_recv",
        dataset_id: 3
      }
    ];
    this.chart_connections = new Chart();
    this.chart_connections.title_key = "Connections";
    this.chart_connections.chart_token = "out";
    this.chart_connections.type_names = ["peer", "peer_onion", "connection", "connection_onion", "connection_in", "connection_ping_avg", "connection_ping_min"];
    this.chart_connections.formatValue = function(type_data) {
      if (type_data.peer == null) {
        return null;
      }
      return "" + (type_data.connection || 0) + " " + _("of") + " " + type_data.peer + " " + _("peers");
    };
    this.chart_connections.formatFacts = function(type_data) {
      var counts, facts, ns, pct;
      facts = [];
      ns = Page.server_info ? Page.server_info.network_status : null;
      if (ns && ns.tor && ns.tor.enabled) {
        facts.push({
          key: "tor",
          label: "Tor",
          ink: ns.tor.reachable ? "ok" : "warn",
          value: ns.tor.reachable ? _("Connected") : _("Connecting…")
        });
      }
      if (ns && ns.i2p && ns.i2p.enabled) {
        facts.push({
          key: "i2p",
          label: "I2P",
          ink: ns.i2p.reachable ? "ok" : "warn",
          value: ns.i2p.reachable ? _("Connected") : _("Connecting…")
        });
      }
      counts = Page.dashboard ? Page.dashboard.trackerCounts() : {ok: 0, total: 0};
      if (counts.total > 0) {
        facts.push({
          key: "trackers",
          label: _("Trackers"),
          ink: counts.ok > counts.total / 2 ? "ok" : "warn",
          meter: {
            num: counts.ok,
            den: counts.total
          },
          value: counts.ok + "/" + counts.total
        });
      }
      // The connection-derived chips only once the chart db has answered -
      // zeros before that would just be wrong.
      if (type_data.peer != null) {
        facts.push({
          key: "onion",
          label: _("Onion peers"),
          value: (type_data.peer_onion || 0) + " · " + (type_data.connection_onion || 0) + " " + _("conn")
        });
        pct = type_data.connection ? Math.round((type_data.connection_in || 0) / type_data.connection * 100) : 0;
        facts.push({
          key: "incoming",
          label: _("Incoming"),
          value: pct + "%"
        });
        facts.push({
          key: "ping",
          label: _("Ping"),
          value: (type_data.connection_ping_avg || 0) + " ms · " + _("min") + " " + (type_data.connection_ping_min || 0) + " ms"
        });
      }
      return facts;
    };
    this.chart_connections.getChartQuery = function() {
      return "SELECT * FROM data WHERE type_id = " + Page.page_stats.type_id_db['connection'] + " ORDER BY date_added DESC LIMIT 50";
    };
    this.chart_size = new Chart();
    this.chart_size.title_key = "Total size";
    this.chart_size.chart_token = "mag";
    this.chart_size.type_names = ["size", "size_optional", "optional_limit", "optional_used", "content"];
    this.chart_size.formatValue = function(type_data) {
      if (type_data.size == null) {
        return null;
      }
      return Text.formatSize(type_data.size) + (" " + _("in") + " " + Page.site_list.sites.length + " " + _("xites"));
    };
    this.chart_size.formatFacts = function(type_data) {
      var facts;
      facts = [];
      if (type_data.content != null) {
        facts.push({
          key: "content",
          label: _("Content sources"),
          value: type_data.content + " " + _("files")
        });
      }
      if (type_data.optional_limit != null) {
        facts.push({
          key: "optional",
          label: _("Optional"),
          meter: {
            num: type_data.optional_used || 0,
            den: type_data.optional_limit || 1
          },
          value: (Text.formatSize(type_data.optional_used) || "0 MB") + " " + _("of") + " " + (Text.formatSize(type_data.optional_limit) || "0 MB")
        });
      }
      return facts;
    };
    this.chart_size.getChartQuery = function() {
      return "SELECT CAST(value AS FLOAT) / 1024 / 1024 AS value FROM data WHERE type_id = " + Page.page_stats.type_id_db['size'] + " GROUP BY ROUND(date_added / 10000) ORDER BY date_added DESC LIMIT 50";
    };
    this.xite_rank = new XiteRank();
    this.chart_world = new ChartWorld();
    this.country_list = new StatList();
    this.type_name_db = {};
    this.type_id_db = {};
    this.site_address_db = {};
    this.site_id_db = {};
    setInterval((() => {
      this.need_update = true;
      return Page.projector.scheduleRender();
    }), 5 * 60 * 1000);
    // Painted canvases don't follow CSS: when the theme flips (panel click or
    // the OS setting under "System"), repaint everything in the new tokens
    // once the 0.3s color transition has settled.
    this.last_theme = (document.body.className.match(/theme-\w+/) || [""])[0];
    new MutationObserver(() => {
      var now = (document.body.className.match(/theme-\w+/) || [""])[0];
      if (now === this.last_theme) {
        return;
      }
      this.last_theme = now;
      clearTimeout(this.theme_timer);
      this.theme_timer = setTimeout(this.handleThemeFlip, 420);
    }).observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        clearTimeout(this.theme_timer);
        this.theme_timer = setTimeout(this.handleThemeFlip, 420);
      });
    }
  }

  handleThemeFlip() {
    this.chart_big.onThemeChange();
    this.chart_timeline.updateChart();
    this.chart_connections.updateChart();
    this.chart_size.updateChart();
    this.chart_world.drawPoints();
    return Page.projector.scheduleRender();
  }

  handleChartjsLoad() {
    this.chartjs_loaded = true;
    return Page.projector.scheduleRender();
  }

  update() {
    Page.cmd("chartDbQuery", "SELECT * FROM type", (res) => {
      res = Page.rows(res);
      var i, len, results, row;
      this.type_id_db = {};
      this.type_name_db = {};
      results = [];
      for (i = 0, len = res.length; i < len; i++) {
        row = res[i];
        this.type_id_db[row.name] = row.type_id;
        results.push(this.type_name_db[row.type_id] = row.name);
      }
      return results;
    });
    return Page.cmd("chartDbQuery", "SELECT * FROM site", (res) => {
      res = Page.rows(res);
      var i, len, row;
      for (i = 0, len = res.length; i < len; i++) {
        row = res[i];
        this.site_id_db[row.address] = row.site_id;
        this.site_address_db[row.site_id] = row.address;
      }
      this.chart_big.need_update = true;
      this.chart_timeline.need_update = true;
      this.chart_connections.need_update = true;
      this.chart_size.need_update = true;
      this.xite_rank.need_update = true;
      this.chart_world.need_update = true;
      return Page.projector.scheduleRender();
    });
  }

  loadChartjs() {
    var e;
    e = document.createElement("script");
    e.type = "text/javascript";
    e.src = "chartjs/chart.bundle.min.js";
    e.onload = this.handleChartjsLoad;
    return document.body.appendChild(e);
  }

  // ---- KPI row ----------------------------------------------------------

  formatRatio(up, down) {
    if (!up && !down) {
      return null;
    }
    if (!down) {
      return "∞";
    }
    return (up / down).toFixed(2);
  }

  renderKpi(kpi) {
    return h("div.stattile", {
      key: kpi.key,
      classes: {
        "k-dim": kpi.value == null
      }
    }, [
      h("span.l", [
        kpi.dot ? h("span.kdot." + kpi.dot, {"aria-hidden": "true"}) : void 0,
        kpi.label
      ]),
      h("span.v", kpi.value != null ? kpi.value : "–"),
      h("span.s", kpi.sub || "​")
    ]);
  }

  renderKpis() {
    var conn, down, kpis, ratio, totals, up, window_label;
    totals = this.chart_big.data_total;
    up = totals.file_bytes_sent;
    down = totals.file_bytes_recv;
    conn = this.chart_connections.type_data;
    if (conn && conn.peer == null) {
      // Chart db answered with a half-written batch; the tile shows its dim
      // dash until the retry lands rather than "undefined of undefined".
      conn = null;
    }
    ratio = up != null ? this.formatRatio(up, down) : null;
    if (Page.params.date_added_to) {
      // Drilled into a historical window: say which one instead of claiming
      // these totals are recent.
      window_label = _("until") + " " + Page.params.date_added_to;
    } else {
      window_label = Page.params.interval === "1w" ? _("past 7 days") : _("past 24 hours");
    }
    kpis = [
      {
        key: "up",
        label: _("Uploaded"),
        dot: "kd-out",
        value: up != null ? Text.formatSize(up) || "0 MB" : null,
        sub: window_label
      }, {
        key: "down",
        label: _("Downloaded"),
        dot: "kd-in",
        value: down != null ? Text.formatSize(down) || "0 MB" : null,
        sub: window_label
      }, {
        key: "ratio",
        label: _("Share ratio"),
        value: ratio,
        sub: ratio != null ? _("upload / download") : null
      }, {
        key: "peers",
        label: _("Peers connected"),
        value: conn ? (conn.connection || 0) + " " + _("of") + " " + conn.peer : null,
        sub: conn ? (conn.peer_onion || 0) + " " + _("onion") : null
      }
    ];
    return h("div.kpis", kpis.map(this.renderKpi));
  }

  // ---- Toolbar ----------------------------------------------------------

  renderToolbar() {
    var drilled, intervals;
    intervals = ["1d", "1w"];
    drilled = Page.params.date_added_to;
    return h("div.stats-toolbar", [
      h("div.intervals.seg", intervals.map((interval) => {
        var interval_param;
        if (interval === "1d") {
          interval_param = void 0;
        } else {
          interval_param = interval;
        }
        return h("a.interval", {
          href: Page.createUrl("interval", interval_param),
          onclick: Page.handleLinkClick,
          classes: {
            active: interval_param === Page.params.interval
          }
        }, interval);
      })),
      drilled ? h("a.drill-chip", {
        href: Page.createUrl("date_added_to", ""),
        onclick: Page.handleLinkClick
      }, [_("Viewing") + " " + drilled + " · " + _("Back to now")]) : h("span.window-caption", Page.params.interval === "1w" ? _("Last 7 days") : _("Last 24 hours"))
    ]);
  }

  // ---- Transfer panel ---------------------------------------------------

  renderTransferPanel() {
    var totals;
    totals = this.chart_big.data_total;
    return h("div.spanel.p-transfer", [
      h("div.phead", [
        h("span.plabel", _("Transfer")),
        h("span.pmeta", [
          h("span.leg.leg-out", [h("span.legdot.kd-out", {"aria-hidden": "true"}), _("Upload") + " " + (Text.formatSize(totals.file_bytes_sent) || "0 MB")]),
          h("span.leg.leg-in", [h("span.legdot.kd-in", {"aria-hidden": "true"}), _("Download") + " " + (Text.formatSize(totals.file_bytes_recv) || "0 MB")]),
          h("span.leg.leg-req", Viz.compact(totals.request_num_sent) + " " + _("req sent") + " · " + Viz.compact(totals.request_num_recv) + " " + _("received"))
        ])
      ]),
      this.chartjs_loaded ? this.chart_big.render() : h("div.chart-wait", _("Loading chart…")),
      this.chart_timeline.render()
    ]);
  }

  // ---- World panel ------------------------------------------------------

  renderWorldPanel() {
    return h("div.spanel.p-world", [
      h("div.phead", [h("span.plabel", _("Peer locations"))]),
      h("div.world-grid", [this.chart_world.render(), this.country_list.render()])
    ]);
  }

  render() {
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    if (!this.need_update && document.body.className.indexOf("loaded") === -1) {
      setTimeout((function() {
        return document.body.classList.add("loaded");
      }), 1000);
    }
    if (this.need_load_chartjs) {
      setTimeout(this.loadChartjs, 500);
      this.need_load_chartjs = false;
    }
    return h("div#NetworkStats", [
      this.renderToolbar(),
      this.renderKpis(),
      this.renderTransferPanel(),
      h("div.cards-2col", [this.chart_connections.render(), this.chart_size.render()]),
      this.xite_rank.render(),
      this.renderWorldPanel()
    ]);
  }
}

Object.assign(NetworkStats.prototype, LogMixin);
window.NetworkStats = NetworkStats;

})();
