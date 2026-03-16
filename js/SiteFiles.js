(function() {

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
      this.mode = "site";
      this.mode = "single_site";
      this.orderby_desc = true;
      this.has_more = false;
    }

    getSites() {
      var back = [];
      var sites = {};
      for (var i = 0, len = this.items.length; i < len; i++) {
        var file = this.items[i];
        if (sites[file.site.row.address] == null) {
          sites[file.site.row.address] = {
            row: file.site.row,
            files: {
              items: [],
              selected: this.selected,
              update: this.update
            }
          };
        }
        sites[file.site.row.address].files.items.push(file);
      }
      for (var address in sites) {
        var site = sites[address];
        back.push(site);
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
            h("div.td.pre", "."),
            this.mode === "bigfiles" || this.mode === "result" ? h("div.td.site", this.renderOrder("Site", "address")) : void 0,
            h("div.td.inner_path", this.renderOrder("Optional file", "is_pinned DESC, inner_path")),
            this.mode === "bigfiles" ? h("div.td.status", "Status") : void 0,
            h("div.td.size", this.renderOrderRight("Size", "size")),
            h("div.td.peer", this.renderOrder("Peers", "peer")),
            h("div.td.uploaded", this.renderOrder("Uploaded", "uploaded")),
            h("div.td.added", this.renderOrder("Finished", "time_downloaded"))
          ]),
          h("div.tbody", this.items.map((file) => {
            var classes, percent, percent_bg, percent_title, profile_color, site, status;
            site = file.site || this.site;
            if (file.peer >= 10) {
              profile_color = "#47d094";
            } else if (file.peer > 0) {
              profile_color = "#f5b800";
            } else {
              profile_color = "#d1d1d1";
            }
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
              if (file.is_downloading || percent === 100) {
                status = "";
                percent_bg = "#9ef5cf";
              } else {
                status = "paused";
                percent_bg = "#f5f49e";
              }
              percent_title = percent + "% " + status;
            }
            classes = {
              selected: this.selected[file.inner_path],
              pinned: file.is_pinned
            };
            return h("div.tr", {
              key: file.inner_path,
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
              this.mode === "bigfiles" || this.mode === "result" ? h("div.td.site", h("a.link", {
                href: site.getHref()
              }, site.row.content.title)) : void 0,
              h("div.td.inner_path",
                h("a.title.link", {
                  href: site.getHref(file),
                  target: "_blank",
                  title: file.inner_path.replace(/.*\//, "")
                }, file.inner_path.replace(/.*\//, "")),
                file.is_pinned ? h("span.pinned", {
                  exitAnimation: Animation.slideUpInout,
                  enterAnimation: Animation.slideDown
                }, _("Pinned")) : void 0
              ),
              this.mode === "bigfiles" ? h("div.td.status", {
                classes: {
                  "downloading": file.is_downloading
                }
              }, h("span.percent", {
                title: file.pieces_downloaded + " of " + file.pieces + " pieces downloaded",
                style: "box-shadow: inset " + (percent * 0.8) + "px 0px 0px " + percent_bg + ";"
              }, percent_title)) : void 0,
              h("div.td.size", Text.formatSize(file.size)),
              h("div.td.peer", [
                h("div.icon.icon-profile", {
                  style: "color: " + profile_color
                }),
                h("span.num", file.peer)
              ]),
              h("div.td.uploaded",
                h("div.uploaded-text", Text.formatSize(file.uploaded)),
                h("div.dots-container", [
                  h("span.dots.dots-bg", {
                    title: "Ratio: " + ((file.uploaded / file.size).toFixed(1))
                  }, "\u2022\u2022\u2022\u2022\u2022"),
                  h("span.dots.dots-fg", {
                    title: "Ratio: " + ((file.uploaded / file.size).toFixed(1)),
                    style: "width: " + (Math.min(5, file.uploaded / file.size) * 9) + "px"
                  }, "\u2022\u2022\u2022\u2022\u2022")
                ])
              ),
              h("div.td.added", file.time_downloaded ? Time.since(file.time_downloaded) : "n/a")
            ]);
          }))
        ]),
        this.has_more ? h("div.more-container", h("a.more", {
          href: "#More",
          onclick: this.handleMoreClick
        }, _("More files..."))) : void 0
      ];
    }

    update(cb) {
      var orderby = this.orderby + (this.orderby_desc ? " DESC" : "");
      Page.cmd("optionalFileList", {
        address: this.site.row.address,
        limit: this.limit + 1,
        orderby: orderby
      }, (res) => {
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
