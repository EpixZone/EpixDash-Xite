(function() {

class SiteList {
  constructor() {
    this.onSiteInfo = this.onSiteInfo.bind(this);
    this.render = this.render.bind(this);
    this.handleSiteListMoreClick = this.handleSiteListMoreClick.bind(this);
    this.handleFilterClear = this.handleFilterClear.bind(this);
    this.handleFilterKeyup = this.handleFilterKeyup.bind(this);
    this.handleFilterInput = this.handleFilterInput.bind(this);
    this.renderMergedSites = this.renderMergedSites.bind(this);
    this.renderSiteRows = this.renderSiteRows.bind(this);
    this.reorder = this.reorder.bind(this);
    this.sortRows = this.sortRows.bind(this);
    this.reorderTimer = this.reorderTimer.bind(this);
    this.closeRowActions = this.closeRowActions.bind(this);
    // The Site instance whose inline action strip is open; one strip open
    // app-wide. The panel and the health screen fold it via closeRowActions.
    this.open_actions_site = null;
    this.item_list = new ItemList(Site, "address");
    this.sites = this.item_list.items;
    this.sites_byaddress = this.item_list.items_bykey;
    this.inactive_demo_sites = null;
    this.loaded = false;
    this.on_loaded = new Deferred();
    this.schedule_reorder = false;
    this.merged_db = {};
    // Merged xite grouping, rebuilt on every render: merger address -> its
    // merged xites (nested sublist), merged_type -> merged xites whose type
    // no displayed merger accepts (flat "Merged:" fallback sections).
    this.merged_children = {};
    this.merged_orphans = {};
    // The merger's own line inside its expanded sublist. A second Site
    // instance per merger: the overview row shows group aggregates, and a
    // shared instance would render its single Menu (one stored node) into
    // both rows, so the sub-row keeps its own state.
    this.merger_dups = {};
    this.filtering = "";
    setInterval(this.reorderTimer, 10000);
    this.limit = 100;
    Page.on_settings.then(() => {
      return Page.on_server_info.then(() => {
        this.update();
        return Page.cmd("channelJoinAllsite", {
          "channel": "siteChanged"
        });
      });
    });
  }

  reorderTimer() {
    if (!this.schedule_reorder) {
      return;
    }
    // Defer while the pointer hovers the list (rows must not jump under the
    // cursor), while anything is updating, and while another mode covers the
    // list anyway.
    if (!document.querySelector('#SiteList:hover') && !document.querySelector(".working") && Page.mode !== "Files") {
      this.reorder();
      return this.schedule_reorder = false;
    }
  }

  // Fold the open row-action strip (one strip open app-wide). Called by the
  // panel and the health screen when they open; safe to call any time.
  closeRowActions() {
    if (!this.open_actions_site) {
      return;
    }
    this.open_actions_site = null;
    Page.projector.scheduleRender();
  }

  sortRows(rows) {
    if (Page.settings.sites_orderby === "modified") {
      rows.sort(function(a, b) {
        return b.row.settings.modified - a.row.settings.modified;
      });
    } else if (Page.settings.sites_orderby === "addtime") {
      rows.sort(function(a, b) {
        return b.row.settings.added - a.row.settings.added;
      });
    } else if (Page.settings.sites_orderby === "size") {
      rows.sort(function(a, b) {
        return b.row.settings.size - a.row.settings.size;
      });
    } else {
      rows.sort(function(a, b) {
        return Math.max(b.row.peers, b.row.settings.peers) - Math.max(a.row.peers, a.row.settings.peers);
      });
    }
    return rows;
  }

  reorder() {
    this.sortRows(this.item_list.items);
    return Page.projector.scheduleRender();
  }

  update() {
    var args;
    args = {
      connecting_sites: true
    };
    Page.cmd("siteList", args, (site_rows) => {
      var favorite_sites;
      favorite_sites = Page.settings.favorite_sites;
      this.item_list.sync(site_rows);
      this.sortRows(this.item_list.items);
      if (this.inactive_demo_sites === null) {
        this.updateInactiveDemoSites();
      }
      Page.projector.scheduleRender();
      this.loaded = true;
      this.log("loaded");
      return this.on_loaded.resolve();
    });
    return this;
  }

  updateInactiveDemoSites() {
    var demo_site_rows, i, len, results, site_row;
    demo_site_rows = [];
    this.inactive_demo_sites = [];
    results = [];
    for (i = 0, len = demo_site_rows.length; i < len; i++) {
      site_row = demo_site_rows[i];
      if (this.filtering && site.row.content.title.toLowerCase().indexOf(this.filtering.toLowerCase()) === -1) {
        continue;
      }
      if (!this.sites_byaddress[site_row.address]) {
        results.push(this.inactive_demo_sites.push(new Site(site_row)));
      } else {
        results.push(void 0);
      }
    }
    return results;
  }

  // Nest each merged xite under the merger xite that accepts its merged_type
  // (settings.permissions has "Merger:<type>"). First displayed merger wins;
  // types with no displayed merger stay in the flat "Merged:" sections.
  groupMergedSites(section_rows) {
    var base, i, j, k, len, len1, len2, merged_type, merger, mergers_bytype, name, permission, ref, ref1, rows, site, stats;
    mergers_bytype = {};
    for (i = 0, len = section_rows.length; i < len; i++) {
      rows = section_rows[i];
      for (j = 0, len1 = rows.length; j < len1; j++) {
        site = rows[j];
        ref1 = ((ref = site.row.settings) != null ? ref.permissions : void 0) || [];
        for (k = 0, len2 = ref1.length; k < len2; k++) {
          permission = ref1[k];
          if (permission.indexOf("Merger:") !== 0) {
            continue;
          }
          merged_type = permission.slice("Merger:".length);
          if (mergers_bytype[merged_type] == null) {
            mergers_bytype[merged_type] = site;
          }
        }
      }
    }
    this.merged_children = {};
    this.merged_orphans = {};
    ref = this.sites_merged;
    for (i = 0, len = ref.length; i < len; i++) {
      site = ref[i];
      merger = mergers_bytype[site.row.content.merged_type];
      if (merger) {
        if ((base = this.merged_children)[name = merger.row.address] == null) {
          base[name] = [];
        }
        this.merged_children[merger.row.address].push(site);
      } else {
        if ((base = this.merged_orphans)[name = site.row.content.merged_type] == null) {
          base[name] = [];
        }
        this.merged_orphans[site.row.content.merged_type].push(site);
      }
    }
    // The merger's row becomes the group's overview line: newest update time
    // across the group and the sum of everyone's peers. Size stays its own.
    ref1 = this.merged_children;
    for (name in ref1) {
      rows = ref1[name];
      merger = this.sites_byaddress[name];
      if (!merger) {
        continue;
      }
      stats = {
        modified: merger.row.settings.modified,
        peers: Math.max(merger.row.settings.peers || 0, merger.row.peers || 0)
      };
      for (i = 0, len = rows.length; i < len; i++) {
        site = rows[i];
        stats.modified = Math.max(stats.modified, site.row.settings.modified || 0);
        stats.peers += Math.max(site.row.settings.peers || 0, site.row.peers || 0);
      }
      merger.merged_stats = stats;
    }
  }

  // A section's rows; a merger with its sublist expanded gets its own
  // individual line and then its merged xites right under the overview row,
  // all rendered by the normal Site renderer.
  renderSiteRows(sites) {
    var back, dup, i, len, merged_sites, ref, site;
    back = [];
    for (i = 0, len = sites.length; i < len; i++) {
      site = sites[i];
      back.push(site.render());
      merged_sites = this.merged_children[site.row.address];
      if (merged_sites && ((ref = Page.settings.merged_expanded) != null ? ref[site.row.address] : void 0)) {
        dup = this.merger_dups[site.row.address];
        if (dup == null) {
          dup = this.merger_dups[site.row.address] = new Site(site.row, this.item_list);
          dup.is_merged_child = true;
        }
        dup.row = site.row;
        back.push(h("div.merged-sub", {
          key: "merged-sub-" + site.row.address,
          enterAnimation: Animation.slideDown,
          exitAnimation: Animation.slideUpInout
        }, [dup.render()].concat(merged_sites.map(function(item) {
          return item.render();
        }))));
      }
    }
    return back;
  }

  renderMergedSites() {
    var back, merged_sites, merged_type, ref;
    back = [];
    ref = this.merged_orphans;
    for (merged_type in ref) {
      merged_sites = ref[merged_type];
      back.push([
        h("h2.more", {
          key: "Merged: " + merged_type
        }, "Merged: " + merged_type), h("div.SiteList.merged.merged-" + merged_type, merged_sites.map(function(item) {
          return item.render();
        }))
      ]);
    }
    return back;
  }

  handleFilterInput(e) {
    return this.filtering = e.target.value;
  }

  handleFilterKeyup(e) {
    if (e.keyCode === 27) {
      e.target.value = "";
      this.handleFilterInput(e);
    }
    return false;
  }

  handleFilterClear(e) {
    e.target.value = "";
    this.handleFilterInput(e);
    return false;
  }

  handleSiteListMoreClick(e) {
    this.limit += 1000;
    Page.projector.scheduleRender();
    return false;
  }

  render() {
    var filter_base, i, len, num_found, ref, ref1, ref2, site;
    if (!this.loaded) {
      // Same props shape as the loaded return: maquette throws if a node's
      // properties appear only on a later render.
      return h("div#SiteList", {
        classes: {
          compact: false
        }
      }, []);
    }
    this.sites_needaction = [];
    this.sites_favorited = [];
    this.sites_owned = [];
    this.sites_recent = [];
    this.sites_connected = [];
    this.sites_connecting = [];
    this.sites_merged = [];
    num_found = 0;
    ref = this.sites;
    for (i = 0, len = ref.length; i < len; i++) {
      site = ref[i];
      if (this.filtering) {
        filter_base = site.row.content.title + site.row.content.merged_type + site.row.address;
        if (filter_base.toLowerCase().indexOf(this.filtering.toLowerCase()) === -1) {
          continue;
        }
      }
      if (site.row.settings.size * 1.2 > site.row.size_limit * 1024 * 1024) {
        site.row.need_limit = site.row.size_limit * 2;
        this.sites_needaction.push(site);
      } else if (site.favorite) {
        this.sites_favorited.push(site);
      } else if (site.row.content.merged_type) {
        this.sites_merged.push(site);
      } else if ((ref1 = site.row.settings) != null ? ref1.own : void 0) {
        this.sites_owned.push(site);
      } else if (((ref2 = site.row.settings) != null ? ref2.downloaded : void 0) > Time.timestamp() - 60 * 60 * 24) {
        this.sites_recent.push(site);
      } else if (site.row.content.title) {
        this.sites_connected.push(site);
      } else {
        this.sites_connecting.push(site);
      }
      num_found += 1;
    }
    this.groupMergedSites([this.sites_needaction, this.sites_favorited, this.sites_owned, this.sites_recent, this.sites_connected.slice(0, +(this.limit - 1) + 1 || 9e9), this.sites_connecting]);
    return h("div#SiteList", {
      // Same threshold that shows the filter box: once the list is long
      // enough to need searching, rows tighten to one line each so more
      // xites fit on screen without scrolling.
      classes: {
        compact: this.sites.length > 10
      }
    }, [
      this.sites.length > 10 ? h("input.site-filter", {
        placeholder: "Filter: Xite name",
        spellcheck: false,
        oninput: this.handleFilterInput,
        onkeyup: this.handleFilterKeyup,
        value: this.filtering
      }) : void 0, this.filtering ? [
        h("span.filter-num", {
          updateAnimation: Animation.show,
          enterAnimation: Animation.show,
          exitAnimation: Animation.hide
        }, "(found " + num_found + " of " + this.sites.length + " xites)"), h("a.filter-clear", {
          href: "#clear",
          onclick: this.handleFilterClear
        }, "\u00D7")
      ] : void 0, this.sites_recent.length > 0 ? h("h2.recent", "Recently downloaded:") : void 0, h("div.SiteList.recent", this.renderSiteRows(this.sites_recent)), this.sites_needaction.length > 0 ? h("h2.needaction", _("Running out of size limit:")) : void 0, h("div.SiteList.needaction", this.renderSiteRows(this.sites_needaction)), this.sites_favorited.length > 0 ? h("h2.favorited", _("Favorited xites:")) : void 0, h("div.SiteList.favorited", this.renderSiteRows(this.sites_favorited)), this.sites_owned.length > 0 ? h("h2.owned", _("Owned xites:")) : void 0, h("div.SiteList.owned", this.renderSiteRows(this.sites_owned)), this.sites_connecting.length > 0 ? h("h2.connecting", _("Connecting xites:")) : void 0, h("div.SiteList.connecting", this.renderSiteRows(this.sites_connecting)), this.sites_connected.length > 0 ? h("h2.connected", _("Connected xites:")) : void 0, h("div.SiteList.connected", [
        this.renderSiteRows(this.sites_connected.slice(0, +(this.limit - 1) + 1 || 9e9)), this.sites_connected.length > this.limit ? h("a.site-list-more", {
          href: "#Show+more+connected+sites",
          onclick: this.handleSiteListMoreClick
        }, _("Show more")) : void 0
      ]), this.renderMergedSites(), this.inactive_demo_sites !== null && this.inactive_demo_sites.length > 0 ? [
        h("h2.more", {
          key: "More"
        }, _("More xites:")), h("div.SiteList.more", this.inactive_demo_sites.map(function(item) {
          return item.render();
        }))
      ] : void 0
    ]);
  }

  onSiteInfo(site_info) {
    var ref, ref1;
    if ((ref = this.item_list.items_bykey[site_info.address]) != null) {
      ref.setRow(site_info);
    }
    if ((ref1 = this.merger_dups[site_info.address]) != null) {
      ref1.setRow(site_info);
    }
    this.schedule_reorder = true;
    return Page.projector.scheduleRender();
  }
}

Object.assign(SiteList.prototype, LogMixin);
window.SiteList = SiteList;

})();
