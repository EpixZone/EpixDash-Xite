(function() {

class ChartLegend {
  constructor() {
    this.renderItem = this.renderItem.bind(this);
    this.items_left = [];
    this.items_right = [];
  }

  renderItem(item) {
    var hidden, value;
    this.i += 1;
    if (item.dot == null) {
      item.dot = "\u25CF";
    }
    value = item.getValue();
    hidden = !value;
    if (item.post) {
      value += " " + item.post;
    }
    if (item.type === "ratio") {
      return h("div.legend-item", {
        classes: {
          hidden: hidden
        }
      }, [
        h("div.title", item.title), h("div.value", [
          h("span", {
            updateAnimation: Animation.show,
            delay: this.i * 0.1
          }, Math.round(value * 10) / 10), h("div.dots-container", [
            h("span.dots.dots-fg", {
              style: "width: " + (Math.min(value, 5) * 11.5) + "px; color: " + item.color
            }, item.dot.repeat(5)), h("span.dots.dots-bg", item.dot.repeat(5))
          ])
        ])
      ]);
    } else {
      return h("div.legend-item", {
        classes: {
          hidden: hidden
        }
      }, [
        h("div.title", [
          h("span.dot", {
            style: "color: " + item.color
          }, item.dot + " "), item.title
        ]), h("div.value", {
          updateAnimation: Animation.show,
          delay: this.i * 0.1
        }, value)
      ]);
    }
  }

  render() {
    this.i = 0;
    return h("div.ChartLegend", h("div.legend-items.align-left", this.items_left.map(this.renderItem)), h("div.legend-items.align-right", this.items_right.map(this.renderItem)));
  }
}

Object.assign(ChartLegend.prototype, LogMixin);
window.ChartLegend = ChartLegend;

})();
