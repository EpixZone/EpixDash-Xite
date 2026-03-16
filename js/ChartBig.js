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
      var data_date_added, data_found, data_value, dataset, i, j, k, l, len, len1, len2, len3, len4, m, n, row, type_id, type_name;
      this.logStart("Parse result");
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
      this.configuration.options.scales.yAxes[0].ticks.suggestedMax = Math.max(this.data_max["file_bytes_sent"], this.data_max["file_bytes_recv"]);
      this.configuration.options.scales.yAxes[0].ticks.suggestedMin = 0 - this.configuration.options.scales.yAxes[0].ticks.suggestedMax;
      this.configuration.options.scales.yAxes[1].ticks.suggestedMax = Math.max(this.data_max["request_num_sent"], this.data_max["request_num_recv"]);
      this.configuration.options.scales.yAxes[1].ticks.suggestedMin = 0 - this.configuration.options.scales.yAxes[1].ticks.suggestedMax;
      for (i = l = 0, len2 = type_ids.length; l < len2; i = ++l) {
        type_id = type_ids[i];
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
          data_value = this.data[type_id][data_date_added];
          dataset = this.configuration.data.datasets[this.types[i].dataset_id];
          type = this.types[i];
          if (type.negative) {
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
    var timer_resize;
    this.log("initChart");
    this.chart = new Chart(this.ctx, this.configuration);
    setTimeout((() => {
      return this.chart_node.parentNode.style.height = "";
    }), 100);
    timer_resize = null;
    return window.addEventListener("resize", () => {
      clearInterval(timer_resize);
      return setTimeout((() => {
        return this.chart.resize();
      }), 300);
    });
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

  createGradientStroke(stops) {
    var color, gradient, i, j, len;
    gradient = this.ctx.createLinearGradient(0, 0, 900, 0);
    for (i = j = 0, len = stops.length; j < len; i = ++j) {
      color = stops[i];
      gradient.addColorStop(i * (1 / (stops.length - 1)), color);
    }
    return gradient;
  }

  createGradientFill(stops, mode) {
    var color, gradient, i, j, len;
    if (mode == null) {
      mode = "normal";
    }
    if (mode === "lower") {
      gradient = this.ctx.createLinearGradient(0, 0, 0, 300);
    } else {
      gradient = this.ctx.createLinearGradient(0, 50, 0, 200);
    }
    for (i = j = 0, len = stops.length; j < len; i = ++j) {
      color = stops[i];
      gradient.addColorStop(i * (1 / (stops.length - 1)), color);
    }
    return gradient;
  }

  getChartConfiguration() {
    var configuration, gradient_fill, gradient_fill_down, gradient_fill_up, gradient_stroke, gradient_stroke_bgline_down, gradient_stroke_bgline_up, gradient_stroke_down, gradient_stroke_up;
    gradient_stroke = this.createGradientStroke(["#5A46DF", "#8F49AA", "#D64C57"]);
    gradient_stroke_bgline_up = this.createGradientStroke(["#EEAAFF11", "#EEAAFF33", "#2da3b366"]);
    gradient_stroke_bgline_down = this.createGradientStroke(["#EEAAFF11", "#EEAAFF33", "#80623f88"]);
    gradient_stroke_up = this.createGradientStroke(["#2b68d9", "#2f99be", "#1dfc59"]);
    gradient_stroke_down = this.createGradientStroke(["#bac735", "#c2a548", "#f1294b"]);
    gradient_fill = this.createGradientFill(["#50455DEE", "#26262C33"]);
    gradient_fill_up = this.createGradientFill(["#1dfc5922", "#2f373333"]);
    gradient_fill_down = this.createGradientFill(["#45353533", "#f1294b22"], "lower");
    configuration = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            type: 'line',
            label: "Upload",
            borderColor: gradient_stroke_up,
            pointBorderColor: gradient_stroke_up,
            pointBackgroundColor: gradient_stroke_up,
            pointHoverBackgroundColor: gradient_stroke_up,
            pointHoverBorderColor: gradient_stroke_up,
            pointHoverRadius: 2,
            pointRadius: 0,
            steppedLine: true,
            fill: true,
            backgroundColor: gradient_fill_up,
            borderWidth: 1,
            lineTension: 0,
            data: []
          }, {
            type: 'line',
            label: "Download",
            borderColor: gradient_stroke_down,
            pointBorderColor: gradient_stroke_down,
            pointBackgroundColor: gradient_stroke_down,
            pointHoverBackgroundColor: gradient_stroke_down,
            pointHoverBorderColor: gradient_stroke_down,
            pointHoverRadius: 2,
            pointRadius: 0,
            steppedLine: true,
            fill: true,
            backgroundColor: gradient_fill_down,
            borderWidth: 1,
            lineTension: 0,
            data: []
          }, {
            type: 'line',
            label: 'Sent',
            borderColor: gradient_stroke_bgline_up,
            backgroundColor: "rgba(255,255,255,0.0)",
            pointRadius: 0,
            borderWidth: 1,
            pointHoverRadius: 2,
            pointHoverBackgroundColor: gradient_stroke_bgline_up,
            pointHoverBorderColor: gradient_stroke_bgline_up,
            fill: true,
            yAxisID: 'Request',
            steppedLine: true,
            lineTension: 0,
            data: []
          }, {
            type: 'line',
            label: 'Received',
            borderColor: gradient_stroke_bgline_down,
            backgroundColor: "rgba(255,255,255,0.0)",
            pointRadius: 0,
            borderWidth: 1,
            pointHoverRadius: 2,
            pointHoverBackgroundColor: gradient_stroke_bgline_down,
            pointHoverBorderColor: gradient_stroke_bgline_down,
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
          duration: 2000
        },
        legend: {
          display: false,
          position: "top",
          labels: {
            fontColor: 'white'
          }
        },
        title: {
          display: false
        },
        tooltips: {
          mode: "index",
          intersect: false,
          displayColors: false,
          xPadding: 10,
          yPadding: 10,
          cornerRadius: 0,
          caretPadding: 10,
          bodyFontColor: "rgba(255,255,255,0.6)",
          callbacks: {
            title: function(tootlip_items, data) {
              return Time.date(tootlip_items[0].xLabel, "long").replace(/:00$/, "");
            },
            label: function(tootlip_items, data) {
              if (data.datasets[tootlip_items.datasetIndex].yAxisID === "Request") {
                return data.datasets[tootlip_items.datasetIndex].label + ": " + Math.abs(tootlip_items.yLabel) + " requests";
              } else {
                return data.datasets[tootlip_items.datasetIndex].label + ": " + Text.formatSize(Math.abs(tootlip_items.yLabel));
              }
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
                fontColor: "rgba(100,110,132,1)",
                fontStyle: "bold",
                beginAtZero: true,
                suggestedMax: 30000000,
                suggestedMin: -30000000,
                display: true,
                padding: 30,
                callback: function(value) {
                  return Text.formatSize(Math.abs(value));
                }
              },
              gridLines: {
                drawTicks: true,
                drawBorder: false,
                display: true,
                zeroLineColor: "rgba(255,255,255,0.1)",
                tickMarkLength: 20,
                zeroLineBorderDashOffset: 100,
                color: "rgba(255,255,255,0.05)"
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
                color: "rgba(255,255,255,0.1)",
                display: false,
                offsetGridLines: true,
                drawBorder: false
              },
              ticks: {
                padding: 15,
                fontColor: "rgba(100,110,132,1)",
                fontStyle: "bold",
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
