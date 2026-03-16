(function() {

class FeedList {
  constructor() {
    this.onSiteInfo = this.onSiteInfo.bind(this);
    this.render = this.render.bind(this);
    this.renderSearchHelp = this.renderSearchHelp.bind(this);
    this.saveFeedVisit = this.saveFeedVisit.bind(this);
    this.getClass = this.getClass.bind(this);
    this.renderNotifications = this.renderNotifications.bind(this);
    this.handleNotificationHideClick = this.handleNotificationHideClick.bind(this);
    this.renderSearchStat = this.renderSearchStat.bind(this);
    this.renderWelcome = this.renderWelcome.bind(this);
    this.renderFeed = this.renderFeed.bind(this);
    this.exitAnimation = this.exitAnimation.bind(this);
    this.enterAnimation = this.enterAnimation.bind(this);
    this.handleSearchClear = this.handleSearchClear.bind(this);
    this.handleSearchInfoClick = this.handleSearchInfoClick.bind(this);
    this.handleFilterClick = this.handleFilterClick.bind(this);
    this.handleSearchKeyup = this.handleSearchKeyup.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.storeNodeSearch = this.storeNodeSearch.bind(this);
    this.search = this.search.bind(this);
    this.update = this.update.bind(this);
    this.displayRows = this.displayRows.bind(this);
    this.checkScroll = this.checkScroll.bind(this);
    this.feeds = null;
    this.searching = null;
    this.searching_text = null;
    this.searched = null;
    this.res = null;
    this.loading = false;
    this.filter = null;
    this.feed_types = {};
    this.need_update = false;
    this.updating = false;
    this.limit = 30;
    this.query_limit = 20;
    this.query_day_limit = 3;
    this.show_stats = false;
    this.feed_keys = {};
    this.date_feed_visit = null;
    this.date_save_feed_visit = 0;
    Page.on_settings.then(() => {
      this.need_update = true;
      return document.body.onscroll = () => {
        return RateLimit(300, () => {
          return this.checkScroll();
        });
      };
    });
  }

  checkScroll() {
    var ref, scroll_top;
    scroll_top = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scroll_top + window.innerHeight > document.getElementById("FeedList").clientHeight - 400 && !this.updating && ((ref = this.feeds) != null ? ref.length : void 0) > 5 && Page.mode === "Sites" && this.limit < 300) {
      this.limit += 30;
      this.query_limit += 30;
      if (this.query_day_limit !== null) {
        this.query_day_limit += 5;
        if (this.query_day_limit > 30) {
          this.query_day_limit = null;
        }
      }
      this.log("checkScroll update");
      if (this.searching) {
        this.search(this.searching);
      } else {
        this.update();
      }
      return true;
    } else {
      return false;
    }
  }

  displayRows(rows, search) {
    var i, last_row, len, row, row_group;
    this.feeds = [];
    this.feed_keys = {};
    if (!rows) {
      return false;
    }
    rows.sort(function(a, b) {
      return a.date_added + (a.type === "mention" ? 1 : 0) - b.date_added - (b.type === "mention" ? 1 : 0);
    });
    row_group = {};
    last_row = {};
    this.feed_types = {};
    rows.reverse();
    for (i = 0, len = rows.length; i < len; i++) {
      row = rows[i];
      if (last_row.body === row.body && last_row.date_added === row.date_added) {
        continue;
      }
      if (row_group.type === row.type && row.url === row_group.url && row.site === row_group.site) {
        if (row_group.body_more == null) {
          row_group.body_more = [];
          row_group.body_more.push(row.body);
        } else if (row_group.body_more.length < 3) {
          row_group.body_more.push(row.body);
        } else {
          if (row_group.more == null) {
            row_group.more = 0;
          }
          row_group.more += 1;
        }
        row_group.feed_id = row.date_added;
      } else {
        if (row.feed_id == null) {
          row.feed_id = row.date_added;
        }
        row.key = row.site + row.type + row.title + row.feed_id;
        if (this.feed_keys[row.key]) {
          this.log("Duplicate feed key: " + row.key);
        } else {
          this.feeds.push(row);
        }
        this.feed_keys[row.key] = true;
        row_group = row;
      }
      this.feed_types[row.type] = true;
      last_row = row;
    }
    return Page.projector.scheduleRender();
  }

  update(cb) {
    var params;
    if (this.searching || this.updating) {
      return false;
    }
    if (!Page.server_info) {
      params = [];
    } else {
      params = {
        limit: this.query_limit,
        day_limit: this.query_day_limit
      };
    }
    this.logStart("Updating feed", params);
    this.updating = true;
    return Page.cmd("feedQuery", params, (res) => {
      var rows;
      if (res.rows) {
        rows = res.rows;
      } else {
        rows = res;
      }
      this.res = res;
      if (rows.length < 10 && this.query_day_limit !== null) {
        this.log("Only " + res.rows.length + " results, query without day limit");
        this.query_limit = 20;
        this.query_day_limit = null;
        this.updating = false;
        this.update();
        return false;
      }
      this.displayRows(rows);
      setTimeout(this.checkScroll, 100);
      this.logEnd("Updating feed");
      if (cb) {
        cb();
      }
      return this.updating = false;
    });
  }

  search(search, cb) {
    var params;
    if (!Page.server_info) {
      params = search;
    } else {
      params = {
        search: search,
        limit: this.query_limit * 3,
        day_limit: this.query_day_limit * 10 || null
      };
    }
    this.log("Searching for", params);
    this.loading = true;
    Page.projector.scheduleRender();
    return Page.cmd("feedSearch", params, (res) => {
      this.loading = false;
      if (res.rows.length < 10 && this.query_day_limit !== null) {
        this.log("Only " + res.rows.length + " results, search without day limit");
        this.query_limit = 30;
        this.query_day_limit = null;
        this.search(search, cb);
        return false;
      }
      this.displayRows(res["rows"], search);
      delete res["rows"];
      this.res = res;
      this.searched = search;
      if (cb) {
        return cb();
      }
    });
  }

  storeNodeSearch(node) {
    return document.body.onkeypress = (e) => {
      var ref, ref1;
      if ((ref = e.charCode) === 0 || ref === 32) {
        return;
      }
      if (((ref1 = document.activeElement) != null ? ref1.tagName : void 0) !== "INPUT") {
        return node.focus();
      }
    };
  }

  handleSearchInput(e) {
    var delay, ref;
    if (((ref = this.searching) != null ? ref.length : void 0) > 3) {
      delay = 400;
    } else {
      delay = 800;
    }
    if (Page.site_list.sites.length > 300) {
      delay = delay * 3;
    } else if (Page.site_list.sites.length > 100) {
      delay = delay * 2;
    }
    this.searching = e.target.value;
    this.searching_text = this.searching.replace(/[^ ]+:.*$/, "").trim();
    if (e.target.value === "") {
      delay = 1;
    }
    if (e.keyCode === 13) {
      delay = 1;
    }
    clearInterval(this.input_timer);
    setTimeout(() => {
      return this.waiting = true;
    });
    this.input_timer = setTimeout((() => {
      return RateLimitCb(delay, (cb_done) => {
        this.limit = 30;
        this.query_limit = 20;
        this.query_day_limit = 3;
        this.waiting = false;
        if (this.searching) {
          return this.search(this.searching, () => {
            return cb_done();
          });
        } else {
          return this.update(() => {
            cb_done();
            if (!this.searching) {
              this.searching = null;
            }
            return this.searched = null;
          });
        }
      });
    }), delay);
    return false;
  }

  handleSearchKeyup(e) {
    if (e.keyCode === 27) {
      e.target.value = "";
      this.handleSearchInput(e);
    }
    if (e.keyCode === 13) {
      this.handleSearchInput(e);
    }
    return false;
  }

  handleFilterClick(e) {
    this.filter = e.target.getAttribute("href").replace("#", "");
    if (this.filter === "all") {
      this.filter = null;
    }
    Page.projector.scheduleRender();
    return false;
  }

  handleSearchInfoClick(e) {
    this.show_stats = !this.show_stats;
    return false;
  }

  handleSearchClear(e) {
    e.target.value = "";
    this.handleSearchInput(e);
    return false;
  }

  formatTitle(title) {
    if (this.searching_text && this.searching_text.length > 1) {
      return Text.highlight(title, this.searching_text);
    } else {
      if (title) {
        return title;
      } else {
        return "";
      }
    }
  }

  formatBody(body, type) {
    var username_formatted, username_match, reply_quote;
    body = body.replace(/[\n\r]+/g, "\n");
    if (type === "comment" || type === "mention") {
      username_match = body.match(/^(([a-zA-Z0-9\.]+)@[a-zA-Z0-9\.]+|@(.*?)):/);
      if (username_match) {
        if (username_match[2]) {
          username_formatted = username_match[2] + " \u203A ";
        } else {
          username_formatted = username_match[3] + " \u203A ";
        }
        body = body.replace(username_match[0], "");
      } else {
        username_formatted = "";
      }
      // Extract reply quote: > [user](#anchor): quoted text
      reply_quote = null;
      var quote_match = body.match(/^[ ]*> \[([^\]]*)\](?:\([^)]*\))?[: ]*(.*)/m);
      if (quote_match) {
        var quote_user = quote_match[1];
        var quote_text = quote_match[2].replace(/^\s+/, "");
        if (quote_text) {
          reply_quote = {user: quote_user, text: quote_text.slice(0, 80)};
        }
      }
      // Remove all blockquote lines from body
      body = body.replace(/^[ ]*>.*$/gm, "");
      body = body.replace(/\n/g, " ");
      body = body.trim();
      if (this.searching_text && this.searching_text.length > 1) {
        body = Text.highlight(body, this.searching_text);
        if (body[0].length > 60 && body.length > 1) {
          body[0] = "..." + body[0].slice(body[0].length - 50, +(body[0].length - 1) + 1 || 9e9);
        }
        return [h("b", Text.highlight(username_formatted, this.searching_text)), body];
      } else {
        body = body.slice(0, 201);
        var result = [h("b", [username_formatted]), body];
        if (reply_quote) {
          result.push(h("div.reply-quote", [
            h("span.reply-user", reply_quote.user + ": "),
            reply_quote.text
          ]));
        }
        return result;
      }
    } else {
      body = body.replace(/\n/g, " ");
      if (this.searching_text && this.searching_text.length > 1) {
        body = Text.highlight(body, this.searching_text);
        if (body[0].length > 60) {
          body[0] = "..." + body[0].slice(body[0].length - 50, +(body[0].length - 1) + 1 || 9e9);
        }
      } else {
        body = body.slice(0, 201);
      }
      return body;
    }
  }

  formatType(type, title) {
    if (type === "comment") {
      return _("Comment on");
    } else if (type === "mention") {
      if (title) {
        return _("You got mentioned in");
      } else {
        return _("You got mentioned");
      }
    } else {
      return "";
    }
  }

  enterAnimation(elem, props) {
    if (this.searching === null) {
      return Animation.slideDown.apply(this, arguments);
    } else {
      return null;
    }
  }

  exitAnimation(elem, remove_func, props) {
    if (this.searching === null) {
      return Animation.slideUp.apply(this, arguments);
    } else {
      return remove_func();
    }
  }

  renderFeed(feed) {
    var classes, err, site, type_formatted;
    if (this.filter && feed.type !== this.filter) {
      return null;
    }
    try {
      site = Page.site_list.item_list.items_bykey[feed.site];
      type_formatted = this.formatType(feed.type, feed.title);
      classes = {};
      if (this.date_feed_visit && feed.date_added > this.date_feed_visit) {
        classes["new"] = true;
      }
      return h("div.feed." + feed.type, {
        key: feed.key,
        enterAnimation: this.enterAnimation,
        exitAnimation: this.exitAnimation,
        classes: classes
      }, [
        h("div.details", [
          h("span.dot", {
            title: "new"
          }, "\u2022"), h("a.site", {
            href: site.getHref()
          }, [site.row.content.title]), h("div.added", [Time.since(feed.date_added)])
        ]), h("div.circle", {
          style: "border-color: " + (Text.toColor(feed.type + site.row.address, 60, 60))
        }), h("div.title-container", [
          type_formatted ? h("span.type", type_formatted) : void 0, h("a.title", {
            href: site.getHref() + feed.url
          }, this.formatTitle(feed.title))
        ]), h("div.body", {
          key: feed.body,
          enterAnimation: this.enterAnimation,
          exitAnimation: this.exitAnimation
        }, this.formatBody(feed.body, feed.type)), feed.body_more ? feed.body_more.map((body_more) => {
          return h("div.body", {
            key: body_more,
            enterAnimation: this.enterAnimation,
            exitAnimation: this.exitAnimation
          }, this.formatBody(body_more, feed.type));
        }) : void 0, feed.more > 0 ? h("a.more", {
          href: site.getHref() + feed.url
        }, ["+" + feed.more + " more"]) : void 0
      ]);
    } catch (error) {
      err = error;
      this.log(err);
      return h("div", {
        key: Time.timestamp()
      });
    }
  }

  renderSearchStat(stat) {
    var back, site, total_taken;
    if (stat.taken === 0) {
      return null;
    }
    total_taken = this.res.taken;
    site = Page.site_list.item_list.items_bykey[stat.site];
    if (!site) {
      return [];
    }
    back = [];
    back.push(h("tr", {
      key: stat.site + "_" + stat.feed_name,
      classes: {
        "slow": stat.taken > total_taken * 0.1,
        "extra-slow": stat.taken > total_taken * 0.3
      }
    }, [
      h("td.site", h("a.site", {
        href: site.getHref()
      }, [site.row.content.title])), h("td.feed_name", stat.feed_name), h("td.taken", (stat.taken != null ? stat.taken + "s" : "n/a "))
    ]));
    if (stat.error) {
      back.push(h("tr.error", h("td", "Error:"), h("td", {
        colSpan: 2
      }, stat.error)));
    }
    return back;
  }

  handleNotificationHideClick(e) {
    var address;
    address = e.target.getAttribute("address");
    Page.settings.siteblocks_ignore[address] = true;
    Page.mute_list.update();
    Page.saveSettings();
    return false;
  }

  renderNotifications() {
    return h("div.notifications", {
      classes: {
        empty: Page.mute_list.siteblocks_serving.length === 0
      }
    }, [
      Page.mute_list.siteblocks_serving.map((siteblock) => {
        return h("div.notification", {
          key: siteblock.address,
          enterAnimation: Animation.show,
          exitAnimation: Animation.slideUpInout
        }, [
          "You are serving a blocked site: ", h("a.site", {
            href: siteblock.site.getHref()
          }, siteblock.site.row.content.title), h("span.reason", [h("b", "Reason: "), siteblock.reason]), h("a.hide", {
            href: "#Hide",
            onclick: this.handleNotificationHideClick,
            address: siteblock.address
          }, "\u00D7")
        ]);
      })
    ]);
  }

  getClass() {
    if (this.searching !== null) {
      return "search";
    } else {
      return "newsfeed.limit-" + this.limit;
    }
  }

  saveFeedVisit(date_feed_visit) {
    this.log("Saving feed visit...", Page.settings.date_feed_visit, "->", date_feed_visit);
    Page.settings.date_feed_visit = date_feed_visit;
    return Page.saveSettings();
  }

  renderSearchHelp() {
    return h("div.search-help", ["Tip: Search in specific site using ", h("code", "anything site:SiteName")]);
  }

  renderDiscoverSite(cssClass, address, title, description, comingSoon) {
    if (comingSoon) {
      return h("div.site." + cssClass + ".coming-soon", [
        h("div.title", [title]),
        h("div.description", [_(description)]),
        h("div.visit", [_("Coming Soon")])
      ]);
    }
    var installed = Page.site_list.sites_byaddress && Page.site_list.sites_byaddress[address];
    var href = "/" + address + "/";
    var visitText = installed ? _("Visit \u2501") : _("Activate \u2501");
    return h("a.site." + cssClass, {href: href, classes: {installed: !!installed}}, [
      h("div.title", [title]),
      h("div.description", [_(description)]),
      h("div.visit", [visitText])
    ]);
  }

  toggleUtilitySection() {
    this.utility_section_expanded = !this.utility_section_expanded;
    Page.projector.scheduleRender();
  }

  renderWelcome() {
    if (!this.onToggleUtility) {
      this.onToggleUtility = this.toggleUtilitySection.bind(this);
    }
    var utilityExpanded = this.utility_section_expanded || false;
    return h("div.welcome", [
      h("img", {src: "img/logo.png", height: 150}),
      h("h1", _("Welcome to EpixNet")),
      h("h2", _("Decentralization Without Compromise")),
      h("div.served", [_("This site currently served by "), h("b.peers", (Page.site_info["peers"] || "n/a")), _(" peers, without any central server.")]),
      h("div.sites", [
        this.renderDiscoverSite("site-epixtalk", "epix1talk58lw26c0cyrtuu8axptne2p6zf33s7xxwu", "Epix Talk", "Decentralized forum"),
        this.renderDiscoverSite("site-epixblog", "epix18l0gy59ka9ka89wm9mwsspfmkcv9tvf7g0cs6f", "Epix Blog", "Decentralized microblogging"),
        this.renderDiscoverSite("site-epixpost", "epix1p0stmcza0xjkvv0vnjlk0ypr7xsunt4lxkhgcm", "Epix Post", "Decentralized social network"),
        this.renderDiscoverSite("site-epixmail", "epix1pvta40a8d944w3npr9ztqrfh3wec53hh2je4fa", "Epix Mail", "Decentralized encrypted mailing"),
        this.renderDiscoverSite("site-epixsites", "epix1searchd8hcnyfacvklmszzxwx9ptnf5rde04xf", "Epix Sites", "Decentralized site discovery"),
        this.renderDiscoverSite("site-epixwiki", "epix1wkkpkx4ldeuh30e3wnz25ft70j9rj9ns77plwa", "Epix Wiki", "Decentralized wiki")
      ]),
      h("div.utility-section", [
        h("div.utility-header", {onclick: this.onToggleUtility}, [
          h("span.utility-arrow", {classes: {expanded: utilityExpanded}}, "\u25B6"),
          h("span", _("EpixNet Utility Sites"))
        ]),
        utilityExpanded ? h("div.utility-sites", [
          this.renderDiscoverSite("site-xid", "epix1xauthduuyn63k6kj54jzgp4l8nnjlhrsyaku8c", "xID", "Decentralized identity & DNS"),
          this.renderDiscoverSite("site-vrfdebugger", "epix1k2332529z7kvtneswpure2ewakzrynm6uakrtu", "VRF Debugger", "Decentralized VRF beacon debugger")
        ]) : null
      ])
    ]);
  }

  render() {
    var feed_type, ref, ref1;
    if (this.need_update) {
      RateLimitCb(5000, this.update);
      this.need_update = false;
    }
    if (this.feeds && Page.settings.date_feed_visit < ((ref = this.feeds[0]) != null ? ref.date_added : void 0)) {
      this.saveFeedVisit(this.feeds[0].date_added);
    }
    if (this.feeds && Page.site_list.loaded && document.body.className !== "loaded" && !this.updating) {
      if (document.body.scrollTop > 500) {
        setTimeout((() => {
          return document.body.classList.add("loaded");
        }), 2000);
      } else {
        document.body.classList.add("loaded");
      }
    }
    var has_feeds = this.feeds && this.feeds.length > 0;
    var active_filter = this.filter;
    if (!has_feeds && active_filter !== "discover") {
      active_filter = "discover";
    }
    return h("div#FeedList.FeedContainer", {
      classes: {
        faded: Page.mute_list.visible
      }
    }, Page.mute_list.updated ? this.renderNotifications() : void 0, this.feeds === null || !Page.site_list.loaded ? h("div.loading") : [
      h("div.feeds-filters", has_feeds ? [
        h("a.feeds-filter", {
          href: "#all",
          classes: {
            active: active_filter === null
          },
          onclick: this.handleFilterClick
        }, _("All")), (() => {
          var results;
          results = [];
          for (feed_type in this.feed_types) {
            results.push(h("a.feeds-filter", {
              key: feed_type,
              href: "#" + feed_type,
              classes: {
                active: active_filter === feed_type
              },
              onclick: this.handleFilterClick
            }, feed_type));
          }
          return results;
        })(),
        h("a.feeds-filter", {
          href: "#discover",
          classes: {
            active: active_filter === "discover"
          },
          onclick: this.handleFilterClick
        }, _("Discover"))
      ] : [
        h("a.feeds-filter", {
          href: "#discover",
          classes: {
            active: true
          },
          onclick: this.handleFilterClick
        }, _("Discover"))
      ]),
      active_filter === "discover" ? this.renderWelcome() : [
        h("div.feeds-search", {
          classes: {
            "searching": this.searching,
            "searched": this.searched,
            "loading": this.loading || this.waiting
          }
        }, h("div.icon-magnifier"), this.loading ? h("div.loader", {
          enterAnimation: Animation.show,
          exitAnimation: Animation.hide
        }, h("div.arc")) : void 0, this.searched && !this.loading ? h("a.search-clear.nolink", {
          href: "#clear",
          onclick: this.handleSearchClear,
          enterAnimation: Animation.show,
          exitAnimation: Animation.hide
        }, "\u00D7") : void 0, ((ref1 = this.res) != null ? ref1.stats : void 0) ? h("a.search-info.nolink", {
          href: "#ShowStats",
          enterAnimation: Animation.show,
          exitAnimation: Animation.hide,
          onclick: this.handleSearchInfoClick
        }, (this.searching ? this.res.num + " results " : "") + ("from " + this.res.sites + " sites in " + (this.res.taken.toFixed(2)) + "s")) : void 0, h("input", {
          type: "text",
          placeholder: _("Search in connected sites"),
          value: this.searching,
          onkeyup: this.handleSearchKeyup,
          oninput: this.handleSearchInput,
          afterCreate: this.storeNodeSearch
        }), this.show_stats ? h("div.search-info-stats", {
          enterAnimation: Animation.slideDown,
          exitAnimation: Animation.slideUp
        }, [h("table", [h("tr", h("th", "Site"), h("th", "Feed"), h("th.taken", "Taken")), this.res.stats.map(this.renderSearchStat)])]) : void 0, this.renderSearchHelp(), this.feeds.length === 0 && this.searched ? h("div.search-noresult", {
          enterAnimation: Animation.show
        }, "No results for " + this.searched) : void 0),
        this.feeds.length > 0 ? h("div.FeedList." + this.getClass(), {
          classes: {
            loading: this.loading || this.waiting
          }
        }, [h("div.feeds-line"), this.feeds.slice(0, +this.limit + 1 || 9e9).map(this.renderFeed)]) : this.renderWelcome()
      ]
    ]);
  }

  onSiteInfo(site_info) {
    var ref, ref1, ref2;
    if (((ref = site_info.event) != null ? ref[0] : void 0) === "file_done" && ((ref1 = site_info.event) != null ? ref1[1].endsWith(".json") : void 0) && !((ref2 = site_info.event) != null ? ref2[1].endsWith("content.json") : void 0)) {
      if (!this.searching) {
        return this.need_update = true;
      }
    }
  }
}

Object.assign(FeedList.prototype, LogMixin);
window.FeedList = FeedList;

})();
