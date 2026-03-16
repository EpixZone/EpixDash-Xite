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
    this.reorder = this.reorder.bind(this);
    this.sortRows = this.sortRows.bind(this);
    this.reorderTimer = this.reorderTimer.bind(this);
    this.item_list = new ItemList(Site, "address");
    this.sites = this.item_list.items;
    this.sites_byaddress = this.item_list.items_bykey;
    this.inactive_demo_sites = null;
    this.loaded = false;
    this.on_loaded = new Deferred();
    this.schedule_reorder = false;
    this.merged_db = {};
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
    if (!document.querySelector('.left:hover') && !document.querySelector(".working") && !Page.mode === "Files") {
      this.reorder();
      return this.schedule_reorder = false;
    }
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

  renderMergedSites() {
    var back, i, len, merged_db, merged_sites, merged_type, name, ref, site;
    merged_db = {};
    ref = this.sites_merged;
    for (i = 0, len = ref.length; i < len; i++) {
      site = ref[i];
      if (!site.row.content.merged_type) {
        continue;
      }
      if (merged_db[name = site.row.content.merged_type] == null) {
        merged_db[name] = [];
      }
      merged_db[site.row.content.merged_type].push(site);
    }
    back = [];
    for (merged_type in merged_db) {
      merged_sites = merged_db[merged_type];
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
      return h("div#SiteList");
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
    return h("div#SiteList", [
      this.sites.length > 10 ? h("input.site-filter", {
        placeholder: "Filter: Site name",
        spellcheck: false,
        oninput: this.handleFilterInput,
        onkeyup: this.handleFilterKeyup,
        value: this.filtering
      }) : void 0, this.filtering ? [
        h("span.filter-num", {
          updateAnimation: Animation.show,
          enterAnimation: Animation.show,
          exitAnimation: Animation.hide
        }, "(found " + num_found + " of " + this.sites.length + " sites)"), h("a.filter-clear", {
          href: "#clear",
          onclick: this.handleFilterClear
        }, "\u00D7")
      ] : void 0, this.sites_recent.length > 0 ? h("h2.recent", "Recently downloaded:") : void 0, h("div.SiteList.recent", this.sites_recent.map(function(item) {
        return item.render();
      })), this.sites_needaction.length > 0 ? h("h2.needaction", _("Running out of size limit:")) : void 0, h("div.SiteList.needaction", this.sites_needaction.map(function(item) {
        return item.render();
      })), this.sites_favorited.length > 0 ? h("h2.favorited", _("Favorited sites:")) : void 0, h("div.SiteList.favorited", this.sites_favorited.map(function(item) {
        return item.render();
      })), this.sites_owned.length > 0 ? h("h2.owned", _("Owned sites:")) : void 0, h("div.SiteList.owned", this.sites_owned.map(function(item) {
        return item.render();
      })), this.sites_connecting.length > 0 ? h("h2.connecting", _("Connecting sites:")) : void 0, h("div.SiteList.connecting", this.sites_connecting.map(function(item) {
        return item.render();
      })), this.sites_connected.length > 0 ? h("h2.connected", _("Connected sites:")) : void 0, h("div.SiteList.connected", [
        this.sites_connected.slice(0, +(this.limit - 1) + 1 || 9e9).map(function(item) {
          return item.render();
        }), this.sites_connected.length > this.limit ? h("a.site-list-more", {
          href: "#Show+more+connected+sites",
          onclick: this.handleSiteListMoreClick
        }, _("Show more")) : void 0
      ]), this.renderMergedSites(), this.inactive_demo_sites !== null && this.inactive_demo_sites.length > 0 ? [
        h("h2.more", {
          key: "More"
        }, _("More sites:")), h("div.SiteList.more", this.inactive_demo_sites.map(function(item) {
          return item.render();
        }))
      ] : void 0
    ]);
  }

  onSiteInfo(site_info) {
    var ref;
    if ((ref = this.item_list.items_bykey[site_info.address]) != null) {
      ref.setRow(site_info);
    }
    this.schedule_reorder = true;
    return Page.projector.scheduleRender();
  }
}

Object.assign(SiteList.prototype, LogMixin);
window.SiteList = SiteList;

})();
