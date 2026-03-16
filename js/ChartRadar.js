(function() {

class ChartRadar {
  constructor(id) {
    this.id = id;
    this.render = this.render.bind(this);
    this.renderLabel = this.renderLabel.bind(this);
    this.handleLegendClick = this.handleLegendClick.bind(this);
    this.initChart = this.initChart.bind(this);
    this.formatLabel = this.formatLabel.bind(this);
    this.getChartConfiguration = this.getChartConfiguration.bind(this);
    this.initCanvas = this.initCanvas.bind(this);
    this.update = this.update.bind(this);
    this.configuration = {};
    this.site_stats = [];
    this.need_update = false;
    this.order_by = "site_bw";
    this.legends = [
      {
        id: "site_bw",
        title: "Transferred data (last 7 days)",
        color: "#608DECDD"
      }, {
        id: "site_size",
        title: "Site size",
        color: "#9C27B0DD"
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
      var address, data, i, j, k, len, len1, max_site_bw, max_site_size, ref, row, site, stat;
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
            site: site
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
      this.site_stats.sort((a, b) => {
        return b[this.order_by] - a[this.order_by];
      });
      if (this.site_stats.length > 8) {
        this.site_stats.length = 8;
      }
      max_site_bw = Math.max.apply(null, (() => {
        var k, len1, ref, results;
        ref = this.site_stats;
        results = [];
        for (k = 0, len1 = ref.length; k < len1; k++) {
          stat = ref[k];
          results.push(stat.site_bw);
        }
        return results;
      })());
      max_site_size = Math.max.apply(null, (() => {
        var k, len1, ref, results;
        ref = this.site_stats;
        results = [];
        for (k = 0, len1 = ref.length; k < len1; k++) {
          stat = ref[k];
          results.push(stat.site_size);
        }
        return results;
      })());
      ref = this.site_stats;
      for (i = k = 0, len1 = ref.length; k < len1; i = ++k) {
        stat = ref[i];
        this.configuration.data.labels[i] = stat.site.row.content.title;
        this.configuration.data.datasets[0].data[i] = Math.log(1 + (stat.site_bw / max_site_bw) * 100);
        this.configuration.data.datasets[1].data[i] = Math.log(1 + (stat.site_size / max_site_size) * 100);
      }
      this.logEnd("Parse result", "sites: " + this.site_stats.length);
      Page.projector.scheduleRender();
      if (this.chart) {
        return this.chart.update();
      } else {
        return this.initChart();
      }
    });
  }

  initCanvas(node) {
    if (this.chart) {
      this.chart.clear();
      this.chart.destroy();
      this.chart = null;
    }
    this.ctx = node.getContext("2d");
    return this.configuration = this.getChartConfiguration();
  }

  getChartConfiguration() {
    var fill, fill2, shadowed;
    fill = this.ctx.createLinearGradient(0, 0, 900, 0);
    fill.addColorStop(0, "#608DECCC");
    fill.addColorStop(1, "#9C27B0CC");
    fill2 = this.ctx.createLinearGradient(0, 0, 900, 0);
    fill2.addColorStop(0, "#9C27B0DD");
    fill2.addColorStop(1, "#608DECDD");
    shadowed = {
      beforeDatasetsDraw: function(chart, options) {
        chart.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        return chart.ctx.shadowBlur = 40;
      },
      afterDatasetsDraw: function(chart, options) {
        chart.ctx.shadowColor = 'rgba(0, 0, 0, 0)';
        return chart.ctx.shadowBlur = 0;
      }
    };
    return {
      type: 'radar',
      data: {
        labels: [],
        datasets: [
          {
            label: "Transferred data",
            backgroundColor: fill,
            borderColor: "transparent",
            borderWidth: 0,
            pointBorderWidth: 0,
            pointRadius: 0,
            data: []
          }, {
            label: "Site size",
            backgroundColor: fill2,
            borderColor: "transparent",
            borderWidth: 0,
            pointBorderWidth: 0,
            pointRadius: 0,
            data: []
          }
        ]
      },
      options: {
        legend: {
          display: false,
          position: "bottom",
          labels: {
            padding: 5
          }
        },
        scale: {
          ticks: {
            display: false,
            maxTicksLimit: 5,
            beginAtZero: true
          },
          angleLines: {
            color: "#99999911"
          },
          gridLines: {
            color: "#99999911",
            tickMarkLength: 1
          },
          tooltips: {
            enabled: true
          },
          pointLabels: {
            fontColor: "rgba(200,210,232,1)",
            fontSize: 14,
            fontFamily: "Roboto",
            fontStyle: "lighter",
            padding: 10,
            callback: this.formatLabel
          }
        }
      },
      plugins: [shadowed]
    };
  }

  formatLabel() {
    return [""];
  }

  initChart() {
    var timer_resize;
    this.chart = new Chart(this.ctx, this.configuration);
    timer_resize = null;
    return window.addEventListener("resize", () => {
      this.log("resize");
      clearInterval(timer_resize);
      return setTimeout((() => {
        return this.chart.resize();
      }), 300);
    });
  }

  handleLegendClick(e) {
    this.order_by = e.currentTarget.getAttribute("href").replace("#", "");
    this.update();
    return false;
  }

  renderLabel(stat, i) {
    var left, r, top;
    if (i % (this.site_stats.length / 2) === 0) {
      r = 37;
    } else {
      r = 40;
    }
    left = 50 + r * Math.sin(2 * Math.PI * i / this.site_stats.length);
    top = 50 - r * Math.cos(2 * Math.PI * i / this.site_stats.length);
    return h("div.radar-label", {
      key: stat.address + i,
      style: "left: " + left + "%; top: " + top + "%",
      enterAnimation: Animation.show,
      exitAnimation: Animation.hide,
      delay: i * 0.05
    }, h("a.title", {
      href: stat.site.getHref()
    }, stat.site.row.content.title), " ", h("span.value", " (" + (Text.formatSize(stat[this.order_by]) || 'No data yet') + ")"));
  }

  render() {
    var label_i;
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    label_i = 0;
    return h("div.ChartRadar", [
      h("div.radar-container", [
        h("div.radar-labels", this.site_stats.map((stat) => {
          var label;
          label = this.renderLabel(stat, label_i);
          label_i += 1;
          return label;
        })), h("div.canvas-container", h("canvas", {
          width: 600,
          height: 600,
          afterCreate: this.initCanvas
        }))
      ]), h("div.radar-legends", this.legends.map((legend) => {
        return h("a.radar-legend", {
          id: legend.id,
          classes: {
            active: this.order_by === legend.id
          },
          onclick: this.handleLegendClick,
          href: "#" + legend.id
        }, [
          h("div.legend-box", {
            style: "background-color: " + legend.color
          }), h("span.title", legend.title)
        ]);
      }))
    ]);
  }
}

Object.assign(ChartRadar.prototype, LogMixin);
window.ChartRadar = ChartRadar;

})();
