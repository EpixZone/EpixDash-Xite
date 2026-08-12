(function() {

// The country rail beside the peer map: ranked rows with a thin proportional
// bar in the map's dot color, count right in tabular numerals. Fed by
// ChartWorld from the same peer-locations answer.
class StatList {
  constructor() {
    this.render = this.render.bind(this);
    this.renderItem = this.renderItem.bind(this);
    this.items = [];
    this.total_peers = 0;
    this.total_countries = 0;
  }

  renderItem(item, max_value) {
    return h("div.stat-list-item", {
      key: item.title,
      classes: {
        other: item.type === "other"
      }
    }, [
      h("span.title", item.title),
      item.type === "other" ? h("span.bar") : h("span.bar", [
        h("span.bar-fill", {
          styles: {
            width: Math.max(2, Math.round(item.value / Math.max(1, max_value) * 100)) + "%"
          }
        })
      ]),
      h("span.value", "" + item.value)
    ]);
  }

  render() {
    var item, j, len, max_value, ref;
    max_value = 1;
    ref = this.items;
    for (j = 0, len = ref.length; j < len; j++) {
      item = ref[j];
      if (item.type !== "other") {
        max_value = Math.max(max_value, item.value);
      }
    }
    return h("div.StatList", [
      h("div.stat-list-head", [
        h("h4", _("Top countries")),
        this.total_peers ? h("span.stat-list-meta", this.total_peers + _(" peers") + " · " + this.total_countries + _(" countries")) : void 0
      ]),
      h("div.stat-list-items", this.items.length ? this.items.map((item) => {
        return this.renderItem(item, max_value);
      }) : [h("div.stat-list-empty", _("No peer locations yet"))])
    ]);
  }
}

Object.assign(StatList.prototype, LogMixin);
window.StatList = StatList;

})();
