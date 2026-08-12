(function() {

  // The optional-file table, shared by three modes: a xite's own card
  // ("single_site"), the cross-xite big-file list ("bigfiles") and the search
  // results ("result"). One DOM path for all three and for both breakpoints -
  // the phone two-line row is pure CSS re-flow of the same cells, so the
  // layouts cannot drift apart.
  class SiteFiles {
    constructor(site) {
      this.site = site;
      this.update = this.update.bind(this);
      this.render = this.render.bind(this);
      this.renderOrderRight = this.renderOrderRight.bind(this);
      this.renderOrder = this.renderOrder.bind(this);
      this.handleMoreClick = this.handleMoreClick.bind(this);
      this.handleOrderbyClick = this.handleOrderbyClick.bind(this);
      this.handleRowMouseenter = this.handleRowMouseenter.bind(this);
      this.handleSelectMousedown = this.handleSelectMousedown.bind(this);
      this.handleSelectEnd = this.handleSelectEnd.bind(this);
      this.handleSelectClick = this.handleSelectClick.bind(this);
      this.getSites = this.getSites.bind(this);
      this.limit = 10;
      this.selected = {};
      this.items = [];
      this.loaded = false;
      this.orderby = "time_downloaded";
      this.mode = "single_site";
      this.orderby_desc = true;
      this.has_more = false;
      // Per-file pin handlers, cached by inner_path (maquette forbids handler
      // identity changing across renders).
      this.pin_handlers = {};
      // The "?" explainer for the pin column - an inline band, not a popup
      // (this page deliberately has no floating menus left).
      this.pin_help_open = false;
      this.handlePinHelpClick = (() => {
        this.pin_help_open = !this.pin_help_open;
        Page.projector.scheduleRender();
        return false;
      });
    }

    // Grouped by the row's own address: bigfiles/search rows can reference a
    // xite siteList hasn't answered for yet (file.site undefined - the render
    // path already degrades to the bare address), and dereferencing it here
    // crashed selection and wedged the rate-limited search callback for good.
    getSites() {
      var back = [];
      var sites = {};
      for (var i = 0, len = this.items.length; i < len; i++) {
        var file = this.items[i];
        var address = file.site ? file.site.row.address : file.address;
        if (!address) {
          continue;
        }
        if (sites[address] == null) {
          sites[address] = {
            row: file.site ? file.site.row : {address: address, settings: {}},
            files: {
              items: [],
              selected: this.selected,
              update: this.update
            }
          };
        }
        sites[address].files.items.push(file);
      }
      for (var addr in sites) {
        back.push(sites[addr]);
      }
      return back;
    }

    handleSelectClick(e) {
      return false;
    }

    handleSelectEnd(e) {
      document.body.removeEventListener('mouseup', this.handleSelectEnd);
      this.select_action = null;
    }

    handleSelectMousedown(e) {
      var inner_path = e.currentTarget.attributes.inner_path.value;
      if (this.selected[inner_path]) {
        delete this.selected[inner_path];
        this.select_action = "deselect";
      } else {
        this.selected[inner_path] = true;
        this.select_action = "select";
      }
      Page.page_files.checkSelectedFiles();
      document.body.addEventListener('mouseup', this.handleSelectEnd);
      e.stopPropagation();
      Page.projector.scheduleRender();
      return false;
    }

    handleRowMouseenter(e) {
      // Drag-select is a desktop affordance: e.buttons is only set while a
      // mouse button is held, so touch scrolling never triggers it.
      if (e.buttons && this.select_action) {
        var inner_path = e.target.attributes.inner_path.value;
        if (this.select_action === "select") {
          this.selected[inner_path] = true;
        } else {
          delete this.selected[inner_path];
        }
        Page.page_files.checkSelectedFiles();
        Page.projector.scheduleRender();
      }
      return false;
    }

    handleOrderbyClick(e) {
      var orderby = e.currentTarget.attributes.orderby.value;
      if (this.orderby === orderby) {
        this.orderby_desc = !this.orderby_desc;
      }
      this.orderby = orderby;
      this.update();
      Page.projector.scheduleRender();
      return false;
    }

    handleMoreClick() {
      this.limit += 15;
      this.update();
      return false;
    }

    // Always-visible per-row pin toggle, sharing the exact command shape the
    // selectbar bulk path uses so the two cannot drift. The handler is cached
    // for maquette (identity must not change across renders) but resolves the
    // file FRESH at click time - the row objects are replaced on every
    // update(), so a captured one would keep serving its stale is_pinned and
    // the second click would pin again instead of unpinning.
    getPinHandler(file) {
      var inner_path = file.inner_path;
      var row_address = file.address || "";
      var key = row_address + "|" + inner_path;
      if (this.pin_handlers[key] == null) {
        this.pin_handlers[key] = (() => {
          var current = null;
          for (var i = 0, len = this.items.length; i < len; i++) {
            if (this.items[i].inner_path === inner_path && (this.items[i].address || "") === row_address) {
              current = this.items[i];
              break;
            }
          }
          if (!current) {
            return false;
          }
          var address = current.address || this.site.row.address;
          var cmd = current.is_pinned ? "optionalFileUnpin" : "optionalFilePin";
          Page.cmd(cmd, [[current.inner_path], address], () => {
            return this.update();
          });
          return false;
        });
      }
      return this.pin_handlers[key];
    }

    renderOrder(title, orderby) {
      return h("a.title.orderby", {
        href: "#" + orderby,
        orderby: orderby,
        onclick: this.handleOrderbyClick,
        classes: {
          selected: this.orderby === orderby,
          desc: this.orderby_desc
        }
      }, [title, h("div.icon.icon-arrow-down")]);
    }

    renderOrderRight(title, orderby) {
      return h("a.title.orderby", {
        href: "#" + orderby,
        orderby: orderby,
        onclick: this.handleOrderbyClick,
        classes: {
          selected: this.orderby === orderby,
          desc: this.orderby_desc
        }
      }, [h("div.icon.icon-arrow-down"), title]);
    }

    render() {
      var ref;
      if (!((ref = this.items) != null ? ref.length : void 0)) {
        return [];
      }
      return [
        h("div.files.files-" + this.mode, {
          exitAnimation: Animation.slideUpInout
        }, [
          h("div.tr.thead", [
            h("div.td.pre", "​"),
            this.mode === "bigfiles" || this.mode === "result" ? h("div.td.site", this.renderOrder(_("Xite"), "address")) : void 0,
            h("div.td.inner_path", this.renderOrder(_("File"), "is_pinned DESC, inner_path")),
            this.mode === "bigfiles" ? h("div.td.status", _("Status")) : void 0,
            h("div.td.size", this.renderOrderRight(_("Size"), "size")),
            h("div.td.peer", this.renderOrderRight(_("Peers"), "peer")),
            h("div.td.uploaded", this.renderOrderRight(_("Uploaded"), "uploaded")),
            h("div.td.added", this.renderOrderRight(_("Finished"), "time_downloaded")),
            h("div.td.rowpin-col", h("a.pin-help-btn", {
              href: "#What+is+pinning",
              title: _("What does pinning do?"),
              "aria-expanded": this.pin_help_open ? "true" : "false",
              onclick: this.handlePinHelpClick
            }, "?"))
          ]),
          this.pin_help_open ? h("div.pin-help", [
            h("span.pin-help-text", [
              h("b", _("Pinning. ")),
              _("Downloaded optional files are a cache: when they grow past your storage limit, the oldest are deleted automatically to make room. A pinned file is never touched by that cleanup - it stays on disk and keeps seeding until you delete it yourself. Xites with auto-download switched on keep everything without pinning.")
            ]),
            h("a.pin-help-close", {
              href: "#Got+it",
              onclick: this.handlePinHelpClick
            }, _("Got it"))
          ]) : void 0,
          h("div.tbody", this.items.map((file) => {
            var classes, peer_ink, percent, site, site_cell, up_ratio;
            site = file.site || this.site;
            if (this.mode === "bigfiles" || this.mode === "result") {
              // Rows can reference a xite that is not in siteList anymore; the
              // pseudo-site fallback has no row.content and its getHref() would
              // throw, so degrade to the bare address.
              if (site.row.content) {
                site_cell = h("a.link", {
                  href: site.getHref()
                }, site.row.content.title);
              } else {
                site_cell = h("span.site-missing", file.address || "");
              }
            }
            peer_ink = file.peer >= 10 ? "p-ok" : (file.peer > 0 ? "p-warn" : "p-low");
            if (this.mode === "bigfiles") {
              if (file.pieces == null) {
                file.pieces = 0;
              }
              if (file.pieces_downloaded == null) {
                file.pieces_downloaded = 0;
              }
              if (file.pieces === 0 || file.pieces_downloaded === 0) {
                percent = 0;
              } else {
                percent = parseInt((file.pieces_downloaded / file.pieces) * 100);
              }
            }
            up_ratio = file.size > 0 ? Math.min(1, file.uploaded / file.size) : 0;
            classes = {
              selected: this.selected[file.inner_path],
              pinned: file.is_pinned
            };
            return h("div.tr", {
              key: this.mode === "single_site" ? file.inner_path : (file.address || "") + "|" + file.inner_path,
              inner_path: file.inner_path,
              exitAnimation: Animation.slideUpInout,
              enterAnimation: Animation.slideDown,
              classes: classes,
              onmouseenter: this.handleRowMouseenter
            }, [
              h("div.td.pre", h("a.checkbox-outer", {
                href: "#Select",
                onmousedown: this.handleSelectMousedown,
                onclick: this.handleSelectClick,
                inner_path: file.inner_path
              }, h("span.checkbox"))),
              site_cell ? h("div.td.site", site_cell) : void 0,
              h("div.td.inner_path",
                h("a.title.link", {
                  href: site.getHref(file),
                  target: "_blank",
                  title: file.inner_path
                }, file.inner_path.replace(/.*\//, ""))
              ),
              this.mode === "bigfiles" ? h("div.td.status", h("span.percent", {
                title: file.pieces_downloaded + " " + _("of") + " " + file.pieces + " " + _("pieces downloaded"),
                classes: {
                  "pct-done": percent === 100,
                  "pct-active": file.is_downloading && percent < 100,
                  "pct-paused": !file.is_downloading && percent < 100
                }
              }, [
                h("span.fact-meter", [
                  h("span.fact-meter-fill", {
                    styles: {
                      width: percent + "%"
                    }
                  })
                ]),
                h("span.pct-num", percent + "%")
              ])) : void 0,
              h("div.td.size", Text.formatSize(file.size)),
              h("div.td.peer", [
                h("span.peer-dot." + peer_ink, {"aria-hidden": "true"}),
                h("span.num", "" + file.peer)
              ]),
              h("div.td.uploaded", {
                title: _("Ratio: ") + ((file.size > 0 ? file.uploaded / file.size : 0).toFixed(1))
              }, [
                h("span.uploaded-text", Text.formatSize(file.uploaded) || "0 B"),
                h("span.upmeter", [
                  h("span.upmeter-fill", {
                    styles: {
                      width: Math.round(up_ratio * 100) + "%"
                    }
                  })
                ])
              ]),
              h("div.td.added", file.time_downloaded ? Time.since(file.time_downloaded) : "n/a"),
              h("div.td.rowpin-col", h("a.rowpin", {
                href: "#Pin",
                title: file.is_pinned ? _("Unpin (allow automatic cleanup)") : _("Pin (never delete automatically)"),
                "aria-pressed": file.is_pinned ? "true" : "false",
                onclick: this.getPinHandler(file),
                classes: {
                  on: file.is_pinned
                }
              }, h("span.rowpin-icon", {
                innerHTML: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5M7 4h10l-1.5 6.5L18 13H6l2.5-2.5z"/></svg>'
              })))
            ]);
          }))
        ]),
        this.has_more ? h("div.more-container", h("a.more", {
          href: "#More",
          onclick: this.handleMoreClick
        }, _("Show 15 more"))) : void 0
      ];
    }

    update(cb) {
      var orderby = this.orderby + (this.orderby_desc ? " DESC" : "");
      Page.cmd("optionalFileList", {
        address: this.site.row.address,
        limit: this.limit + 1,
        orderby: orderby
      }, (res) => {
        res = Page.rows(res);
        this.items = res.slice(0, this.limit);
        this.loaded = true;
        this.has_more = res.length > this.limit;
        Page.projector.scheduleRender();
        if (typeof cb === "function") cb();
      });
    }
  }

  Object.assign(SiteFiles.prototype, LogMixin);
  window.SiteFiles = SiteFiles;

})();
