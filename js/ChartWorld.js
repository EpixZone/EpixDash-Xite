(function() {

class ChartWorld {
  constructor() {
    this.render = this.render.bind(this);
    this.initCanvas = this.initCanvas.bind(this);
    this.drawPoints = this.drawPoints.bind(this);
    this.update = this.update.bind(this);
    this.points = [];
    this.need_update = false;
  }

  update() {

    /*
        @points = [
          {lat: 0, lon: 0},
          {lat: 30, lon: 30},
          {lat: 33.137551, lon: 129.902344},
          {lat: 0.351560, lon: 115.136719},
          {lat: 40.178873, lon: -8.261719},
          {lat: 52.482780, lon: -0.878906},
          {lat: 47.040182, lon: 19.511719},
          {lat: 38.548165, lon: -76.113281},
          {lat: 40.446947, lon: -122.871094}
          {lat: -16.972741, lon: 46.582031}
          {lat: -35.173808, lon: 19.511719}
          {lat: -33.431441, lon: 116.542969}
          {lat: -45.336702, lon: 168.222656}
          {lat: -54.977614, lon: -67.412109}
          {lat: 8.928487, lon: -62.314453}
          {lat: 65.20515, lon: -14.670696}
          {lat: 64.90863, lon: -21.70194625}
        ]
        return false
     */
    return Page.cmd("chartGetPeerLocations", [], (res) => {
      var country, country_db, i, item, items, j, len, len1, name, num, num_others, point, ref, ref1;
      this.points = res;
      country_db = {};
      items = Page.page_stats.country_list.items;
      items.length = 0;
      ref = this.points;
      for (i = 0, len = ref.length; i < len; i++) {
        point = ref[i];
        if (country_db[name = point.country] == null) {
          country_db[name] = 0;
        }
        country_db[point.country] += 1;
      }
      for (country in country_db) {
        num = country_db[country];
        items.push({
          title: country,
          value: num
        });
      }
      items.sort(function(a, b) {
        return b.value - a.value;
      });
      if (items.length > 15) {
        num_others = 0;
        ref1 = items.slice(14);
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          item = ref1[j];
          num_others += item.value;
        }
        items.length = 14;
        items.push({
          title: "Other",
          value: num_others,
          type: "other"
        });
      }
      this.drawPoints();
      return Page.projector.scheduleRender();
    });
  }

  drawPoints() {
    var i, left, len, point, ref, results, top;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ref = this.points;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      point = ref[i];
      left = (47 + (point.lon / 3.65)) * this.canvas.width / 100;
      top = (59 - (point.lat / 1.52)) * this.canvas.height / 100;
      results.push(this.ctx.fillRect(left, top, 2, 2));
    }
    return results;
  }

  initCanvas(node) {
    this.canvas = node;
    this.ctx = node.getContext("2d");
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.fillStyle = '#30758e';
    return this.drawPoints();
  }

  render() {
    if (this.need_update) {
      this.update();
      this.need_update = false;
    }
    return h("div.ChartWorld", [
      h("canvas.map-points", {
        width: 878,
        height: 371,
        afterCreate: this.initCanvas
      }), h("img.map", {
        src: "img/world.png"
      })
    ]);
  }
}

Object.assign(ChartWorld.prototype, LogMixin);
window.ChartWorld = ChartWorld;

})();
