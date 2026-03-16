(function() {

class Site {
  constructor(row, item_list) {
    this.item_list = item_list;
    this.renderOptionalStats = this.renderOptionalStats.bind(this);
    this.render = this.render.bind(this);
    this.handleLimitIncreaseClick = this.handleLimitIncreaseClick.bind(this);
    this.handleHelpsClick = this.handleHelpsClick.bind(this);
    this.handleHelpAllClick = this.handleHelpAllClick.bind(this);
    this.handleHelpClick = this.handleHelpClick.bind(this);
    this.handleSettingsClick = this.handleSettingsClick.bind(this);
    this.handleDeleteClick = this.handleDeleteClick.bind(this);
    this.handleCloneUpgradeClick = this.handleCloneUpgradeClick.bind(this);
    this.handleCloneClick = this.handleCloneClick.bind(this);
    this.handlePauseClick = this.handlePauseClick.bind(this);
    this.handleResumeClick = this.handleResumeClick.bind(this);
    this.handleCheckfilesClick = this.handleCheckfilesClick.bind(this);
    this.handleUpdateClick = this.handleUpdateClick.bind(this);
    this.handleUnfavoriteClick = this.handleUnfavoriteClick.bind(this);
    this.handleFavoriteClick = this.handleFavoriteClick.bind(this);
    this.deleted = false;
    this.show_errors = false;
    this.message_visible = false;
    this.message = null;
    this.message_class = "";
    this.message_collapsed = false;
    this.message_timer = null;
    this.favorite = Page.settings.favorite_sites[row.address];
    this.key = row.address;
    this.optional_helps = [];
    this.optional_helps_disabled = {};
    this.setRow(row);
    this.files = new SiteFiles(this);
    this.menu = new Menu();
    this.menu_helps = null;
  }

  setRow(row) {
    var base, base1, base2, base3, key, ref, ref1, ref2, val;
    if ((base = row.settings).modified == null) {
      base.modified = 0;
    }
    if ((base1 = row.settings).size == null) {
      base1.size = 0;
    }
    if ((base2 = row.settings).added == null) {
      base2.added = 0;
    }
    if ((base3 = row.settings).peers == null) {
      base3.peers = 0;
    }
    if (((ref = row.event) != null ? ref[0] : void 0) === "updated" && row.content_updated !== false) {
      this.setMessage(_("Updated!"), "done");
    } else if (((ref1 = row.event) != null ? ref1[0] : void 0) === "updating") {
      this.setMessage(_("Updating..."));
    } else if (row.tasks > 0) {
      this.setMessage(_("Updating: ") + (Math.max(row.tasks, row.bad_files)) + _(" left"));
    } else if (row.bad_files > 0) {
      if (row.peers <= 1) {
        this.setMessage(_("No peers"), "error");
      } else {
        this.setMessage(row.bad_files + _(" file update failed"), "error");
      }
    } else if (row.content_updated === false) {
      if (row.peers <= 1) {
        this.setMessage(_("No peers"), "error");
      } else {
        this.setMessage(_("Update failed"), "error");
      }
    } else if (row.tasks === 0 && ((ref2 = this.row) != null ? ref2.tasks : void 0) > 0) {
      this.setMessage(_("Updated!"), "done");
    }
    if (row.body == null) {
      row.body = "";
    }
    this.optional_helps = (() => {
      var ref3, results;
      ref3 = row.settings.optional_help;
      results = [];
      for (key in ref3) {
        val = ref3[key];
        results.push([key, val]);
      }
      return results;
    })();
    return this.row = row;
  }

  setMessage(message, message_class) {
    this.message_class = message_class != null ? message_class : "";
    if (message) {
      this.message = message;
      this.message_visible = true;
      if (this.message_class === "error" && !this.show_errors) {
        this.message_collapsed = true;
      } else {
        this.message_collapsed = false;
      }
    } else {
      this.message_visible = false;
    }
    clearInterval(this.message_timer);
    if (this.message_class === "done") {
      this.message_timer = setTimeout((() => {
        return this.setMessage("");
      }), 5000);
    }
    return Page.projector.scheduleRender();
  }

  isWorking() {
    var ref;
    return this.row.tasks > 0 || ((ref = this.row.event) != null ? ref[0] : void 0) === "updating";
  }

  handleFavoriteClick() {
    this.favorite = true;
    this.menu = new Menu();
    Page.settings.favorite_sites[this.row.address] = true;
    Page.saveSettings();
    Page.site_list.reorder();
    return false;
  }

  handleUnfavoriteClick() {
    this.favorite = false;
    this.menu = new Menu();
    delete Page.settings.favorite_sites[this.row.address];
    Page.saveSettings();
    Page.site_list.reorder();
    return false;
  }

  handleUpdateClick() {
    Page.cmd("siteUpdate", {
      "address": this.row.address
    });
    this.show_errors = true;
    return false;
  }

  handleCheckfilesClick() {
    Page.cmd("siteUpdate", {
      "address": this.row.address,
      "check_files": true,
      since: 0
    });
    this.show_errors = true;
    return false;
  }

  handleResumeClick() {
    Page.cmd("siteResume", {
      "address": this.row.address
    });
    return false;
  }

  handlePauseClick() {
    Page.cmd("sitePause", {
      "address": this.row.address
    });
    return false;
  }

  handleCloneClick() {
    Page.cmd("siteClone", {
      "address": this.row.address
    });
    return false;
  }

  handleCloneUpgradeClick() {
    Page.cmd("wrapperConfirm", ["Are you sure?" + (" Any modifications you made on<br><b>" + this.row.content.title + "</b> site's js/css files will be lost."), "Upgrade"], (confirmed) => {
      return Page.cmd("siteClone", {
        "address": this.row.content.cloned_from,
        "root_inner_path": this.row.content.clone_root,
        "target_address": this.row.address
      });
    });
    return false;
  }

  handleDeleteClick() {
    if (this.row.settings.own) {
      Page.cmd("wrapperConfirm", ["You can delete your site using the site's sidebar.", ["Open site"]], (confirmed) => {
        if (confirmed) {
          return window.top.location = this.getHref() + "#EpixNet:OpenSidebar";
        }
      });
    } else {
      if (!this.row.content.title) {
        Page.cmd("siteDelete", {
          "address": this.row.address
        });
        this.item_list.deleteItem(this);
        Page.projector.scheduleRender();
      } else {
        Page.cmd("wrapperConfirm", ["Are you sure?" + (" <b>" + this.row.content.title + "</b>"), ["Delete", "Blacklist"]], (confirmed) => {
          if (confirmed === 1) {
            Page.cmd("siteDelete", {
              "address": this.row.address
            });
            this.item_list.deleteItem(this);
            return Page.projector.scheduleRender();
          } else if (confirmed === 2) {
            return Page.cmd("wrapperPrompt", ["Blacklist <b>" + this.row.content.title + "</b>", "text", "Delete and Blacklist", "Reason"], (reason) => {
              Page.cmd("siteDelete", {
                "address": this.row.address
              });
              Page.cmd("siteblockAdd", [this.row.address, reason]);
              this.item_list.deleteItem(this);
              return Page.projector.scheduleRender();
            });
          }
        });
      }
    }
    return false;
  }

  handleSettingsClick(e) {
    this.menu.items = [];
    if (this.favorite) {
      this.menu.items.push([_("Unfavorite"), this.handleUnfavoriteClick]);
    } else {
      this.menu.items.push([_("Favorite"), this.handleFavoriteClick]);
    }
    this.menu.items.push([_("Update"), this.handleUpdateClick]);
    this.menu.items.push([_("Check files"), this.handleCheckfilesClick]);
    if (this.row.settings.serving) {
      this.menu.items.push([_("Pause"), this.handlePauseClick]);
    } else {
      this.menu.items.push([_("Resume"), this.handleResumeClick]);
    }
    this.menu.items.push([_("Save as .zip"), "/EpixNet-Internal/Zip?address=" + this.row.address]);
    if (this.row.content.cloneable === true) {
      this.menu.items.push([_("Clone"), this.handleCloneClick]);
    }
    if (this.row.settings.own && this.row.content.cloned_from) {
      this.menu.items.push(["---"]);
      this.menu.items.push([_("Upgrade code"), this.handleCloneUpgradeClick]);
    }
    this.menu.items.push(["---"]);
    this.menu.items.push([_("Delete"), this.handleDeleteClick]);
    if (this.menu.visible) {
      this.menu.hide();
    } else {
      this.menu.show();
    }
    return false;
  }

  handleHelpClick(directory, title) {
    if (this.optional_helps_disabled[directory]) {
      Page.cmd("OptionalHelp", [directory, title, this.row.address]);
      delete this.optional_helps_disabled[directory];
    } else {
      Page.cmd("OptionalHelpRemove", [directory, this.row.address]);
      this.optional_helps_disabled[directory] = true;
    }
    return true;
  }

  handleHelpAllClick() {
    if (this.row.settings.autodownloadoptional === true) {
      return Page.cmd("OptionalHelpAll", [false, this.row.address], () => {
        this.row.settings.autodownloadoptional = false;
        return Page.projector.scheduleRender();
      });
    } else {
      return Page.cmd("OptionalHelpAll", [true, this.row.address], () => {
        this.row.settings.autodownloadoptional = true;
        return Page.projector.scheduleRender();
      });
    }
  }

  handleHelpsClick(e) {
    var directory, i, len, ref, ref1, title;
    if (e.target.classList.contains("menu-item")) {
      return;
    }
    if (!this.menu_helps) {
      this.menu_helps = new Menu();
    }
    this.menu_helps.items = [];
    this.menu_helps.items.push([
      _("Help distribute all new files"), this.handleHelpAllClick, (() => {
        return this.row.settings.autodownloadoptional;
      })
    ]);
    if (this.optional_helps.length > 0) {
      this.menu_helps.items.push(["---"]);
    }
    ref = this.optional_helps;
    for (i = 0, len = ref.length; i < len; i++) {
      ref1 = ref[i], directory = ref1[0], title = ref1[1];
      this.menu_helps.items.push([
        title, (() => {
          return this.handleHelpClick(directory, title);
        }), (() => {
          return !this.optional_helps_disabled[directory];
        })
      ]);
    }
    this.menu_helps.toggle();
    return true;
  }

  getHref(row) {
    var href;
    href = Text.getSiteUrl(this.row.address);
    if (row != null ? row.inner_path : void 0) {
      return href + row.inner_path;
    } else {
      return href;
    }
  }

  handleLimitIncreaseClick() {
    Page.cmd("as", [this.row.address, "siteSetLimit", this.row.need_limit], (res) => {
      if (res === "ok") {
        Page.cmd("wrapperNotification", ["done", "Site <b>" + this.row.content.title + "</b> storage limit modified to <b>" + this.row.need_limit + "MB</b>", 5000]);
      } else {
        Page.cmd("wrapperNotification", ["error", res.error]);
      }
      return Page.projector.scheduleRender();
    });
    return false;
  }

  render() {
    var now, ref;
    now = Date.now() / 1000;
    return h("div.site", {
      key: this.key,
      "data-key": this.key,
      classes: {
        "modified-lastday": now - this.row.settings.modified < 60 * 60 * 24,
        "disabled": !this.row.settings.serving && !this.row.demo,
        "working": this.isWorking()
      }
    }, h("div.circle", {
      style: "color: " + (Text.toColor(this.row.address, 40, 50))
    }, ["\u2022"]), h("a.inner", {
      href: this.getHref(),
      title: ((ref = this.row.content.title) != null ? ref.length : void 0) > 20 ? this.row.content.title : void 0
    }, [
      h("span.title", [this.row.content.title || this.row.address]), h("div.details", [h("span.modified", [h("div.icon-clock"), Page.settings.sites_orderby === "size" ? h("span.value", [(this.row.settings.size / 1024 / 1024 + (this.row.settings.size_optional != null) / 1024 / 1024).toFixed(1), "MB"]) : h("span.value", [Time.since(this.row.settings.modified)])]), h("span.peers", [h("div.icon-profile"), h("span.value", [Math.max((this.row.settings.peers ? this.row.settings.peers : 0), this.row.peers)])])]), this.row.demo ? h("div.details.demo", "Activate \u00BB") : void 0, this.row.need_limit ? h("a.details.needaction", {
        href: "#Set+limit",
        onclick: this.handleLimitIncreaseClick
      }, "Set limit to " + this.row.need_limit + "MB") : void 0, h("div.message", {
        classes: {
          visible: this.message_visible,
          done: this.message_class === 'done',
          error: this.message_class === 'error',
          collapsed: this.message_collapsed
        }
      }, [this.message])
    ]), h("a.settings", {
      href: "#Settings",
      tabIndex: -1,
      onmousedown: this.handleSettingsClick,
      onclick: Page.returnFalse
    }, ["\u22EE"]), this.menu.render());
  }

  renderCircle(value, max) {
    var dashoffset, stroke;
    if (value < 1) {
      dashoffset = 75 + (1 - value) * 75;
    } else {
      dashoffset = Math.max(0, 75 - ((value - 1) / 9) * 75);
    }
    stroke = "hsl(" + (Math.min(555, value * 50)) + ", 100%, 61%)";
    return h("div.circle", {
      title: "Upload/Download ratio",
      innerHTML: "<svg class=\"circle-svg\" width=\"30\" height=\"30\" viewPort=\"0 0 30 30\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\">\n  \t\t\t<circle r=\"12\" cx=\"15\" cy=\"15\" fill=\"transparent\" class='circle-bg'></circle>\n  \t\t\t<circle r=\"12\" cx=\"15\" cy=\"15\" fill=\"transparent\" class='circle-fg' style='stroke-dashoffset: " + dashoffset + "; stroke: " + stroke + "'></circle>\n</svg>"
    });
  }

  renderOptionalStats() {
    var ratio, ratio_hue, row;
    row = this.row;
    ratio = (row.settings.bytes_sent / row.settings.bytes_recv).toFixed(1);
    if (ratio >= 100) {
      ratio = "\u221E";
    } else if (ratio >= 10) {
      ratio = (row.settings.bytes_sent / row.settings.bytes_recv).toFixed(0);
    }
    ratio_hue = Math.min(555, (row.settings.bytes_sent / row.settings.bytes_recv) * 50);
    return h("div.site", {
      key: this.key
    }, [
      h("div.title", [
        h("h3.name", h("a", {
          href: this.getHref()
        }, row.content.title)), h("div.size", {
          title: "Site size limit: " + (Text.formatSize(row.size_limit * 1024 * 1024))
        }, [
          "" + (Text.formatSize(row.settings.size)), h("div.bar", h("div.bar-active", {
            style: "width: " + (100 * (row.settings.size / (row.size_limit * 1024 * 1024))) + "%"
          }))
        ]), h("div.plus", "+"), h("div.size.size-optional", {
          title: "Optional files on site: " + (Text.formatSize(row.settings.size_optional))
        }, [
          "" + (Text.formatSize(row.settings.optional_downloaded)), h("span.size-title", _("Optional")), h("div.bar", h("div.bar-active", {
            style: "width: " + (100 * (row.settings.optional_downloaded / row.settings.size_optional)) + "%"
          }))
        ]), h("a.helps", {
          href: "#",
          onmousedown: this.handleHelpsClick,
          onclick: Page.returnFalse
        }, h("div.icon-share"), this.row.settings.autodownloadoptional ? "\u2661" : this.optional_helps.length, h("div.icon-arrow-down"), this.menu_helps ? this.menu_helps.render() : void 0), this.renderCircle(parseFloat((row.settings.bytes_sent / row.settings.bytes_recv).toFixed(1)), 10), h("div.circle-value", {
          classes: {
            negative: ratio < 1
          },
          style: "color: hsl(" + ratio_hue + ", 70%, 60%)"
        }, ratio), h("div.transfers", [
          h("div.up", {
            "title": _("Uploaded")
          }, "\u22F0 \u00A0" + (Text.formatSize(row.settings.bytes_sent))), h("div.down", {
            "title": _("Downloaded")
          }, "\u22F1 \u00A0" + (Text.formatSize(row.settings.bytes_recv)))
        ])
      ]), this.files.render()
    ]);
  }
}

Object.assign(Site.prototype, LogMixin);
window.Site = Site;

})();
