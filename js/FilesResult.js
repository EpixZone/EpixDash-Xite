(function() {

  class FilesResult {
    constructor() {
      this.render = this.render.bind(this);
      this.getHref = this.getHref.bind(this);
      this.setFilter = this.setFilter.bind(this);
      this.updateFiles = this.updateFiles.bind(this);
      this.files = new SiteFiles(this);
      this.files.mode = "result";
      this.files.limit = 20;
      this.files.update = this.updateFiles;
      this.row = {
        "address": "result"
      };
      this.filter_inner_path = "";
    }

    updateFiles(cb) {
      this.log("Update FilesResult", this.filter_inner_path);
      var orderby = this.files.orderby + (this.files.orderby_desc ? " DESC" : "");
      Page.cmd("optionalFileList", {
        address: "all",
        filter: "downloaded",
        filter_inner_path: "%" + this.filter_inner_path + "%",
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

    setFilter(filter, cb) {
      this.filter_inner_path = filter;
      this.updateFiles(cb);
    }

    getHref(row) {
      return row.inner_path;
    }

    render() {
      if (!this.filter_inner_path) {
        return [];
      }
      if (!this.files.items.length) {
        return h("div.empty", [
          h("h4", "Filter result: " + this.filter_inner_path),
          h("small", "No files found")
        ]);
      }
      return h("div.site", [
        h("div.title", [h("h3.name", "Filter result: " + this.filter_inner_path)]),
        this.files.render()
      ]);
    }
  }

  Object.assign(FilesResult.prototype, LogMixin);
  window.FilesResult = FilesResult;

})();
