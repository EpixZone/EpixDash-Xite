(function() {

  class PageFiles {
    constructor() {
      this.onSiteInfo = this.onSiteInfo.bind(this);
      this.render = this.render.bind(this);
      this.updateAllFiles = this.updateAllFiles.bind(this);
      this.updateOptionalStats = this.updateOptionalStats.bind(this);
      this.renderFilter = this.renderFilter.bind(this);
      this.handleFilterKeyup = this.handleFilterKeyup.bind(this);
      this.handleFilterInput = this.handleFilterInput.bind(this);
      this.renderSelectbar = this.renderSelectbar.bind(this);
      this.renderTotalbar = this.renderTotalbar.bind(this);
      this.handleLimitInput = this.handleLimitInput.bind(this);
      this.handleTotalbarMenu = this.handleTotalbarMenu.bind(this);
      this.handleLimitSetClick = this.handleLimitSetClick.bind(this);
      this.handleLimitCancelClick = this.handleLimitCancelClick.bind(this);
      this.handleEditlimitClick = this.handleEditlimitClick.bind(this);
      this.handleTotalbarOut = this.handleTotalbarOut.bind(this);
      this.handleTotalbarOver = this.handleTotalbarOver.bind(this);
      this.handleSelectbarDelete = this.handleSelectbarDelete.bind(this);
      this.handleSelectbarUnpin = this.handleSelectbarUnpin.bind(this);
      this.handleSelectbarPin = this.handleSelectbarPin.bind(this);
      this.handleSelectbarCancel = this.handleSelectbarCancel.bind(this);
      this.checkSelectedFiles = this.checkSelectedFiles.bind(this);
      this.getSites = this.getSites.bind(this);
      this.need_update = true;
      this.updating_files = 0;
      this.optional_stats = {
        limit: "0",
        free: "0",
        used: "0"
      };
      this.updateOptionalStats();
      this.hover_totalbar = false;
      this.menu_totalbar = new Menu();
      this.editing_limit = false;
      this.limit = "";
      this.selected_files_num = 0;
      this.selected_files_size = 0;
      this.selected_files_pinned = 0;
      this.bigfiles = new Bigfiles();
      this.result = new FilesResult();
      this.display_limit = 0;
      this.filtering = "";
    }

    getSites() {
      if (this.result.filter_inner_path) {
        return this.result.files.getSites();
      }
      if (this.bigfiles.files.items.length > 0) {
        return this.bigfiles.files.getSites().concat(Page.site_list.sites);
      } else {
        return Page.site_list.sites;
      }
    }

    checkSelectedFiles() {
      this.selected_files_num = 0;
      this.selected_files_size = 0;
      this.selected_files_pinned = 0;
      var sites = this.getSites();
      for (var i = 0, len = sites.length; i < len; i++) {
        var site = sites[i];
        for (var j = 0, len1 = site.files.items.length; j < len1; j++) {
          var site_file = site.files.items[j];
          if (!site.files.selected[site_file.inner_path]) {
            continue;
          }
          this.selected_files_num += 1;
          this.selected_files_size += site_file.size;
          this.selected_files_pinned += site_file.is_pinned;
        }
      }
    }

    handleSelectbarCancel() {
      var sites = this.getSites();
      for (var i = 0, len = sites.length; i < len; i++) {
        var site = sites[i];
        for (var j = 0, len1 = site.files.items.length; j < len1; j++) {
          for (var key in site.files.selected) {
            delete site.files.selected[key];
          }
        }
      }
      this.checkSelectedFiles();
      Page.projector.scheduleRender();
      return false;
    }

    handleSelectbarPin() {
      var sites = this.getSites();
      for (var i = 0, len = sites.length; i < len; i++) {
        var site = sites[i];
        var inner_paths = [];
        for (var j = 0, len1 = site.files.items.length; j < len1; j++) {
          var site_file = site.files.items[j];
          if (site.files.selected[site_file.inner_path]) {
            inner_paths.push(site_file.inner_path);
          }
        }
        if (inner_paths.length > 0) {
          ((site) => {
            Page.cmd("optionalFilePin", [inner_paths, site.row.address], () => {
              site.files.update();
            });
          })(site);
        }
      }
      return this.handleSelectbarCancel();
    }

    handleSelectbarUnpin() {
      var sites = this.getSites();
      for (var i = 0, len = sites.length; i < len; i++) {
        var site = sites[i];
        var inner_paths = [];
        for (var j = 0, len1 = site.files.items.length; j < len1; j++) {
          var site_file = site.files.items[j];
          if (site.files.selected[site_file.inner_path]) {
            inner_paths.push(site_file.inner_path);
          }
        }
        if (inner_paths.length > 0) {
          ((site) => {
            Page.cmd("optionalFileUnpin", [inner_paths, site.row.address], () => {
              site.files.update();
            });
          })(site);
        }
      }
      return this.handleSelectbarCancel();
    }

    handleSelectbarDelete() {
      var sites = this.getSites();
      for (var i = 0, len = sites.length; i < len; i++) {
        var site = sites[i];
        var inner_paths = [];
        for (var j = 0, len1 = site.files.items.length; j < len1; j++) {
          var site_file = site.files.items[j];
          if (site.files.selected[site_file.inner_path]) {
            inner_paths.push(site_file.inner_path);
          }
        }
        if (inner_paths.length > 0) {
          for (var k = 0, len2 = inner_paths.length; k < len2; k++) {
            var inner_path = inner_paths[k];
            Page.cmd("optionalFileDelete", [inner_path, site.row.address]);
          }
          site.files.update();
        }
      }
      Page.site_list.update();
      return this.handleSelectbarCancel();
    }

    handleTotalbarOver() {
      this.hover_totalbar = true;
      Page.projector.scheduleRender();
    }

    handleTotalbarOut() {
      this.hover_totalbar = false;
      Page.projector.scheduleRender();
    }

    handleEditlimitClick() {
      this.editing_limit = true;
      return false;
    }

    handleLimitCancelClick() {
      this.editing_limit = false;
      return false;
    }

    handleLimitSetClick() {
      var limit;
      if (this.limit.indexOf("M") > 0 || this.limit.indexOf("m") > 0) {
        limit = (parseFloat(this.limit) / 1024).toString();
      } else if (this.limit.indexOf("%") > 0) {
        limit = parseFloat(this.limit) + "%";
      } else {
        limit = parseFloat(this.limit).toString();
      }
      this.optional_stats.limit = limit;
      Page.cmd("optionalLimitSet", limit);
      this.editing_limit = false;
      return false;
    }

    handleTotalbarMenu() {
      this.menu_totalbar.items = [];
      this.menu_totalbar.items.push([_("Edit optional files limit"), this.handleEditlimitClick]);
      if (this.menu_totalbar.visible) {
        this.menu_totalbar.hide();
      } else {
        this.menu_totalbar.show();
      }
      return false;
    }

    handleLimitInput(e) {
      this.limit = e.target.value;
    }

    renderTotalbar() {
      var limit, percent_limit, percent_optional_downloaded, percent_optional_used, total_space_limited;
      if (this.editing_limit && parseFloat(this.limit) > 0) {
        if (this.limit.indexOf("M") > 0 || this.limit.indexOf("m") > 0) {
          limit = (parseFloat(this.limit) / 1024) + "GB";
        } else {
          limit = this.limit;
        }
      } else {
        limit = this.optional_stats.limit;
      }
      if (limit.endsWith("%")) {
        limit = this.optional_stats.free * (parseFloat(limit) / 100);
      } else {
        limit = parseFloat(limit) * 1024 * 1024 * 1024;
      }
      if (this.optional_stats.free > limit * 1.8 && !this.hover_totalbar) {
        total_space_limited = limit * 1.8;
      } else {
        total_space_limited = this.optional_stats.free;
      }
      percent_optional_downloaded = (this.optional_stats.used / limit) * 100;
      percent_optional_used = percent_optional_downloaded * (limit / total_space_limited);
      percent_limit = (limit / total_space_limited) * 100;
      return h("div#PageFilesDashboard", {
        classes: {
          editing: this.editing_limit
        }
      }, [
        h("div.totalbar-edit", [
          h("span.title", _("Optional files limit:")),
          h("input", {
            type: "text",
            value: this.limit,
            oninput: this.handleLimitInput
          }),
          h("a.set", {
            href: "#",
            onclick: this.handleLimitSetClick
          }, _("Set")),
          h("a.cancel", {
            href: "#",
            onclick: this.handleLimitCancelClick
          }, _("Cancel"))
        ]),
        h("a.totalbar-title", {
          href: "#",
          title: _("Space current used by optional files"),
          onclick: this.handleTotalbarMenu
        }, _("Used: ") + (Text.formatSize(this.optional_stats.used)) + " / " + (Text.formatSize(limit)) + " (" + (Math.round(percent_optional_downloaded)) + "%)",
          h("div.icon-arrow-down")
        ),
        this.menu_totalbar.render(),
        h("div.totalbar", {
          onmouseover: this.handleTotalbarOver,
          onmouseout: this.handleTotalbarOut
        },
          h("div.totalbar-used", {
            style: "width: " + percent_optional_used + "%"
          }),
          h("div.totalbar-limitbar", {
            style: "width: " + percent_limit + "%"
          }),
          h("div.totalbar-limit", {
            style: "margin-left: " + percent_limit + "%"
          }, h("span", {
            title: "Space allowed to used by optional files"
          }, Text.formatSize(limit))),
          h("div.totalbar-hddfree",
            h("span", {
              title: "Total free space on your storage"
            }, [
              Text.formatSize(this.optional_stats.free),
              h("div.arrow", {
                style: this.optional_stats.free > total_space_limited ? "width: 10px" : "width: 0px"
              }, " \u25B6")
            ])
          )
        )
      ]);
    }

    renderSelectbar() {
      return h("div.selectbar", {
        classes: {
          visible: this.selected_files_num > 0
        }
      }, [
        _("Selected:"),
        h("span.info", [
          h("span.num", this.selected_files_num + _(" files")),
          h("span.size", "(" + (Text.formatSize(this.selected_files_size)) + ")")
        ]),
        h("div.actions", [
          this.selected_files_pinned > this.selected_files_num / 2 ? h("a.action.pin.unpin", {
            href: "#",
            onclick: this.handleSelectbarUnpin
          }, _("UnPin")) : h("a.action.pin", {
            href: "#",
            title: _("Don't delete these files automatically"),
            onclick: this.handleSelectbarPin
          }, _("Pin")),
          h("a.action.delete", {
            href: "#",
            onclick: this.handleSelectbarDelete
          }, _("Delete"))
        ]),
        h("a.cancel.link", {
          href: "#",
          onclick: this.handleSelectbarCancel
        }, _("Cancel"))
      ]);
    }

    handleFilterInput(e) {
      if (this.input_timer) {
        clearInterval(this.input_timer);
      }
      this.filtering = e.target.value;
      this.input_timer = setTimeout(() => {
        RateLimitCb(600, (cb_done) => {
          this.result.setFilter(this.filtering, () => {
            this.checkSelectedFiles();
            cb_done();
          });
        });
      }, 300);
    }

    handleFilterKeyup(e) {
      if (e.keyCode === 27) {
        e.target.value = "";
        this.handleFilterInput(e);
      }
      return false;
    }

    renderFilter() {
      return h("div.filter", [
        h("input.text", {
          placeholder: "Filter: File name",
          spellcheck: false,
          oninput: this.handleFilterInput,
          onkeyup: this.handleFilterKeyup,
          value: this.filtering
        })
      ]);
    }

    updateOptionalStats() {
      Page.cmd("optionalLimitStats", [], (res) => {
        this.limit = res.limit;
        if (!this.limit.endsWith("%")) {
          this.limit += " GB";
        }
        this.optional_stats = res;
      });
    }

    updateAllFiles() {
      this.updating_files = 0;
      var used = 0;
      Page.site_list.sites.map((site) => {
        if (!site.row.settings.size_optional) {
          return;
        }
        this.updating_files += 1;
        used += site.row.settings.optional_downloaded;
        site.files.update(() => {
          this.updating_files -= 1;
        });
      });
      this.updating_files += 1;
      this.bigfiles.files.update(() => {
        this.updating_files -= 1;
      });
    }

    render() {
      var site, sites, sites_connected, sites_favorited;
      if (Page.site_list.sites && !this.need_update && this.updating_files === 0 && document.body.className !== "loaded") {
        document.body.classList.add("loaded");
      }
      if (this.need_update && Page.site_list.sites.length) {
        this.updateAllFiles();
        this.need_update = false;
      }
      sites = Page.site_list.sites.filter((site) => site.row.settings.size_optional);
      sites_favorited = sites.filter((site) => site.favorite);
      sites_connected = sites.filter((site) => !site.favorite);
      if (sites.length > 0 && sites[0].files.loaded === false) {
        if (sites_favorited.length) {
          sites_favorited = [sites_favorited[0]];
          sites_connected = [];
        } else {
          sites_favorited = [];
          sites_connected = [sites_connected[0]];
        }
      }
      if (sites.length === 0) {
        document.body.classList.add("loaded");
        return h("div#PageFiles",
          this.renderSelectbar(),
          this.renderTotalbar(),
          h("div.empty", [
            h("h4", "Hello newcomer!"),
            h("small", "You have not downloaded any optional files yet")
          ])
        );
      }
      if (this.display_limit < sites.length) {
        setTimeout(() => {
          this.display_limit += 1;
          Page.projector.scheduleRender();
        }, 1000);
      }
      return h("div#PageFiles", [
        this.renderSelectbar(),
        this.renderTotalbar(),
        this.renderFilter(),
        this.result.filter_inner_path ? this.result.render() : (
          this.bigfiles.render(),
          sites_favorited.slice(0, this.display_limit + 1).map((site) => {
            return site.renderOptionalStats();
          }),
          sites_connected.slice(0, this.display_limit + 1).map((site) => {
            return site.renderOptionalStats();
          })
        )
      ]);
    }

    onSiteInfo(site_info) {
      var rate_limit;
      if (site_info.event != null && site_info.event[0] === "peers_added") {
        return false;
      }
      if (site_info.tasks === 0 && site_info.event != null && site_info.event[0] === "file_done") {
        rate_limit = 1000;
      } else {
        rate_limit = 10000;
      }
      RateLimit(rate_limit, () => {
        this.need_update = true;
      });
    }
  }

  Object.assign(PageFiles.prototype, LogMixin);
  window.PageFiles = PageFiles;

})();
