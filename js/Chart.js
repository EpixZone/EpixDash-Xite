(function() {

// Mini stat panel (Connections / Total size): header with the headline value,
// a full-bleed sparkline band, then the supporting facts as chips in normal
// flow. The old anatomy floated mono text over a 900x400 canvas, which
// overlapped on narrow screens. Draws its own canvas-2D - no Chart.js - and
// MUST keep its window.Chart slot claimed before the lazy Chart.js bundle
// overwrites it (NetworkStats constructs instances in its own constructor).
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
    this.facts = [];
    this.type_data = null;
    this.chart_ctx = null;
    // Which --viz-* token strokes the band; resolved at every draw so the
    // canvas follows theme flips.
    this.chart_token = "out";
    this.need_update = false;
  }

  initChart(node) {
    this.chart_canvas = node;
    this.chart_ctx = node.getContext("2d");
    if (this.line_data.length) {
      return this.updateChart();
    }
  }

  // Translated at RENDER time: the constructor runs before Translate.js has
  // its language file, so a title baked there would stay English forever.
  getTitle() {
    return this.title_key ? _(this.title_key) : this.title;
  }

  update() {
    var query_type_data, type_name;
    Page.cmd("chartDbQuery", this.getChartQuery(), (res) => {
      res = Page.rows(res);
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
      res = Page.rows(res);
      var j, len, row, type_data;
      type_data = {};
      for (j = 0, len = res.length; j < len; j++) {
        row = res[j];
        type_data[Page.page_stats.type_name_db[row.type_id]] = row.value;
      }
      if (!Object.keys(type_data).length) {
        // Caught the chart db mid-collection (the newest-row subquery matched
        // a half-written batch) or before the first collection: retry shortly
        // instead of rendering "undefined of undefined".
        if ((this.type_retries = (this.type_retries || 0) + 1) <= 5) {
          setTimeout((() => {
            this.need_update = true;
            return Page.projector.scheduleRender();
          }), 2500);
        }
        return;
      }
      this.type_retries = 0;
      // Kept for other readers (the KPI row's peer tile).
      this.type_data = type_data;
      this.facts = typeof this.formatFacts === "function" ? this.formatFacts(type_data) : [];
      this.value = typeof this.formatValue === "function" ? this.formatValue(type_data) : void 0;
      return Page.projector.scheduleRender();
    });
  }

  updateChart() {
    var ch, data, data_max, data_min, data_range, i, j, len, line_y, pad, ref, step, w;
    if (!this.chart_ctx || !this.line_data.length) {
      return;
    }
    w = this.chart_canvas.width;
    ch = this.chart_canvas.height;
    pad = 6;
    this.chart_ctx.clearRect(0, 0, w, ch);
    this.chart_ctx.lineWidth = 3;
    this.chart_ctx.lineJoin = "round";
    this.chart_ctx.strokeStyle = Viz.color(this.chart_token);
    this.chart_ctx.fillStyle = Viz.alpha(this.chart_token, 0.12);
    this.chart_ctx.beginPath();
    step = w / Math.max(1, this.line_data.length - 1);
    data_max = Math.max.apply(null, this.line_data);
    data_min = Math.min.apply(null, this.line_data);
    data_range = data_max - data_min;
    line_y = ch / 2;
    ref = this.line_data;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      data = ref[i];
      // Flat data (range 0) draws a midline instead of dividing by zero.
      line_y = data_range > 0 ? (ch - pad) - ((data - data_min) / data_range) * (ch - pad * 2) : ch / 2;
      if (i === 0) {
        this.chart_ctx.moveTo(0, line_y);
      } else {
        this.chart_ctx.lineTo(i * step, line_y);
      }
    }
    this.chart_ctx.stroke();
    this.chart_ctx.lineTo(w + 10, line_y);
    this.chart_ctx.lineTo(w + 10, ch + 10);
    this.chart_ctx.lineTo(-10, ch + 10);
    return this.chart_ctx.fill();
  }

  renderFact(fact, i) {
    return h("span.fact", {
      key: fact.key || i,
      classes: {
        "fact-ok": fact.ink === "ok",
        "fact-warn": fact.ink === "warn",
        "fact-bad": fact.ink === "bad"
      }
    }, [
      fact.ink ? h("span.fact-dot", {"aria-hidden": "true"}) : void 0,
      h("span.fact-label", fact.label),
      fact.meter ? h("span.fact-meter", [
        h("span.fact-meter-fill", {
          styles: {
            width: Math.min(100, Math.round(fact.meter.num / Math.max(1, fact.meter.den) * 100)) + "%"
          }
        })
      ]) : void 0,
      h("span.fact-value", fact.value)
    ]);
  }

  render() {
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    return h("div.Chart.spanel", [
      h("div.phead", [
        h("span.plabel", this.getTitle()),
        h("span.pval", this.value || "–")
      ]),
      h("div.band", [
        h("canvas.canvas", {
          afterCreate: this.initChart,
          width: 900,
          height: 132
        })
      ]),
      h("div.pfacts", this.facts.map((fact, i) => {
        return this.renderFact(fact, i);
      }))
    ]);
  }
}

Object.assign(Chart.prototype, LogMixin);
window.Chart = Chart;

})();
