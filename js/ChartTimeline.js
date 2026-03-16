(function() {

class ChartTimeline {
  constructor() {
    this.render = this.render.bind(this);
    this.update = this.update.bind(this);
    this.updateChart = this.updateChart.bind(this);
    this.initChart = this.initChart.bind(this);
    var i, j;
    this.items = [];
    for (i = j = 6; j >= 0; i = --j) {
      this.items.push({
        id: i,
        title: "\u200B",
        data: "\u200B",
        value: i,
        active: false
      });
    }
    this.active_id = 0;
    this.chart_ctx = null;
    this.need_update = false;
    this.line_data = null;
  }

  initChart(node) {
    this.chart_canvas = node;
    this.chart_ctx = node.getContext("2d");
    if (this.line_data) {
      return this.updateChart();
    }
  }

  updateChart() {
    var data, data_last_i, data_max, i, j, len, line_width, line_x, line_y, ref, val;
    this.chart_ctx.clearRect(0, 0, this.chart_canvas.width, this.chart_canvas.height);
    this.chart_ctx.lineWidth = 0;
    this.chart_ctx.fillStyle = '#EDC54B';
    this.chart_ctx.beginPath();
    this.chart_ctx.moveTo(-10, 0);
    data_max = Math.max.apply(null, this.line_data);
    data_last_i = ((() => {
      var j, len, ref, results;
      ref = this.line_data;
      results = [];
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        val = ref[i];
        if (val > 0) {
          results.push(i);
        }
      }
      return results;
    })()).pop();
    line_width = 1400 / this.line_data.length;
    ref = this.line_data;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      data = ref[i];
      line_x = i * line_width;
      line_y = parseInt(101 - (data / data_max) * 100);
      this.chart_ctx.lineTo(line_x, line_y);
      if (i === data_last_i) {
        break;
      }
    }
    this.chart_ctx.lineTo(line_x, 120);
    this.chart_ctx.lineTo(0, 120);
    this.chart_ctx.fill();
    if (data_last_i > 36) {
      this.chart_ctx.beginPath();
      this.chart_ctx.lineWidth = 0;
      this.chart_ctx.strokeStyle = '#EDC54B';
      this.chart_ctx.setLineDash([0, 1, 1]);
      this.chart_ctx.moveTo(line_x, line_y);
      this.chart_ctx.lineTo(1500, line_y);
      return this.chart_ctx.stroke();
    }
  }

  update() {
    var c, data, date_added_from, date_added_to, day_total, group_steps, interval_step, query, step, type_id;
    query = "SELECT\nMAX(date_added) AS date_added, AVG(value) AS avg, SUM(value) AS sum\nFROM data\nWHERE type_id = :type_id AND date_added >= :date_added_from AND date_added <= :date_added_to\nGROUP BY strftime('%Y-%m-%d %H', date_added, 'unixepoch', 'localtime')\nORDER BY date_added DESC";
    if (Page.params.interval === "1w") {
      c = new Date();
      c.setDate(c.getDate() - (c.getDay() || 7) + 7);
      date_added_to = c.setHours(23, 59, 59, 0) / 1000;
      interval_step = 60 * 60 * 24 * 7;
      date_added_from = date_added_to - interval_step * 7;
      group_steps = 6;
    } else if (Page.params.interval === "1m") {
      c = new Date();
      c.setDate(30);
      date_added_to = c.setHours(23, 59, 59, 0) / 1000;
      interval_step = 60 * 60 * 24 * 30;
      date_added_from = date_added_to - interval_step * 30;
      group_steps = 24 * 3;
    } else {
      date_added_to = (new Date()).setHours(23, 59, 59, 0) / 1000;
      interval_step = 60 * 60 * 24;
      date_added_from = date_added_to - interval_step * 7;
      group_steps = 2;
    }
    step = 60 * 60;
    type_id = Page.page_stats.type_id_db["file_bytes_sent"];
    data = {};
    day_total = {};
    return Page.cmd("chartDbQuery", [
      query, {
        type_id: type_id,
        date_added_from: date_added_from,
        date_added_to: date_added_to
      }
    ], (res) => {
      var data_date_added, data_from, data_to, day_data, day_from, day_name, day_string, day_to, group_step_data, i, j, k, l, len, m, n, ref, row, x;
      this.logStart("Parse result");
      this.line_data = [];
      for (j = 0, len = res.length; j < len; j++) {
        row = res[j];
        data[Math.ceil(row.date_added / step) * step] = row.sum;
        day_string = Time.dateIso(row.date_added * 1000);
        if (day_total[day_string] == null) {
          day_total[day_string] = 0;
        }
        day_total[day_string] += row.sum;
      }
      data_date_added = Math.ceil(date_added_from / step) * step;
      while (data_date_added <= date_added_to) {
        group_step_data = 0;
        for (i = k = 0, ref = group_steps; 0 <= ref ? k <= ref : k >= ref; i = 0 <= ref ? ++k : --k) {
          group_step_data += data[data_date_added] || 0;
          data_date_added += step;
        }
        this.line_data.push(group_step_data);
      }
      this.items = [];
      for (i = l = 7; l >= 1; i = --l) {
        data_from = date_added_to - i * interval_step + 1;
        data_to = data_from + interval_step - 1;
        if (Page.params.interval === "1w") {
          day_data = 0;
          for (x = m = 0; m <= 6; x = ++m) {
            day_data += day_total[Time.dateIso(data_from + (60 * 60 * 24 * x))] || 0;
          }
          day_from = Time.date(data_from, "day");
          day_to = Time.date(data_from + interval_step - 1, "day");
          day_to = day_to.replace(day_from.split(" ")[0], "");
          day_name = day_from + " - " + day_to;
        } else if (Page.params.interval === "1m") {
          day_data = 0;
          for (x = n = 0; n <= 30; x = ++n) {
            day_data += day_total[Time.dateIso(data_from + (60 * 60 * 24 * x))] || 0;
          }
          day_name = Time.date(data_from, "month");
        } else {
          day_data = day_total[Time.dateIso(data_from)];
          day_name = Time.weekDay(data_from);
        }
        this.items.push({
          id: i,
          title: day_name,
          data: day_data,
          value: data_to
        });
      }
      this.logEnd("Parse result", "data: " + this.line_data.length);
      Page.projector.scheduleRender();
      return this.updateChart();
    });
  }

  renderItem(item) {
    var classes, date_added_to;
    date_added_to = Time.dateIso(item.value);
    if (item.value >= Time.timestamp()) {
      date_added_to = "";
    }
    classes = {
      active: (Page.params.date_added_to || "") === date_added_to
    };
    return h("a.timeline-item", {
      key: item.title,
      enterAnimation: Animation.show,
      delay: item.id * 0.05,
      href: Page.createUrl("date_added_to", date_added_to),
      onclick: Page.handleLinkClick,
      classes: classes
    }, h("span.title", item.title), h("span.data", Text.formatSize(item.data) || "0 MB"));
  }

  render() {
    var ref;
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    return h("div.ChartTimeline", [
      h("div.timeline-borders", this.items.map((item) => {
        var date_added_to;
        date_added_to = Time.dateIso(item.value);
        if (item.value >= Time.timestamp()) {
          date_added_to = "";
        }
        return h("div.timeline-border", {
          key: item.id,
          classes: {
            active: (Page.params.date_added_to || "") === date_added_to
          }
        });
      })), h("canvas.chart", {
        afterCreate: this.initChart,
        width: 1400,
        height: 100,
        data: (ref = this.line_data) != null ? ref.length : void 0,
        delay: 0.3,
        updateAnimation: Animation.show
      }), h("div.timeline-items", this.items.map((item) => {
        return this.renderItem(item);
      }))
    ]);
  }
}

Object.assign(ChartTimeline.prototype, LogMixin);
window.ChartTimeline = ChartTimeline;

})();
