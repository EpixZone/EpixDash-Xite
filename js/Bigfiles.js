(function() {

  class Bigfiles {
    constructor() {
      this.render = this.render.bind(this);
      this.getHref = this.getHref.bind(this);
      this.updateFiles = this.updateFiles.bind(this);
      this.files = new SiteFiles(this);
      this.files.mode = "bigfiles";
      this.files.limit = 100;
      this.files.update = this.updateFiles;
      this.row = {
        "address": "bigfiles"
      };
    }

    updateFiles(cb) {
      var orderby = this.files.orderby + (this.files.orderby_desc ? " DESC" : "");
      Page.cmd("optionalFileList", {
        address: "all",
        filter: "downloaded,bigfile",
        limit: this.files.limit + 1,
        orderby: orderby
      }, (res) => {
        for (var i = 0, len = res.length; i < len; i++) {
          var row = res[i];
          row.site = Page.site_list.sites_byaddress[row.address];
        }
        this.files.items = res.slice(0, this.files.limit);
        this.files.loaded = true;
        this.files.has_more = res.length > this.files.limit;
        Page.projector.scheduleRender();
        if (typeof cb === "function") cb();
      });
    }

    getHref(row) {
      return row.inner_path;
    }

    render() {
      if (!this.files.items.length) {
        return [];
      }
      return h("div.site", [
        h("div.title", [h("h3.name", "Bigfiles")]),
        this.files.render()
      ]);
    }
  }

  Object.assign(Bigfiles.prototype, LogMixin);
  window.Bigfiles = Bigfiles;

})();
