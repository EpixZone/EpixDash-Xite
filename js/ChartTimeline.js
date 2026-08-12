(function() {

// The Transfer panel's footer: one continuous upload graph flowing across the
// seven day (or week) buckets - the strip the old dashboard had - over a row
// of clickable cells that drill ChartBig into a past window via
// ?date_added_to. The line is hourly data spanning the whole strip; the cells
// carry the labels and totals.
class ChartTimeline {
  constructor() {
    this.render = this.render.bind(this);
    this.update = this.update.bind(this);
    this.updateChart = this.updateChart.bind(this);
    this.initChart = this.initChart.bind(this);
    this.renderItem = this.renderItem.bind(this);
    var i, j;
    this.items = [];
    for (i = j = 6; j >= 0; i = --j) {
      this.items.push({
        id: i,
        title: "​",
        data: null,
        value: i
      });
    }
    this.line_data = null;
    this.chart_ctx = null;
    this.need_update = false;
  }

  initChart(node) {
    this.chart_canvas = node;
    this.chart_ctx = node.getContext("2d");
    if (this.line_data) {
      return this.updateChart();
    }
  }

  // One direction as a continuous area line on the shared scale (colors
  // resolved per draw so theme flips repaint). Solid up to NOW, then a dotted
  // line holds the level to the end of the strip - the "today isn't finished"
  // detail. The split is time-based, so a line that is all zeros so far (no
  // uploads yet) still shows its dotted future.
  drawLine(line_data, token, data_max, now_i) {
    var data, i, j, len, line_width, line_x, line_y;
    this.chart_ctx.lineWidth = 2;
    this.chart_ctx.setLineDash([]);
    this.chart_ctx.strokeStyle = Viz.color(token);
    this.chart_ctx.fillStyle = Viz.alpha(token, 0.12);
    this.chart_ctx.beginPath();
    this.chart_ctx.moveTo(-10, 101);
    line_width = 1400 / line_data.length;
    line_x = 0;
    line_y = 101;
    for (i = j = 0, len = line_data.length; j < len; i = ++j) {
      data = line_data[i];
      line_x = i * line_width;
      line_y = parseInt(101 - (data / data_max) * 92);
      this.chart_ctx.lineTo(line_x, line_y);
      if (now_i != null && i >= now_i) {
        break;
      }
    }
    this.chart_ctx.stroke();
    this.chart_ctx.lineTo(line_x, 120);
    this.chart_ctx.lineTo(-10, 120);
    this.chart_ctx.fill();
    if (now_i != null && line_x < 1390) {
      this.chart_ctx.beginPath();
      this.chart_ctx.strokeStyle = Viz.alpha(token, 0.5);
      this.chart_ctx.setLineDash([2, 4]);
      this.chart_ctx.moveTo(line_x, line_y);
      this.chart_ctx.lineTo(1400, line_y);
      this.chart_ctx.stroke();
      this.chart_ctx.setLineDash([]);
    }
  }

  // Both directions through the columns, same encoding as the chart above:
  // teal outbound, purple inbound, one shared scale so their sizes compare.
  updateChart() {
    var data_max, frac, now_i;
    if (!this.chart_ctx || !this.line_data || !this.line_data.length) {
      return;
    }
    this.chart_ctx.clearRect(0, 0, this.chart_canvas.width, this.chart_canvas.height);
    data_max = Math.max.apply(null, this.line_data.concat(this.line_data_down || []));
    if (!(data_max > 0)) {
      // All-zero (or empty) data: without this the division yields NaN and
      // the fills degenerate. Flat baseline.
      data_max = 1;
    }
    // Where "now" falls in the window; null when the whole window is past
    // (drilled into history - nothing is future there).
    now_i = null;
    if (this.window_to && Time.timestamp() < this.window_to) {
      frac = (Time.timestamp() - this.window_from) / (this.window_to - this.window_from);
      now_i = Math.min(this.line_data.length - 1, Math.max(0, Math.floor(frac * this.line_data.length)));
    }
    if (this.line_data_down && this.line_data_down.length) {
      this.drawLine(this.line_data_down, "in", data_max, now_i);
    }
    this.drawLine(this.line_data, "out", data_max, now_i);
    this.breakAtGaps();
  }

  // Erase the graph over the gaps between the day buttons, so each day's
  // slice visually belongs to its button instead of reading as one solid
  // rule drawn across all seven. Measured from the live layout (the gap is
  // 6px on desktop, 2px on phones).
  breakAtGaps() {
    var cell_w, cells_el, gap_px, gx, k, rect_w, scale;
    rect_w = this.chart_canvas.getBoundingClientRect().width;
    if (!(rect_w > 0)) {
      return;
    }
    cells_el = this.chart_canvas.parentNode.querySelector(".day-cells");
    gap_px = cells_el ? parseFloat(getComputedStyle(cells_el).columnGap) || 6 : 6;
    scale = 1400 / rect_w;
    cell_w = (rect_w - 6 * gap_px) / 7;
    for (k = 1; k < 7; k++) {
      gx = (k * (cell_w + gap_px) - gap_px - 1) * scale;
      this.chart_ctx.clearRect(gx, 0, (gap_px + 2) * scale, this.chart_canvas.height);
    }
  }

  update() {
    var c, data_down, data_up, date_added_from, date_added_to, day_down, day_up, group_steps, interval_step, query, step, type_id_down, type_id_up;
    // Both directions: this strip sits inside the TRANSFER panel, so a day
    // that only downloaded must not read "0 MB" (the old widget was
    // upload-only under an "Upload history" title).
    query = "SELECT\nMAX(date_added) AS date_added, type_id, SUM(value) AS sum\nFROM data\nWHERE type_id IN :type_ids AND date_added >= :date_added_from AND date_added <= :date_added_to\nGROUP BY type_id, strftime('%Y-%m-%d %H', date_added, 'unixepoch', 'localtime')\nORDER BY date_added DESC";
    if (Page.params.interval === "1w") {
      c = new Date();
      c.setDate(c.getDate() - (c.getDay() || 7) + 7);
      date_added_to = c.setHours(23, 59, 59, 0) / 1000;
      interval_step = 60 * 60 * 24 * 7;
      date_added_from = date_added_to - interval_step * 7;
      group_steps = 6;
    } else {
      date_added_to = (new Date()).setHours(23, 59, 59, 0) / 1000;
      interval_step = 60 * 60 * 24;
      date_added_from = date_added_to - interval_step * 7;
      group_steps = 2;
    }
    step = 60 * 60;
    type_id_up = Page.page_stats.type_id_db["file_bytes_sent"];
    type_id_down = Page.page_stats.type_id_db["file_bytes_recv"];
    data_up = {};
    data_down = {};
    day_up = {};
    day_down = {};
    this.window_from = date_added_from;
    this.window_to = date_added_to;
    return Page.cmd("chartDbQuery", [
      query, {
        type_ids: [type_id_up, type_id_down],
        date_added_from: date_added_from,
        date_added_to: date_added_to
      }
    ], (res) => {
      res = Page.rows(res);
      var bucket, data_date_added, data_from, day_data_down, day_data_up, day_from, day_name, day_string, day_to, group_down, group_up, i, j, k, l, len, m, ref, row, x;
      this.logStart("Parse result");
      this.line_data = [];
      this.line_data_down = [];
      for (j = 0, len = res.length; j < len; j++) {
        row = res[j];
        bucket = Math.ceil(row.date_added / step) * step;
        day_string = Time.dateIso(row.date_added * 1000);
        if (row.type_id === type_id_down) {
          data_down[bucket] = (data_down[bucket] || 0) + row.sum;
          day_down[day_string] = (day_down[day_string] || 0) + row.sum;
        } else {
          data_up[bucket] = (data_up[bucket] || 0) + row.sum;
          day_up[day_string] = (day_up[day_string] || 0) + row.sum;
        }
      }
      data_date_added = Math.ceil(date_added_from / step) * step;
      while (data_date_added <= date_added_to) {
        group_up = 0;
        group_down = 0;
        for (i = k = 0, ref = group_steps; 0 <= ref ? k <= ref : k >= ref; i = 0 <= ref ? ++k : --k) {
          group_up += data_up[data_date_added] || 0;
          group_down += data_down[data_date_added] || 0;
          data_date_added += step;
        }
        this.line_data.push(group_up);
        this.line_data_down.push(group_down);
      }
      this.items = [];
      for (i = l = 7; l >= 1; i = --l) {
        data_from = date_added_to - i * interval_step + 1;
        if (Page.params.interval === "1w") {
          day_data_up = 0;
          day_data_down = 0;
          for (x = m = 0; x <= 6; x = ++m) {
            day_data_up += day_up[Time.dateIso(data_from + (60 * 60 * 24 * x))] || 0;
            day_data_down += day_down[Time.dateIso(data_from + (60 * 60 * 24 * x))] || 0;
          }
          day_from = Time.date(data_from, "day");
          day_to = Time.date(data_from + interval_step - 1, "day");
          day_to = day_to.replace(day_from.split(" ")[0], "");
          day_name = day_from + " -" + day_to;
        } else {
          day_data_up = day_up[Time.dateIso(data_from)] || 0;
          day_data_down = day_down[Time.dateIso(data_from)] || 0;
          day_name = Time.weekDay(data_from);
        }
        this.items.push({
          id: i,
          title: day_name,
          data: day_data_up + day_data_down,
          data_up: day_data_up,
          data_down: day_data_down,
          value: data_from + interval_step - 1
        });
      }
      this.logEnd("Parse result", "data: " + this.line_data.length);
      Page.projector.scheduleRender();
      return this.updateChart();
    });
  }

  renderItem(item) {
    var classes, date_added_to;
    // Constructor placeholders (data === null, tiny epoch values) are not
    // drillable: a link built from them would navigate to 1970-01-01 and
    // blank the whole page on slow nodes.
    if (item.data == null) {
      return h("span.day-cell.placeholder", {
        key: item.id
      }, [
        h("span.day-name", "​"),
        h("span.day-val", "​")
      ]);
    }
    date_added_to = Time.dateIso(item.value);
    if (item.value >= Time.timestamp()) {
      date_added_to = "";
    }
    classes = {
      active: (Page.params.date_added_to || "") === date_added_to,
      empty: !item.data
    };
    return h("a.day-cell", {
      key: item.id,
      href: Page.createUrl("date_added_to", date_added_to),
      onclick: Page.handleLinkClick,
      title: item.title + ": ↑ " + (Text.formatSize(item.data_up) || "0 MB") + " · ↓ " + (Text.formatSize(item.data_down) || "0 MB"),
      classes: classes
    }, [
      // Full name on wide screens, first three letters on phones (CSS picks;
      // week ranges keep the full text in both).
      h("span.day-name", item.title),
      h("span.day-name-short", item.title.length > 5 && Page.params.interval !== "1w" ? item.title.slice(0, 3) : item.title),
      h("span.day-val", Text.formatSize(item.data) || "0 MB")
    ]);
  }

  render() {
    var ref;
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    return h("div.ChartTimeline", [
      h("canvas.day-spark", {
        afterCreate: this.initChart,
        width: 1400,
        height: 110,
        data: (ref = this.line_data) != null ? ref.length : void 0
      }),
      h("div.day-cells", this.items.map(this.renderItem))
    ]);
  }
}

Object.assign(ChartTimeline.prototype, LogMixin);
window.ChartTimeline = ChartTimeline;

})();
