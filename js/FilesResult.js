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
        res = Page.rows(res);
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
        return h("div.spanel.p-empty", [
          h("div.phead", [h("span.plabel", _("Search results"))]),
          h("div.empty-title", _("No files match") + " \u201C" + this.filter_inner_path + "\u201D")
        ]);
      }
      return h("div.site.spanel.fpanel.site-result", [
        h("div.phead", [
          h("span.plabel", _("Search results")),
          h("span.pval", this.files.items.length + (this.files.has_more ? "+" : "") + " " + _("matches"))
        ]),
        this.files.render()
      ]);
    }
  }

  Object.assign(FilesResult.prototype, LogMixin);
  window.FilesResult = FilesResult;

})();
