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
      this.handleLimitSetClick = this.handleLimitSetClick.bind(this);
      this.handleLimitCancelClick = this.handleLimitCancelClick.bind(this);
      this.handleEditlimitClick = this.handleEditlimitClick.bind(this);
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
      this.editing_limit = false;
      this.limit = "";
      this.selected_files_num = 0;
      this.selected_files_size = 0;
      this.selected_files_pinned = 0;
      this.bigfiles = new Bigfiles();
      this.result = new FilesResult();
      this.display_limit = 0;
      this.filtering = "";
      // Esc clears the selection (same path as the bulk bar's Cancel). Inputs
      // keep their own Esc behavior (the search box clears itself).
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape" || Page.mode !== "Files") {
          return;
        }
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
          return;
        }
        if (this.selected_files_num > 0) {
          this.handleSelectbarCancel();
        }
      });
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
      Page.cmd("optionalLimitSet", limit, (res) => {
        if (res && res.error) {
          // Restricted gateways reject the write half of the limit commands:
          // undo the optimistic set from the node's stats and show the error.
          Page.cmd("wrapperNotification", ["error", res.error]);
          this.updateOptionalStats();
        }
      });
      this.editing_limit = false;
      return false;
    }

    handleLimitInput(e) {
      this.limit = e.target.value;
    }

    // How many optional-bearing xites this node auto-seeds, plus how many
    // directory commitments stand - the storage panel's honest replacement
    // for the old heart-count glyph.
    seedingCounts() {
      var auto = 0, total = 0, dirs = 0;
      var sites = Page.site_list.sites || [];
      for (var i = 0, len = sites.length; i < len; i++) {
        var site = sites[i];
        if (!site.row.settings.size_optional) {
          continue;
        }
        total += 1;
        if (site.row.settings.autodownloadoptional) {
          auto += 1;
        }
        dirs += site.optional_helps.length;
      }
      return {auto: auto, total: total, dirs: dirs};
    }

    // The storage panel: plabel + "used of limit" + a visible Edit control
    // that swaps the header area for the input row directly - the old path
    // hid this behind a chevron opening a one-item dropdown.
    renderTotalbar() {
      var limit_bytes, limit_label, pct, seeding, optional_total;
      limit_label = this.optional_stats.limit;
      if (limit_label && !("" + limit_label).endsWith("%")) {
        limit_label = limit_label + " GB";
      }
      if (("" + this.optional_stats.limit).endsWith("%")) {
        limit_bytes = this.optional_stats.free * (parseFloat(this.optional_stats.limit) / 100);
      } else {
        limit_bytes = parseFloat(this.optional_stats.limit) * 1024 * 1024 * 1024;
      }
      pct = limit_bytes > 0 ? Math.min(100, Math.round(this.optional_stats.used / limit_bytes * 100)) : 0;
      optional_total = 0;
      (Page.site_list.sites || []).map((site) => {
        optional_total += site.row.settings.size_optional || 0;
      });
      seeding = this.seedingCounts();
      return h("div.spanel.p-storage", {
        key: "storage"
      }, [
        h("div.phead", [
          h("span.plabel", _("Storage")),
          this.editing_limit ? h("span.limit-edit", [
            h("span.le-label", _("Optional files limit:")),
            h("input.le-input", {
              type: "text",
              value: this.limit,
              oninput: this.handleLimitInput
            }),
            h("a.le-set", {
              href: "#Set",
              onclick: this.handleLimitSetClick
            }, _("Set")),
            h("a.le-cancel", {
              href: "#Cancel",
              onclick: this.handleLimitCancelClick
            }, _("Cancel"))
          ]) : h("span.storage-right", [
            h("span.pval", (Text.formatSize(this.optional_stats.used) || "0 MB") + " " + _("of") + " " + (Text.formatSize(limit_bytes) || "0 MB") + " " + _("used")),
            h("a.le-edit", {
              href: "#Edit+limit",
              onclick: this.handleEditlimitClick
            }, _("Edit limit"))
          ])
        ]),
        h("div.meter", {
          title: pct + "% " + _("of the optional-file limit used")
        }, [
          h("span.meter-fill", {
            styles: {
              width: Math.max(pct > 0 ? 1 : 0, pct) + "%"
            }
          })
        ]),
        h("div.pfacts", [
          h("span.fact", {key: "used"}, [
            h("span.kdot.kd-in", {"aria-hidden": "true"}),
            h("span.fact-label", _("Used")),
            h("span.fact-value", Text.formatSize(this.optional_stats.used) || "0 MB")
          ]),
          h("span.fact", {key: "limit"}, [
            h("span.fact-label", _("Limit")),
            h("span.fact-value", limit_label || "–")
          ]),
          h("span.fact", {key: "free"}, [
            h("span.fact-label", _("Free on disk")),
            h("span.fact-value", Text.formatSize(this.optional_stats.free) || "–")
          ]),
          optional_total > 0 ? h("span.fact", {key: "opt"}, [
            h("span.fact-label", _("Optional available")),
            h("span.fact-value", Text.formatSize(optional_total) || "0 MB")
          ]) : void 0,
          seeding.total > 0 ? h("span.fact", {key: "seeding", classes: {"fact-ok": seeding.auto > 0}}, [
            seeding.auto > 0 ? h("span.fact-dot", {"aria-hidden": "true"}) : void 0,
            h("span.fact-label", _("Seeding")),
            h("span.fact-value", seeding.auto + " " + _("of") + " " + seeding.total + " " + _("xites") + (seeding.dirs ? " · " + seeding.dirs + " " + _("folders") : ""))
          ]) : void 0
        ])
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
      return h("div.filter.searchbar", [
        h("input.text", {
          placeholder: _("Search files"),
          spellcheck: false,
          oninput: this.handleFilterInput,
          onkeyup: this.handleFilterKeyup,
          value: this.filtering
        })
      ]);
    }

    updateOptionalStats() {
      Page.cmd("optionalLimitStats", [], (res) => {
        if (!res || res.error || res.limit == null) {
          return;
        }
        this.limit = res.limit;
        if (!this.limit.endsWith("%")) {
          this.limit += " GB";
        }
        this.optional_stats = res;
        if (Page.projector) {
          Page.projector.scheduleRender();
        }
      });
    }

    updateAllFiles() {
      // The storage numbers move with every delete/download; refresh them on
      // the same beat as the tables instead of only at boot.
      this.updateOptionalStats();
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
        // The filter renders here too: it is the only entry point to the
        // node-side filter_inner_path search, so a newcomer can reach it.
        return h("div#PageFiles",
          this.renderSelectbar(),
          this.renderTotalbar(),
          this.renderFilter(),
          this.result.filter_inner_path ? this.result.render() : h("div.spanel.p-empty", [
            h("div.phead", [h("span.plabel", _("Optional files"))]),
            h("div.empty-title", _("No optional files yet")),
            h("div.empty-hint", _("Xites can offer large files - videos, images, archives - that download on demand instead of with the page. Files you open land here, where you can pin, seed or delete them."))
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
        this.result.filter_inner_path ? this.result.render() : [
          this.bigfiles.render(),
          sites_favorited.slice(0, this.display_limit + 1).map((site) => {
            return site.renderOptionalStats();
          }),
          sites_connected.slice(0, this.display_limit + 1).map((site) => {
            return site.renderOptionalStats();
          })
        ]
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
