(function() {

class ChartBig {
  constructor() {
    this.render = this.render.bind(this);
    this.initChart = this.initChart.bind(this);
    this.storeCanvasNode = this.storeCanvasNode.bind(this);
    this.update = this.update.bind(this);
    var types;
    this.need_update = false;
    this.data = {};
    this.data_max = {};
    this.data_total = {};
    types = {};
  }

  update(cb) {
    var date_added_from, date_added_to, interval, query, query_group, query_select, step, type, type_ids;
    if (this.configuration == null) {
      // A theme flip nulls the config so the next build re-reads the viz
      // tokens; the async callback below writes into it, so rebuild first.
      this.configuration = this.getChartConfiguration();
    }
    if (Page.params.interval === "1w") {
      interval = 60 * 60 * 24 * 7;
      step = 60 * 60;
      query_select = "MAX(date_added) AS date_added, type_id, SUM(value) AS value";
      query_group = "GROUP BY type_id, strftime('%Y-%m-%d %H', date_added, 'unixepoch', 'localtime')";
    } else {
      interval = 60 * 60 * 24;
      step = 60 * 5;
      query_select = "*";
      query_group = "";
    }
    if (Page.params.date_added_to) {
      date_added_to = (new Date(Page.params.date_added_to + " 23:59")).getTime() / 1000;
      date_added_from = date_added_to - interval;
    } else {
      date_added_to = Time.timestamp();
      date_added_from = Time.timestamp() - interval;
    }
    query = "SELECT " + query_select + " FROM data\nWHERE type_id IN :type_ids AND date_added >= :date_added_from AND date_added <= :date_added_to\n" + query_group + "\nORDER BY date_added";
    type_ids = (() => {
      var j, len, ref, results;
      ref = this.types;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        type = ref[j];
        results.push(Page.page_stats.type_id_db[type.name]);
      }
      return results;
    })();
    return Page.cmd("chartDbQuery", [
      query, {
        type_ids: type_ids,
        date_added_from: date_added_from,
        date_added_to: date_added_to
      }
    ], (res) => {
      res = Page.rows(res);
      var data_date_added, data_found, data_value, dataset, i, j, k, l, len, len1, len2, len3, len4, m, n, row, type_id, type_name;
      this.logStart("Parse result");
      if (this.configuration == null) {
        // A theme flip nulled the config while this query was in flight;
        // rebuild before writing into it (the chart itself was destroyed, so
        // initChart below recreates it against this fresh config).
        this.configuration = this.getChartConfiguration();
      }
      this.data = {
        labels: []
      };
      this.data_max = {};
      this.data_total = {};
      for (j = 0, len = type_ids.length; j < len; j++) {
        type_id = type_ids[j];
        this.data[type_id] = {};
        this.data_max[Page.page_stats.type_name_db[type_id]] = 0;
        this.data_total[Page.page_stats.type_name_db[type_id]] = 0;
      }
      for (k = 0, len1 = res.length; k < len1; k++) {
        row = res[k];
        type_name = Page.page_stats.type_name_db[row.type_id];
        this.data[row.type_id][Math.ceil(row.date_added / step) * step] = row.value;
        this.data_max[type_name] = Math.max(row.value, this.data_max[type_name]);
        this.data_total[type_name] += row.value;
      }
      // Mirrored axes, kept by request: upload plots up, download down, and
      // the request lanes ride the same split on the hidden right axis. Tick
      // labels stay absolute values so both halves read as magnitudes.
      this.configuration.options.scales.yAxes[0].ticks.suggestedMax = Math.max(this.data_max["file_bytes_sent"], this.data_max["file_bytes_recv"]);
      this.configuration.options.scales.yAxes[0].ticks.suggestedMin = 0 - this.configuration.options.scales.yAxes[0].ticks.suggestedMax;
      this.configuration.options.scales.yAxes[1].ticks.suggestedMax = Math.max(this.data_max["request_num_sent"], this.data_max["request_num_recv"]);
      this.configuration.options.scales.yAxes[1].ticks.suggestedMin = 0 - this.configuration.options.scales.yAxes[1].ticks.suggestedMax;
      for (i = l = 0, len2 = type_ids.length; l < len2; i = ++l) {
        type_id = type_ids[i];
        if (this.types[i].dataset_id == null) {
          continue;
        }
        dataset = this.configuration.data.datasets[this.types[i].dataset_id];
        dataset.data.length = 0;
        dataset.data_i = 0;
      }
      this.configuration.data.labels.length = 0;
      this.configuration.data.labels_i = 0;
      data_date_added = Math.ceil(date_added_from / step) * step;
      while (data_date_added <= date_added_to) {
        if (!data_found) {
          for (i = m = 0, len3 = type_ids.length; m < len3; i = ++m) {
            type_id = type_ids[i];
            if (this.data[type_id][data_date_added]) {
              data_found = true;
              break;
            }
          }
          if (!data_found) {
            data_date_added += step;
            continue;
          }
        }
        for (i = n = 0, len4 = type_ids.length; n < len4; i = ++n) {
          type_id = type_ids[i];
          if (this.types[i].dataset_id == null) {
            continue;
          }
          data_value = this.data[type_id][data_date_added];
          dataset = this.configuration.data.datasets[this.types[i].dataset_id];
          if (this.types[i].negative && data_value != null) {
            data_value = 0 - data_value;
          }
          dataset.data[dataset.data_i] = data_value;
          dataset.data_i += 1;
        }
        this.configuration.data.labels.push(data_date_added * 1000);
        this.configuration.data.labels_i += 1;
        data_date_added += step;
      }
      this.logEnd("Parse result", "labels: " + this.configuration.data.labels.length);
      if (this.chart) {
        this.chart.update();
      } else {
        this.initChart();
      }
      if (typeof cb === "function") {
        cb();
      }
      return Page.projector.scheduleRender();
    });
  }

  storeCanvasNode(node) {
    if (this.chart) {
      this.chart.clear();
      this.chart.destroy();
      this.chart = null;
    }
    node.parentNode.style.height = node.getBoundingClientRect().height + "px";
    this.ctx = node.getContext("2d");
    this.chart_node = node;
    return this.configuration != null ? this.configuration : this.configuration = this.getChartConfiguration();
  }

  initChart() {
    this.log("initChart");
    this.chart = new Chart(this.ctx, this.configuration);
    setTimeout((() => {
      return this.chart_node.parentNode.style.height = "";
    }), 100);
    // One listener for the object's lifetime (this used to add a fresh
    // listener on every init - interval switches piled them up), debounced
    // with the timer actually cleared.
    if (!this.resize_bound) {
      this.resize_bound = true;
      window.addEventListener("resize", () => {
        clearTimeout(this.timer_resize);
        return this.timer_resize = setTimeout((() => {
          return this.chart ? this.chart.resize() : void 0;
        }), 300);
      });
    }
  }

  // Repaint in the new theme's ink: drop the chart + config (tokens are read
  // at config build) and refetch on the next render.
  onThemeChange() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    this.configuration = null;
    this.need_update = true;
  }

  testDataAddition() {
    var timer_i;
    timer_i = 0;
    return setInterval((() => {
      var data, dataset, i, j, k, len, len1, new_data, new_labels, type_id;
      new_labels = this.configuration.data.labels.slice();
      new_data = this.configuration.data.datasets[this.types[0].dataset_id].data.slice();
      this.configuration.data.labels = [];
      timer_i += 1;
      for (i = j = 0, len = type_ids.length; j < len; i = ++j) {
        type_id = type_ids[i];
        dataset = this.configuration.data.datasets[this.types[i].dataset_id];
        dataset.data.push(Math.round(Math.random() * 10));
        dataset.data.shift();
      }
      for (k = 0, len1 = new_data.length; k < len1; k++) {
        data = new_data[k];
        this.configuration.data.datasets[this.types[0].dataset_id].data.push(data);
      }
      this.configuration.data.labels = new_labels;
      this.configuration.data.labels.push(1000 * (Time.timestamp() + (timer_i * 60 * 5)));
      this.configuration.data.labels.shift();
      return this.chart.update();
    }), 5000);
  }

  // Colors come from the --viz-* tokens at build time; NetworkStats rebuilds
  // this config (and the chart) when the theme flips, so the canvas follows.
  getChartConfiguration() {
    var color_up, color_down, configuration;
    color_up = Viz.color("out");
    color_down = Viz.color("in");
    configuration = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            type: 'line',
            label: "Upload",
            borderColor: color_up,
            pointBorderColor: color_up,
            pointBackgroundColor: color_up,
            pointHoverBackgroundColor: color_up,
            pointHoverBorderColor: color_up,
            pointHoverRadius: 3,
            pointRadius: 0,
            steppedLine: true,
            fill: true,
            backgroundColor: Viz.alpha("out", 0.10),
            borderWidth: 2,
            lineTension: 0,
            data: []
          }, {
            type: 'line',
            label: "Download",
            borderColor: color_down,
            pointBorderColor: color_down,
            pointBackgroundColor: color_down,
            pointHoverBackgroundColor: color_down,
            pointHoverBorderColor: color_down,
            pointHoverRadius: 3,
            pointRadius: 0,
            steppedLine: true,
            fill: true,
            backgroundColor: Viz.alpha("in", 0.10),
            borderWidth: 2,
            lineTension: 0,
            data: []
          }, {
            type: 'line',
            label: 'Sent',
            borderColor: Viz.color("mag"),
            backgroundColor: "rgba(255,255,255,0.0)",
            pointRadius: 0,
            borderWidth: 1,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: Viz.color("mag"),
            pointHoverBorderColor: Viz.color("mag"),
            fill: true,
            yAxisID: 'Request',
            steppedLine: true,
            lineTension: 0,
            data: []
          }, {
            type: 'line',
            label: 'Received',
            borderColor: Viz.color("ink"),
            backgroundColor: "rgba(255,255,255,0.0)",
            pointRadius: 0,
            borderWidth: 1,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: Viz.color("ink"),
            pointHoverBorderColor: Viz.color("ink"),
            fill: true,
            yAxisID: 'Request',
            steppedLine: true,
            lineTension: 0,
            data: []
          }
        ]
      },
      options: {
        animation: {
          easing: "easeOutExpo",
          duration: 800
        },
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          mode: "index",
          intersect: false,
          displayColors: true,
          xPadding: 12,
          yPadding: 10,
          cornerRadius: 8,
          caretPadding: 10,
          backgroundColor: Viz.color("tip-bg"),
          titleFontColor: Viz.color("tip-ink"),
          bodyFontColor: Viz.color("tip-ink"),
          borderColor: Viz.color("grid"),
          borderWidth: 1,
          callbacks: {
            title: function(tootlip_items, data) {
              return Time.date(tootlip_items[0].xLabel, "long").replace(/:00$/, "");
            },
            label: function(tootlip_items, data) {
              if (data.datasets[tootlip_items.datasetIndex].yAxisID === "Request") {
                return data.datasets[tootlip_items.datasetIndex].label + ": " + Math.abs(tootlip_items.yLabel) + " requests";
              }
              return data.datasets[tootlip_items.datasetIndex].label + ": " + Text.formatSize(Math.abs(tootlip_items.yLabel));
            }
          }
        },
        hover: {
          mode: "index",
          intersect: false
        },
        scales: {
          yAxes: [
            {
              id: 'Transfer',
              ticks: {
                fontColor: Viz.color("ink"),
                beginAtZero: true,
                suggestedMax: 30000000,
                suggestedMin: -30000000,
                maxTicksLimit: 7,
                display: true,
                padding: 10,
                callback: function(value) {
                  return Text.formatSize(Math.abs(value));
                }
              },
              gridLines: {
                drawTicks: false,
                drawBorder: false,
                display: true,
                zeroLineColor: Viz.color("zero"),
                color: Viz.color("grid")
              }
            }, {
              id: 'Request',
              position: "right",
              ticks: {
                beginAtZero: true,
                maxTicksLimit: 5,
                suggestedMax: 180,
                suggestedMin: -180,
                display: false
              },
              gridLines: {
                display: false,
                zeroLineColor: "rgba(255,255,255,0)",
                drawBorder: false
              }
            }
          ],
          xAxes: [
            {
              type: "time",
              gridLines: {
                color: Viz.color("grid"),
                display: false,
                offsetGridLines: true,
                drawBorder: false
              },
              ticks: {
                padding: 12,
                fontColor: Viz.color("ink"),
                callback: ((data_label, index) => {
                  var back, parts;
                  if (this.last_data_label == null) {
                    this.last_data_label = "None 00 00:00";
                  }
                  if (this.last_data_label.match(/.* /)[0] === data_label.match(/.* /)[0]) {
                    back = ["", data_label.replace(/.* /, "")];
                  } else {
                    parts = data_label.split(" ");
                    if (parts.length !== 3) {
                      return data_label;
                    }
                    back = [parts[0] + " " + parts[1], parts[2]];
                  }
                  this.last_data_label = data_label;
                  return back;
                })
              },
              time: {
                displayFormats: {
                  'second': 'MMM DD HH:mm',
                  'minute': 'MMM DD HH:mm',
                  'hour': 'MMM DD HH:mm',
                  'day': 'MMM DD HH:mm',
                  'week': 'MMM DD HH:mm',
                  'month': 'MMM DD HH:mm',
                  'quarter': 'MMM DD HH:mm',
                  'year': 'MMM DD HH:mm'
                }
              }
            }
          ]
        }
      }
    };
    return configuration;
  }

  render() {
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    return h("div.ChartBig", [
      h("canvas." + Page.params.interval, {
        width: 1350,
        height: 450,
        afterCreate: this.storeCanvasNode,
        updateAnimation: Animation.show,
        mode: Page.params.interval
      })
    ]);
  }
}

Object.assign(ChartBig.prototype, LogMixin);
window.ChartBig = ChartBig;

})();
