(function() {

class NetworkStats {
  constructor() {
    this.render = this.render.bind(this);
    this.loadChartjs = this.loadChartjs.bind(this);
    this.update = this.update.bind(this);
    this.handleChartjsLoad = this.handleChartjsLoad.bind(this);
    this.need_update = false;
    this.need_load_chartjs = true;
    this.chartjs_loaded = false;
    this.chart_timeline = new ChartTimeline();
    this.chart_big = new ChartBig();
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
    this.chart_legend = new ChartLegend();
    this.chart_legend.items_left = [
      {
        title: "Upload",
        getValue: (() => {
          return Text.formatSize(this.chart_big.data_total.file_bytes_sent);
        }),
        color: "#1dfc59"
      }, {
        title: "Download",
        getValue: (() => {
          return Text.formatSize(this.chart_big.data_total.file_bytes_recv);
        }),
        color: "#c94d47"
      }, {
        title: "Ratio",
        getValue: (() => {
          return this.chart_big.data_total.file_bytes_sent / this.chart_big.data_total.file_bytes_recv;
        }),
        type: "ratio",
        color: "#16ffe9"
      }
    ];
    this.chart_legend.items_right = [
      {
        title: "Sent",
        getValue: (() => {
          return this.chart_big.data_total.request_num_sent;
        }),
        post: "requests",
        dot: "\u2500",
        color: "#2da3b3"
      }, {
        title: "Received",
        getValue: (() => {
          return this.chart_big.data_total.request_num_recv;
        }),
        post: "requests",
        dot: "\u2500",
        color: "#80623f"
      }
    ];
    this.chart_radar = new ChartRadar();
    this.chart_connections = new Chart();
    this.chart_connections.title = "Connections";
    this.chart_connections.type_names = ["peer", "peer_onion", "connection", "connection_onion", "connection_in", "connection_ping_avg", "connection_ping_min"];
    this.chart_connections.formatValue = function(type_data) {
      return "" + type_data.connection + " of " + type_data.peer + " peers";
    };
    this.chart_connections.formatDetails = function(type_data) {
      var back;
      back = [];
      back.push("Onion: " + type_data.peer_onion + " peers (" + (type_data.connection_onion || 0) + " connections)");
      back.push("Incoming: " + (Math.round(type_data.connection_in / type_data.connection * 100)) + "%");
      back.push("Ping avg: " + type_data.connection_ping_avg + "ms (min: " + type_data.connection_ping_min + "ms)");
      return back;
    };
    this.chart_connections.chart_stroke = ["#608DECAA", "#D74C58FF"];
    this.chart_connections.getChartQuery = function() {
      return "SELECT * FROM data WHERE type_id = " + Page.page_stats.type_id_db['connection'] + " ORDER BY date_added DESC LIMIT 50";
    };
    this.chart_size = new Chart();
    this.chart_size.getTitle = function() {
      return h("a", {
        href: Page.createUrl("bigchart", "size"),
        onclick: Page.handleLinkClick
      }, "Total size");
    };
    this.chart_size.chart_stroke = ["#F99739AA", "#51B8F2"];
    this.chart_size.type_names = ["size", "size_optional", "optional_limit", "optional_used", "content"];
    this.chart_size.formatValue = function(type_data) {
      return Text.formatSize(type_data.size) + (" in " + Page.site_list.sites.length + " sites");
    };
    this.chart_size.formatDetails = function(type_data) {
      var back;
      back = [];
      back.push("Content sources: " + type_data.content + " files");
      back.push("Optional downloaded: " + (Text.formatSize(type_data.optional_used) || '0 MB') + " of " + (Text.formatSize(type_data.size_optional) || '0 MB') + " (limit: " + (Text.formatSize(type_data.optional_limit)) + ")");
      return back;
    };
    this.chart_size.getChartQuery = function() {
      return "SELECT CAST(value AS FLOAT) / 1024 / 1024 AS value FROM data WHERE type_id = " + Page.page_stats.type_id_db['size'] + " GROUP BY ROUND(date_added / 10000) ORDER BY date_added DESC LIMIT 50";
    };
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
  }

  handleChartjsLoad() {
    this.chartjs_loaded = true;
    return Page.projector.scheduleRender();
  }

  update() {
    Page.cmd("chartDbQuery", "SELECT * FROM type", (res) => {
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
      var i, len, row, sites;
      sites = {};
      this.sites_by_id = {};
      for (i = 0, len = res.length; i < len; i++) {
        row = res[i];
        this.site_id_db[row.address] = row.site_id;
        this.site_address_db[row.site_id] = row.address;
      }
      this.chart_big.need_update = true;
      this.chart_timeline.need_update = true;
      this.chart_connections.need_update = true;
      this.chart_size.need_update = true;
      this.chart_radar.need_update = true;
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

  render() {
    var intervals, ref;
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    if (!this.need_update && document.body.className !== "loaded") {
      setTimeout((function() {
        return document.body.classList.add("loaded");
      }), 1000);
    }
    if (this.need_load_chartjs) {
      setTimeout(this.loadChartjs, 500);
      this.need_load_chartjs = false;
    }
    intervals = ["1w", "1d"];
    return h("div#NetworkStats", [
      h("div.intervals", intervals.map((interval) => {
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
      })), this.chart_timeline.render(), this.chartjs_loaded ? [this.chart_big.render(), this.chart_legend.render(), this.chart_radar.render(), h("div.Charts", [this.chart_connections.render(), this.chart_size.render()]), this.chart_world.render(), this.country_list.render()] : void 0
    ]);
  }
}

Object.assign(NetworkStats.prototype, LogMixin);
window.NetworkStats = NetworkStats;

})();
