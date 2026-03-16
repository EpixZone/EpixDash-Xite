(function() {

class StatList {
  constructor() {
    this.render = this.render.bind(this);
    this.renderItem = this.renderItem.bind(this);
    this.items = [];
  }

  renderItem(item) {
    return h("div.stat-list-item", {
      key: item.title,
      classes: {
        other: item.type === "other"
      }
    }, h("div.title", item.title), h("div.value", item.value + " peers"));
  }

  render() {
    return h("div.StatList", [h("h4", "Top country"), h("div.stat-list-items", this.items.map(this.renderItem))]);
  }
}

Object.assign(StatList.prototype, LogMixin);
window.StatList = StatList;

})();
