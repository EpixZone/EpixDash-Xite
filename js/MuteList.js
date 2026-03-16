(function() {

class MuteList {
  constructor() {
    this.show = this.show.bind(this);
    this.render = this.render.bind(this);
    this.renderIncludes = this.renderIncludes.bind(this);
    this.renderSiteblocks = this.renderSiteblocks.bind(this);
    this.renderMutes = this.renderMutes.bind(this);
    this.storeNode = this.storeNode.bind(this);
    this.afterUpdate = this.afterUpdate.bind(this);
    this.handleIncludeRemoveClick = this.handleIncludeRemoveClick.bind(this);
    this.handleMuteRemoveClick = this.handleMuteRemoveClick.bind(this);
    this.handleHideClick = this.handleHideClick.bind(this);
    this.updateFilterIncludes = this.updateFilterIncludes.bind(this);
    this.update = this.update.bind(this);
    this.mutes = null;
    this.includes = null;
    this.visible = false;
    this.max_height = 0;
    this.updated = false;
    this.siteblocks_serving = [];
    Page.site_list.on_loaded.then(() => {
      return this.updateFilterIncludes();
    });
  }

  update() {
    this.need_update = false;
    Page.cmd("MuteList", [], (res) => {
      var auth_address, mute;
      this.mutes = [];
      for (auth_address in res) {
        mute = res[auth_address];
        mute.auth_address = auth_address;
        mute.site = Page.site_list.sites_byaddress[mute.source];
        this.mutes.push(mute);
      }
      this.mutes.sort(function(a, b) {
        return b.date_added - a.date_added;
      });
      if (!this.max_height) {
        this.max_height = 100;
      }
      this.updated = true;
      return Page.projector.scheduleRender();
    });
    return this.updateFilterIncludes();
  }

  updateFilterIncludes() {
    return Page.cmd("FilterIncludeList", {
      all_sites: true,
      filters: true
    }, (res) => {
      var address, auth_address, i, include, len, mute, mutes, ref, ref1, siteblock, siteblocks;
      this.siteblocks_serving = [];
      this.includes = [];
      for (i = 0, len = res.length; i < len; i++) {
        include = res[i];
        include.site = Page.site_list.sites_byaddress[include.address];
        mutes = [];
        if (include.mutes != null) {
          ref = include.mutes;
          for (auth_address in ref) {
            mute = ref[auth_address];
            mute.auth_address = auth_address;
            mutes.push(mute);
          }
        }
        include.mutes = mutes;
        siteblocks = [];
        if (include.siteblocks != null) {
          ref1 = include.siteblocks;
          for (address in ref1) {
            siteblock = ref1[address];
            siteblock.address = address;
            siteblocks.push(siteblock);
            if (Page.site_list.sites_byaddress[address] && !Page.settings.siteblocks_ignore[address]) {
              siteblock.site = Page.site_list.sites_byaddress[address];
              this.siteblocks_serving.push(siteblock);
            }
          }
        }
        include.siteblocks = siteblocks;
        this.includes.push(include);
      }
      this.includes.sort(function(a, b) {
        return b.date_added - a.date_added;
      });
      this.updated = true;
      return Page.projector.scheduleRender();
    });
  }

  handleHideClick() {
    this.visible = false;
    setTimeout((() => {
      return this.updateFilterIncludes();
    }), 1000);
    this.max_height = 0;
    Page.projector.scheduleRender();
    return false;
  }

  handleMuteRemoveClick(e) {
    var mute;
    mute = e.target.mute;
    if (mute.removed) {
      Page.cmd("muteAdd", [mute.auth_address, mute.cert_user_id, mute.reason]);
    } else {
      Page.cmd("muteRemove", mute.auth_address);
    }
    mute.removed = !mute.removed;
    return false;
  }

  handleIncludeRemoveClick(e) {
    var include;
    include = e.target.include;
    if (include.removed) {
      Page.cmd("filterIncludeAdd", [include.inner_path, include.description, include.address]);
    } else {
      Page.cmd("filterIncludeRemove", {
        inner_path: include.inner_path,
        address: include.address
      });
    }
    include.removed = !include.removed;
    return false;
  }

  afterUpdate() {
    this.updated = false;
    if (this.node && this.visible) {
      this.max_height = this.node.offsetHeight + 100;
      return Page.projector.scheduleRender();
    }
  }

  storeNode(node) {
    return this.node = node;
  }

  renderMutes(mutes, mode) {
    if (mode == null) {
      mode = "mutes";
    }
    return h("div.mutes", [
      h("div.mute.mute-head", [
        h("div.mute-col", "Muted user"), h("div.mute-col", {
          style: "width: 66%"
        }, "Why?")
      ]), mutes.map((mute) => {
        return h("div.mute", {
          key: mute.auth_address,
          classes: {
            removed: mute.removed
          }
        }, [
          h("div.mute-col", [h("div.cert_user_id", mute.cert_user_id), h("div.auth_address", mute.auth_address)]), h("div.mute-col", {
            style: "width: 66%"
          }, [
            h("div.source", mute.site != null ? mute.site.row.content.title : mute.source), h("div.reason", {
              innerHTML: Text.renderMarked(mute.reason)
            }), h("div.date_added", " \u2500 " + Time.since(mute.date_added))
          ]), mode === "mutes" ? h("a.action", {
            href: "#Unmute",
            onclick: this.handleMuteRemoveClick,
            mute: mute
          }, "\u00D7") : void 0
        ]);
      })
    ]);
  }

  renderSiteblocks(siteblocks) {
    return h("div.siteblocks", [
      h("div.mute.mute-head", [
        h("div.mute-col", "Blocked site"), h("div.mute-col", {
          style: "width: 66%"
        }, "Why?")
      ]), siteblocks.map((siteblock) => {
        return h("div.mute", {
          key: siteblock.address,
          classes: {
            removed: siteblock.removed
          }
        }, [
          h("div.mute-col", [h("div.cert_user_id", siteblock.name), h("div.auth_address", siteblock.address)]), h("div.mute-col", {
            style: "width: 66%"
          }, [
            h("div.reason", {
              innerHTML: Text.renderMarked(siteblock.reason)
            }), h("div.date_added", " \u2500 " + Time.since(siteblock.date_added))
          ])
        ]);
      })
    ]);
  }

  renderIncludes() {
    return h("div.includes", [
      this.includes.map((include) => {
        return h("div.include", {
          key: include.address + include.inner_path,
          classes: {
            removed: include.removed
          }
        }, [
          h("h2", h("a.site", {
            href: include.site.getHref()
          }, include.site.row.content.title), " \u203A ", h("a.inner_path", {
            href: "#"
          }, include.inner_path)), h("a.action", {
            href: "#Remove+include",
            onclick: this.handleIncludeRemoveClick,
            include: include
          }, "\u00D7"), include.mutes.length ? this.renderMutes(include.mutes, "includes") : void 0, include.siteblocks.length ? this.renderSiteblocks(include.siteblocks) : void 0
        ]);
      })
    ]);
  }

  render() {
    var ref, ref1;
    if (this.need_update) {
      this.update();
    }
    if (!this.mutes) {
      return h("div#MuteList", {
        classes: {
          visible: false
        }
      }, "Muted");
    }
    if (this.updated) {
      this.updated = false;
      setTimeout(this.afterUpdate);
    }
    return h("div#MuteList", {
      classes: {
        visible: this.visible
      },
      style: "max-height: " + this.max_height + "px"
    }, [
      h("a.mute-hide", {
        onclick: this.handleHideClick
      }, "\u2039 Back to feed"), ((ref = this.mutes) != null ? ref.length : void 0) === 0 && ((ref1 = this.includes) != null ? ref1.length : void 0) === 0 ? h("div.mute-empty", "Your mute list is empty! :)") : h("div", {
        afterCreate: this.storeNode
      }, [this.mutes.length > 0 ? this.renderMutes(this.mutes) : void 0, this.includes ? this.renderIncludes() : void 0])
    ]);
  }

  show() {
    this.visible = true;
    Page.site_list.on_loaded.then(() => {
      return this.need_update = true;
    });
    return Page.projector.scheduleRender();
  }
}

Object.assign(MuteList.prototype, LogMixin);
window.MuteList = MuteList;

})();
