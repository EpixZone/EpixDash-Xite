(function() {

class Chart {
  constructor() {
    this.render = this.render.bind(this);
    this.updateChart = this.updateChart.bind(this);
    this.update = this.update.bind(this);
    this.getTitle = this.getTitle.bind(this);
    this.initChart = this.initChart.bind(this);
    this.query = "";
    this.title = "";
    this.value = "";
    this.line_data = [];
    this.details = [];
    this.colorize = "cc00ff0a";
    this.chart_ctx = null;
    this.chart_type_name = null;
    this.need_update = false;
  }

  initChart(node) {
    this.chart_canvas = node;
    return this.chart_ctx = node.getContext("2d");
  }

  getTitle() {
    return this.title;
  }

  update() {
    var query_type_data, type_name;
    Page.cmd("chartDbQuery", this.getChartQuery(), (res) => {
      var j, len, row;
      this.line_data = [];
      for (j = 0, len = res.length; j < len; j++) {
        row = res[j];
        this.line_data.push(row.value);
      }
      this.line_data.reverse();
      return this.updateChart();
    });
    query_type_data = "SELECT * FROM data\nWHERE\n type_id IN :type_ids AND\n date_added = (SELECT date_added FROM data ORDER BY data_id DESC LIMIT 1)";
    return Page.cmd("chartDbQuery", [
      query_type_data, {
        type_ids: (() => {
          var j, len, ref, results;
          ref = this.type_names;
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            type_name = ref[j];
            results.push(Page.page_stats.type_id_db[type_name]);
          }
          return results;
        })()
      }
    ], (res) => {
      var j, len, row, type_data;
      type_data = {};
      for (j = 0, len = res.length; j < len; j++) {
        row = res[j];
        type_data[Page.page_stats.type_name_db[row.type_id]] = row.value;
      }
      this.details = typeof this.formatDetails === "function" ? this.formatDetails(type_data) : void 0;
      this.value = typeof this.formatValue === "function" ? this.formatValue(type_data) : void 0;
      return Page.projector.scheduleRender();
    });
  }

  updateChart() {
    var data, data_max, data_min, gradient, i, j, len, line_y, ref, step, stroke;
    this.chart_ctx.clearRect(0, 0, this.chart_canvas.width, this.chart_canvas.height);
    stroke = this.chart_ctx.createLinearGradient(0, 0, 900, 0);
    stroke.addColorStop(0, this.chart_stroke[0]);
    stroke.addColorStop(1, this.chart_stroke[1]);
    this.chart_ctx.lineWidth = 4;
    this.chart_ctx.strokeStyle = stroke;
    this.chart_ctx.fillStyle = '#66666611';
    gradient = this.chart_ctx.createLinearGradient(0, 200, 0, 400);
    gradient.addColorStop(0, "#42324599");
    gradient.addColorStop(1, "#2C2E3700");
    this.chart_ctx.fillStyle = gradient;
    this.chart_ctx.beginPath();
    this.chart_ctx.moveTo(-10, 0);
    step = 900 / (this.line_data.length - 2);
    data_max = Math.max.apply(null, this.line_data);
    data_min = Math.min.apply(null, this.line_data);
    ref = this.line_data;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      data = ref[i];
      line_y = 250 - ((data - data_min) / (data_max - data_min)) * 120;
      this.chart_ctx.lineTo((i - 1) * step, line_y);
    }
    this.chart_ctx.lineTo((i + 1) * step, line_y);
    this.chart_ctx.lineTo(i * step, 450);
    this.chart_ctx.lineTo(0, 450);
    this.chart_ctx.fill();
    this.chart_ctx.stroke();
    return this.chart_ctx.shadowBlur = 0;
  }

  render() {
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    return h("div.Chart", {
      style: "background-image: radial-gradient(at 29% top, #eaaeda05, " + this.colorize + ")"
    }, [
      h("div.titles", [
        h("div.title", this.getTitle()), h("div.value", this.value), h("div.details", this.details.map((detail) => {
          return [
            detail, h("br", {
              key: detail
            })
          ];
        }))
      ]), h("canvas.canvas", {
        afterCreate: this.initChart,
        width: 900,
        height: 400
      })
    ]);
  }
}

Object.assign(Chart.prototype, LogMixin);
window.Chart = Chart;

})();
