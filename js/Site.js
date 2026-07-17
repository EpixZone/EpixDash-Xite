(function() {

class Site {
  constructor(row, item_list) {
    this.item_list = item_list;
    this.renderOptionalStats = this.renderOptionalStats.bind(this);
    this.render = this.render.bind(this);
    this.renderMergedExpander = this.renderMergedExpander.bind(this);
    this.handleMergedExpandClick = this.handleMergedExpandClick.bind(this);
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
    this.handleUpdateAllClick = this.handleUpdateAllClick.bind(this);
    this.handlePauseAllClick = this.handlePauseAllClick.bind(this);
    this.handleResumeAllClick = this.handleResumeAllClick.bind(this);
    this.handleCheckfilesAllClick = this.handleCheckfilesAllClick.bind(this);
    this.handleDeleteAllClick = this.handleDeleteAllClick.bind(this);
    this.handleUnfavoriteClick = this.handleUnfavoriteClick.bind(this);
    this.handleFavoriteClick = this.handleFavoriteClick.bind(this);
    this.deleted = false;
    // The declared favicon failed to load; fall back to the brand-color dot.
    // Bound once: maquette forbids a function property changing identity
    // across renders.
    this.favicon_failed = false;
    this.handleFaviconError = () => {
      this.favicon_failed = true;
      return Page.projector.scheduleRender();
    };
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

  // A merger renders twice (overview row + its line in the sublist), each
  // copy with its own favorite flag; keep both in sync when either toggles.
  setFavorite(favorite) {
    var ref, ref1;
    this.favorite = favorite;
    if ((ref = Page.site_list.sites_byaddress[this.row.address]) != null) {
      ref.favorite = favorite;
    }
    if ((ref1 = Page.site_list.merger_dups[this.row.address]) != null) {
      ref1.favorite = favorite;
    }
  }

  handleFavoriteClick() {
    this.setFavorite(true);
    this.menu = new Menu();
    Page.settings.favorite_sites[this.row.address] = true;
    Page.saveSettings();
    Page.site_list.reorder();
    return false;
  }

  handleUnfavoriteClick() {
    this.setFavorite(false);
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

  // Group actions on the overview row fan the existing single-site commands
  // out to the parent plus every merged xite. The sublist rows keep the
  // plain single-site actions. Favorite and Save as .zip stay parent-only
  // on purpose: favoriting already relocates the whole group, and a zip
  // fan-out would start N downloads.
  handleUpdateAllClick() {
    var i, len, merged_sites, site;
    Page.cmd("siteUpdate", {
      "address": this.row.address
    });
    this.show_errors = true;
    merged_sites = this.getMergedSites() || [];
    for (i = 0, len = merged_sites.length; i < len; i++) {
      site = merged_sites[i];
      Page.cmd("siteUpdate", {
        "address": site.row.address
      });
      site.show_errors = true;
    }
    return false;
  }

  handlePauseAllClick() {
    var i, len, merged_sites, site;
    Page.cmd("sitePause", {
      "address": this.row.address
    });
    merged_sites = this.getMergedSites() || [];
    for (i = 0, len = merged_sites.length; i < len; i++) {
      site = merged_sites[i];
      Page.cmd("sitePause", {
        "address": site.row.address
      });
    }
    return false;
  }

  handleResumeAllClick() {
    var i, len, merged_sites, site;
    Page.cmd("siteResume", {
      "address": this.row.address
    });
    merged_sites = this.getMergedSites() || [];
    for (i = 0, len = merged_sites.length; i < len; i++) {
      site = merged_sites[i];
      Page.cmd("siteResume", {
        "address": site.row.address
      });
    }
    return false;
  }

  handleCheckfilesAllClick() {
    var i, len, merged_sites, site;
    Page.cmd("siteUpdate", {
      "address": this.row.address,
      "check_files": true,
      since: 0
    });
    this.show_errors = true;
    merged_sites = this.getMergedSites() || [];
    for (i = 0, len = merged_sites.length; i < len; i++) {
      site = merged_sites[i];
      Page.cmd("siteUpdate", {
        "address": site.row.address,
        "check_files": true,
        since: 0
      });
      site.show_errors = true;
    }
    return false;
  }

  // "Delete all" on a group overview row: one confirm for the whole group,
  // then the standard delete for every merged xite and the parent last.
  // No per-site blacklist flow here - that stays on the individual rows.
  // Owned xites are excluded (they keep their sidebar delete flow).
  handleDeleteAllClick() {
    var deletable, i, len, merged_sites, message, owned, site;
    merged_sites = this.getMergedSites() || [];
    deletable = [];
    owned = 0;
    for (i = 0, len = merged_sites.length; i < len; i++) {
      site = merged_sites[i];
      if (site.row.settings.own) {
        owned += 1;
      } else {
        deletable.push(site);
      }
    }
    if (this.row.settings.own) {
      owned += 1;
    }
    message = _("Delete this xite and its ") + merged_sites.length + _(" merged xites?");
    if (owned > 0) {
      message += _(" Owned xites are kept.");
    }
    Page.cmd("wrapperConfirm", [message, _("Delete all")], (confirmed) => {
      var j, len1;
      if (!confirmed) {
        return;
      }
      for (j = 0, len1 = deletable.length; j < len1; j++) {
        deletable[j].deleteSite();
      }
      if (!this.row.settings.own) {
        return this.deleteSite();
      }
    });
    return false;
  }

  // Toggle this merger's nested merged xite sublist; the choice persists per
  // merger address the same way as favorites (userSetSettings).
  handleMergedExpandClick() {
    if (Page.settings.merged_expanded == null) {
      Page.settings.merged_expanded = {};
    }
    if (Page.settings.merged_expanded[this.row.address]) {
      delete Page.settings.merged_expanded[this.row.address];
    } else {
      Page.settings.merged_expanded[this.row.address] = true;
    }
    Page.saveSettings();
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
    Page.cmd("wrapperConfirm", ["Are you sure?" + (" Any modifications you made on<br><b>" + this.row.content.title + "</b> xite's js/css files will be lost."), "Upgrade"], (confirmed) => {
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
      Page.cmd("wrapperConfirm", ["You can delete your xite using the xite's sidebar.", ["Open xite"]], (confirmed) => {
        if (confirmed) {
          return window.top.location = this.getHref() + "#EpixNet:OpenSidebar";
        }
      });
    } else {
      if (!this.row.content.title) {
        this.deleteSite();
      } else {
        Page.cmd("wrapperConfirm", ["Are you sure?" + (" <b>" + this.row.content.title + "</b>"), ["Delete", "Blacklist"]], (confirmed) => {
          if (confirmed === 1) {
            return this.deleteSite();
          } else if (confirmed === 2) {
            return Page.cmd("wrapperPrompt", ["Blacklist <b>" + this.row.content.title + "</b>", "text", "Delete and Blacklist", "Reason"], (reason) => {
              return this.deleteSite(() => {
                Page.cmd("siteblockAdd", [this.row.address, reason]);
              });
            });
          }
        });
      }
    }
    return false;
  }

  deleteSite(onSuccess) {
    // Wait for the server: only remove the row when the delete actually
    // succeeded, so a refusal (e.g. NoNewSites) leaves the site in place.
    // The node surfaces policy refusals as their own notification.
    Page.cmd("siteDelete", { "address": this.row.address }, (res) => {
      var ref;
      if (res && res.error) {
        return false; // refused - keep the row; the node showed why
      }
      if (onSuccess) {
        onSuccess();
      }
      // Delete the canonical list item: `this` may be a merger's sublist
      // copy, which the item list does not hold.
      this.item_list.deleteItem((ref = this.item_list.items_bykey[this.row.address]) != null ? ref : this);
      return Page.projector.scheduleRender();
    });
    return false;
  }

  handleSettingsClick(e) {
    var merged_sites;
    // On a group overview row Update / Check files / Pause / Resume / Delete
    // become their "all" variants and cover the parent + its merged xites.
    // The Pause<->Resume flip follows the PARENT's serving state, like any
    // single row. Favorite and Save as .zip stay parent-scoped.
    merged_sites = this.getMergedSites();
    this.menu.items = [];
    if (this.favorite) {
      this.menu.items.push([_("Unfavorite"), this.handleUnfavoriteClick]);
    } else {
      this.menu.items.push([_("Favorite"), this.handleFavoriteClick]);
    }
    if (merged_sites) {
      this.menu.items.push([_("Update all"), this.handleUpdateAllClick]);
      this.menu.items.push([_("Check all files"), this.handleCheckfilesAllClick]);
      if (this.row.settings.serving) {
        this.menu.items.push([_("Pause all"), this.handlePauseAllClick]);
      } else {
        this.menu.items.push([_("Resume all"), this.handleResumeAllClick]);
      }
    } else {
      this.menu.items.push([_("Update"), this.handleUpdateClick]);
      this.menu.items.push([_("Check files"), this.handleCheckfilesClick]);
      if (this.row.settings.serving) {
        this.menu.items.push([_("Pause"), this.handlePauseClick]);
      } else {
        this.menu.items.push([_("Resume"), this.handleResumeClick]);
      }
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
    if (merged_sites) {
      this.menu.items.push([_("Delete all"), this.handleDeleteAllClick]);
    } else {
      this.menu.items.push([_("Delete"), this.handleDeleteClick]);
    }
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
      Page.cmd("OptionalHelpAll", [false, this.row.address], () => {
        this.row.settings.autodownloadoptional = false;
        return Page.projector.scheduleRender();
      });
    } else {
      Page.cmd("OptionalHelpAll", [true, this.row.address], () => {
        this.row.settings.autodownloadoptional = true;
        return Page.projector.scheduleRender();
      });
    }
    // Keep the menu open (like the per-directory hearts) so the toggled
    // heart is visible instead of the menu vanishing on click.
    return true;
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
        Page.cmd("wrapperNotification", ["done", "Xite <b>" + this.row.content.title + "</b> storage limit modified to <b>" + this.row.need_limit + "MB</b>", 5000]);
      } else {
        Page.cmd("wrapperNotification", ["error", res.error]);
      }
      return Page.projector.scheduleRender();
    });
    return false;
  }

  // The rail marker: the xite's declared favicon when it loads, else the
  // brand-color dot.
  renderMarker() {
    var favicon = this.row.content ? this.row.content.favicon : null;
    if (favicon && !this.favicon_failed) {
      return h("img.favicon", {
        src: "/" + this.row.address + "/" + favicon,
        alt: "",
        onerror: this.handleFaviconError
      });
    }
    return h("div.circle." + Text.toBrandClass(this.row.address), ["\u2022"]);
  }

  // The merged xites nested under this row when it is a group overview row;
  // null for sublist copies (is_merged_child) and ordinary sites.
  getMergedSites() {
    var merged_sites, ref, ref1;
    if (this.is_merged_child) {
      return null;
    }
    merged_sites = (ref = Page.site_list) != null ? (ref1 = ref.merged_children) != null ? ref1[this.row.address] : void 0 : void 0;
    if (merged_sites && merged_sites.length) {
      return merged_sites;
    }
    return null;
  }

  // The merger row's expander: chevron + merged xite count, toggles the
  // nested sublist. A span, not an anchor: it sits inside the row's link.
  // The merger's own line inside the sublist (is_merged_child) stays a
  // plain individual row.
  renderMergedExpander() {
    var merged_sites, ref;
    merged_sites = this.getMergedSites();
    if (!merged_sites) {
      return void 0;
    }
    return h("span.merged-expander", {
      classes: {
        expanded: !!((ref = Page.settings.merged_expanded) != null ? ref[this.row.address] : void 0)
      },
      title: merged_sites.length + " " + _("merged xites"),
      onclick: this.handleMergedExpandClick
    }, [h("div.icon-arrow-down"), h("span.value", ["" + merged_sites.length])]);
  }

  render() {
    var merged_expander, merged_stats, now, ref;
    now = Date.now() / 1000;
    merged_expander = this.renderMergedExpander();
    // A merger's row is the group overview: the newest update time across
    // the group and everyone's peers summed (own size). Its own numbers show
    // on its individual line inside the expanded sublist.
    merged_stats = merged_expander ? this.merged_stats : null;
    return h("div.site", {
      key: this.key,
      "data-key": this.key,
      classes: {
        "modified-lastday": now - (merged_stats ? merged_stats.modified : this.row.settings.modified) < 60 * 60 * 24,
        "disabled": !this.row.settings.serving && !this.row.demo,
        "working": this.isWorking(),
        "has-merged": !!merged_expander
      }
    }, this.renderMarker(), h("a.inner", {
      href: this.getHref(),
      title: ((ref = this.row.content.title) != null ? ref.length : void 0) > 20 ? this.row.content.title : void 0
    }, [
      h("span.title", [this.row.content.title || this.row.address]), merged_expander, h("div.details", [
        h("div.message", {
          classes: {
            visible: this.message_visible,
            done: this.message_class === 'done',
            error: this.message_class === 'error',
            collapsed: this.message_collapsed
          }
        }, [this.message]),
        h("span.modified", [h("div.icon-clock"), Page.settings.sites_orderby === "size" ? h("span.value", [(this.row.settings.size / 1024 / 1024 + (this.row.settings.size_optional != null) / 1024 / 1024).toFixed(1), "MB"]) : h("span.value", [Time.sinceShort(merged_stats ? merged_stats.modified : this.row.settings.modified)])]), h("span.peers", [h("div.icon-profile"), h("span.value", [merged_stats ? merged_stats.peers : Math.max((this.row.settings.peers ? this.row.settings.peers : 0), this.row.peers)])])
      ]), this.row.demo ? h("div.details.demo", "Activate \u00BB") : void 0, this.row.need_limit ? h("a.details.needaction", {
        href: "#Set+limit",
        onclick: this.handleLimitIncreaseClick
      }, "Set limit to " + this.row.need_limit + "MB") : void 0
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
    stroke = "hsl(" + (Math.min(555, value * 50)) + ", 55%, 55%)";
    return h("div.circle", {
      title: "Upload/Download ratio",
      innerHTML: "<svg class=\"circle-svg\" width=\"30\" height=\"30\" viewPort=\"0 0 30 30\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\">\n  \t\t\t<circle r=\"12\" cx=\"15\" cy=\"15\" fill=\"transparent\" class='circle-bg'></circle>\n  \t\t\t<circle r=\"12\" cx=\"15\" cy=\"15\" fill=\"transparent\" class='circle-fg' style='stroke-dashoffset: " + dashoffset + "; stroke: " + stroke + "'></circle>\n</svg>"
    });
  }

  renderOptionalStats() {
    var ratio, ratio_value, ratio_hue, row, sent, recv;
    row = this.row;
    // Guard the division: a fresh site (or an older node that doesn't send
    // the fields) has 0/0 or undefined/undefined, which renders "NaN".
    // No downloads yet: anything uploaded counts as infinite, else 0.
    sent = row.settings.bytes_sent || 0;
    recv = row.settings.bytes_recv || 0;
    ratio_value = recv > 0 ? sent / recv : (sent > 0 ? 100 : 0);
    ratio = ratio_value.toFixed(1);
    if (ratio_value >= 100) {
      ratio = "\u221E";
    } else if (ratio_value >= 10) {
      ratio = ratio_value.toFixed(0);
    }
    ratio_hue = Math.min(555, ratio_value * 50);
    return h("div.site", {
      key: this.key
    }, [
      h("div.title", [
        h("h3.name", h("a", {
          href: this.getHref()
        }, row.content.title)), h("div.size", {
          title: "Xite size limit: " + (Text.formatSize(row.size_limit * 1024 * 1024))
        }, [
          "" + (Text.formatSize(row.settings.size)), h("div.bar", h("div.bar-active", {
            style: "width: " + (100 * (row.settings.size / (row.size_limit * 1024 * 1024))) + "%"
          }))
        ]), h("div.plus", "+"), h("div.size.size-optional", {
          title: "Optional files on xite: " + (Text.formatSize(row.settings.size_optional))
        }, [
          "" + (Text.formatSize(row.settings.optional_downloaded)), h("span.size-title", _("Optional")), h("div.bar", h("div.bar-active", {
            style: "width: " + (100 * (row.settings.optional_downloaded / row.settings.size_optional)) + "%"
          }))
        ]), h("a.helps", {
          href: "#",
          onmousedown: this.handleHelpsClick,
          onclick: Page.returnFalse
        }, h("div.icon-share"), this.row.settings.autodownloadoptional ? "\u2661" : this.optional_helps.length, h("div.icon-arrow-down"), this.menu_helps ? this.menu_helps.render() : void 0), this.renderCircle(parseFloat(ratio_value.toFixed(1)), 10), h("div.circle-value", {
          classes: {
            negative: ratio < 1
          },
          style: "color: hsl(" + ratio_hue + ", 55%, 55%)"
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
