(function() {

var EpixFrame = window.EpixFrame;

window.h = maquette.h;

class EpixDash extends EpixFrame {
  constructor() {
    super();
    this.reloadAnnouncerStats = this.reloadAnnouncerStats.bind(this);
    this.reloadAnnouncerInfo = this.reloadAnnouncerInfo.bind(this);
    this.reloadServerErrors = this.reloadServerErrors.bind(this);
    this.reloadServerInfo = this.reloadServerInfo.bind(this);
    this.reloadSiteInfo = this.reloadSiteInfo.bind(this);
    this.onOpenWebsocket = this.onOpenWebsocket.bind(this);
    this.handleLinkClick = this.handleLinkClick.bind(this);
  }

  // A ws command answers an array of rows, or an object carrying an error
  // (permission denied, db not ready). Every list view goes through here so
  // one failing command shows an empty list instead of crashing the whole
  // dashboard render to a white page partway through.
  rows(res) {
    if (Array.isArray(res)) return res;
    if (res && res.error) this.log("command failed:", res.error);
    return [];
  }

  init() {
    this.history_state = {};
    this.params = {};
    this.site_info = null;
    this.server_info = null;
    this.announcer_info = null;
    this.announcer_stats = null;
    this.address = null;
    this.on_site_info = new Deferred();
    this.on_server_info = new Deferred();
    this.on_settings = new Deferred();
    this.on_loaded = new Deferred();
    this.settings = null;
    this.server_errors = [];
    this.latest_version = "0.0.1";
    this.latest_rev = 8192;
    // Read the mode out of the boot url right away: the body id drives which
    // pane is visible, so deep-linking ?Files used to paint the xites pane
    // first and fade it out once routing caught up.
    var boot_url = base.href.indexOf("?") === -1 ? "" : base.href.replace(/.*?\?/, "");
    var boot_mode = Text.parseQuery(boot_url).url;
    this.mode = (boot_mode === "Files" || boot_mode === "Stats") ? boot_mode : "Sites";
    this.mode_attached = false;
    this.seg_feed = false;
    return document.body.id = "Body" + this.mode;
  }

  // Which pane the Sites-mode segmented control shows on single-column
  // widths (body.seg-feed gates it in css; desktop shows both panes).
  setSegFeed(on) {
    this.seg_feed = !!on;
    document.body.classList.toggle("seg-feed", this.seg_feed);
    return this.projector.scheduleRender();
  }

  addRenderer(node, renderer) {
    this.projector.replace(node, renderer);
    return this.renderers.push(renderer);
  }

  detachRenderers() {
    var i, len, ref, renderer;
    ref = this.renderers;
    for (i = 0, len = ref.length; i < len; i++) {
      renderer = ref[i];
      this.projector.detach(renderer);
    }
    return this.renderers = [];
  }

  setProjectorMode(mode) {
    this.log("setProjectorMode", mode);
    if (mode !== "Files" && mode !== "Stats") {
      mode = "Sites";
    }
    // The first call comes from boot routing, where this.mode already reads
    // "Sites": compare against the normalized value so it is recognised as
    // the initial attach and skips the crossfade below (the page used to
    // render, fade out and fade back in on every load).
    if (this.mode === mode && this.mode_attached) {
      return;
    }
    // The health screen belongs to the mode it was opened from; leaving the
    // mode closes it (its back label names the current mode).
    if (this.dashboard && this.dashboard.health_open) {
      this.dashboard.closeHealth();
    }
    this.detachRenderers();
    if (mode === "Files") {
      this.addRenderer($("#PageFiles"), this.page_files.render);
      this.page_files.need_update = true;
    } else if (mode === "Stats") {
      this.addRenderer($("#NetworkStats"), this.page_stats.render);
      this.page_stats.need_update = true;
    } else {
      mode = "Sites";
      this.addRenderer($("#FeedList"), this.feed_list.render);
      this.addRenderer($("#SiteList"), this.site_list.render);
    }
    this.mode = mode;
    // First attach: set the body id straight away and skip the crossfade, so
    // the page just appears. The crossfade only runs on real mode switches.
    if (!this.mode_attached) {
      this.mode_attached = true;
      document.body.id = "Body" + mode;
      return;
    }
    // Real mode switch: swap the body id right away (60ms lets the new pane
    // render first) and let the incoming pane transition from its hidden
    // resting state (opacity 0, 30px down) to visible on its own. The old
    // body.changing hold blanked every pane for 800ms, which read as a
    // one-second empty page between modes.
    return setTimeout(() => {
      document.body.id = "Body" + mode;
    }, 60);
  }

  createProjector() {
    var url;
    this.projector = maquette.createProjector();
    this.projectors = {};
    this.renderers = [];
    this.site_list = new SiteList();
    this.feed_list = new FeedList();
    this.page_files = new PageFiles();
    this.page_stats = new NetworkStats();
    this.head = new Head();
    this.dashboard = new Dashboard();
    this.mute_list = new MuteList();
    this.trigger = new Trigger();
    if (base.href.indexOf("?") === -1) {
      url = "";
    } else {
      url = base.href.replace(/.*?\?/, "");
    }
    this.history_state["url"] = url;
    this.loadSettings();
    this.on_site_info.then(() => {
      this.projector.replace($("#Head"), this.head.render);
      this.projector.replace($("#Dashboard"), this.dashboard.render);
      this.projector.merge($("#Trigger"), this.trigger.render);
      this.route(url);
      return this.setProjectorMode(this.mode);
    });
    return setInterval(function() {
      return Page.projector.scheduleRender();
    }, 60 * 1000);
  }

  route(query) {
    this.params = Text.parseQuery(query);
    this.log("Route", this.params);
    this.setProjectorMode(this.params.url);
    if (this.mode === "Stats") {
      this.page_stats.need_update = true;
    } else if (this.mode === "Files") {
      this.page_files.need_update = true;
    } else if ((this.params.url || "").toLowerCase() === "discover") {
      this.feed_list.filter = "discover";
      this.setSegFeed(true);
    }
    return this.projector.scheduleRender();
  }

  createUrl(key, val) {
    var params, vals;
    params = JSON.parse(JSON.stringify(this.params));
    if (typeof key === "Object") {
      vals = key;
      for (key in keys) {
        val = keys[key];
        params[key] = val;
      }
    } else {
      params[key] = val;
    }
    return "?" + Text.encodeQuery(params);
  }

  setUrl(url, mode) {
    if (mode == null) {
      mode = "replace";
    }
    url = url.replace(/.*?\?/, "");
    this.log("setUrl", this.history_state["url"], "->", url);
    if (this.history_state["url"] === url) {
      return false;
    }
    this.history_state["url"] = url;
    if (mode === "replace") {
      this.cmd("wrapperReplaceState", [this.history_state, "", url]);
    } else {
      this.cmd("wrapperPushState", [this.history_state, "", url]);
    }
    this.route(url);
    return false;
  }

  handleLinkClick(e) {
    var target_params, target_mode;
    if (e.which === 2) {
      return true;
    } else {
      this.log("save scrollTop", window.pageYOffset);
      this.history_state["scrollTop"] = window.pageYOffset;
      this.cmd("wrapperReplaceState", [this.history_state, null]);
      target_params = Text.parseQuery((e.currentTarget.search || "").replace(/.*?\?/, ""));
      target_mode = target_params.url === "Files" || target_params.url === "Stats" ? target_params.url : "Sites";
      // Scroll to top only when the link changes PAGE. Param-only navigation
      // within Stats/Files (the day-strip drill, 1D/1W) keeps the scroll
      // position - jumping to the top made the day buttons unusable.
      if (target_mode !== this.mode || (this.mode !== "Stats" && this.mode !== "Files")) {
        window.scroll(window.pageXOffset, 0);
        this.history_state["scrollTop"] = 0;
      }
      this.setUrl(e.currentTarget.search);
      return false;
    }
  }

  loadSettings() {
    return this.on_site_info.then(() => {
      return this.cmd("userGetSettings", [], (res) => {
        var base1, base2, base3, base4, base5;
        if (!res || res.error) {
          return this.loadLocalStorage();
        } else {
          this.settings = res;
          if ((base1 = this.settings).sites_orderby == null) {
            base1.sites_orderby = "modified";
          }
          if ((base2 = this.settings).favorite_sites == null) {
            base2.favorite_sites = {};
          }
          if ((base3 = this.settings).siteblocks_ignore == null) {
            base3.siteblocks_ignore = {};
          }
          if ((base4 = this.settings).date_feed_visit == null) {
            base4.date_feed_visit = 1;
          }
          if ((base5 = this.settings).merged_expanded == null) {
            base5.merged_expanded = {};
          }
          this.feed_list.date_feed_visit = this.settings.date_feed_visit;
          return this.on_settings.resolve(this.settings);
        }
      });
    });
  }

  loadLocalStorage() {
    return this.cmd("wrapperGetLocalStorage", [], (settings) => {
      var base1, base2, base3;
      this.settings = settings;
      this.log("Loaded localstorage");
      if (this.settings == null) {
        this.settings = {};
      }
      if ((base1 = this.settings).sites_orderby == null) {
        base1.sites_orderby = "modified";
      }
      if ((base2 = this.settings).favorite_sites == null) {
        base2.favorite_sites = {};
      }
      if ((base3 = this.settings).merged_expanded == null) {
        base3.merged_expanded = {};
      }
      return this.on_settings.resolve(this.settings);
    });
  }

  saveSettings(cb) {
    if (this.settings) {
      return this.cmd("userSetSettings", [this.settings], (res) => {
        if (cb) {
          return cb(res);
        }
      });
    }
  }

  onOpenWebsocket(e) {
    // Subscribe to the node's server and announcer pushes. Without these the
    // health chip only ever showed the state it read at page load: the node
    // pushes setServerInfo on serverChanged (port check, tor/i2p phase, new
    // errors) and setAnnouncerInfo on announcerChanged (tracker announces),
    // and both were dropped because the dashboard had joined siteChanged only.
    // Joined here rather than at construction so a reconnect re-subscribes.
    this.cmd("channelJoin", {"channels": ["serverChanged", "announcerChanged"]});
    this.reloadServerInfo();
    this.reloadServerErrors();
    // Fetch announcer stats right away, in parallel with the others: the
    // Trackers pill waits on them, and the node answers from a cached map,
    // needing nothing from siteInfo or serverInfo. This used to be fetched
    // from setSiteInfo only when server_info was already set - a race that
    // left the pill hidden until the node happened to push another siteInfo
    // event, which in a quiet session can take minutes or never come. (The
    // pill still cannot render early: the Dashboard render is gated on
    // server_info, and setSiteInfo keeps refreshing the stats on pushes.)
    this.reloadAnnouncerStats();
    return this.reloadSiteInfo();
  }

  reloadSiteInfo() {
    return this.cmd("siteInfo", {}, (site_info) => {
      this.address = site_info.address;
      return this.setSiteInfo(site_info);
    });
  }

  reloadServerInfo(cb) {
    return this.cmd("serverInfo", {}, (server_info) => {
      this.setServerInfo(server_info);
      return typeof cb === "function" ? cb(server_info) : void 0;
    });
  }

  reloadServerErrors(cb) {
    return this.cmd("serverErrors", {}, (server_errors) => {
      this.setServerErrors(server_errors);
      return typeof cb === "function" ? cb(server_errors) : void 0;
    });
  }

  reloadAnnouncerInfo(cb) {
    return this.cmd("announcerInfo", {}, (announcer_info) => {
      this.setAnnouncerInfo(announcer_info);
      return typeof cb === "function" ? cb() : void 0;
    });
  }

  reloadAnnouncerStats(cb) {
    return this.cmd("announcerStats", {}, (announcer_stats) => {
      this.announcer_stats = announcer_stats;
      Page.projector.scheduleRender();
      return typeof cb === "function" ? cb() : void 0;
    });
  }

  onRequest(cmd, message) {
    var params = message.params;
    if (cmd === "setSiteInfo") {
      return this.setSiteInfo(params);
    } else if (cmd === "setServerInfo") {
      return this.setServerInfo(params);
    } else if (cmd === "setAnnouncerInfo") {
      return this.setAnnouncerInfo(params);
    } else if (cmd === "setServerErrors") {
      return this.setServerErrors(params);
    } else {
      return this.log("Unknown command", params);
    }
  }

  setSiteInfo(site_info) {
    if (site_info.address === this.address) {
      this.site_info = site_info;
      if (this.server_info) {
        this.reloadAnnouncerStats();
      }
    }
    this.site_list.onSiteInfo(site_info);
    this.feed_list.onSiteInfo(site_info);
    this.page_files.onSiteInfo(site_info);
    return this.on_site_info.resolve();
  }

  setServerInfo(server_info) {
    var ref;
    this.server_info = server_info;
    if (server_info.language) {
      loadLanguage(server_info.language);
    } else if (!this._lang_detected) {
      this._lang_detected = true;
      var supported = ["ar", "da", "de", "en", "es", "fa", "fr", "hu", "it", "nl", "pl", "pt", "pt-br", "ru", "sk", "tr", "uk", "zh", "zh-tw", "jp", "sl", "kr"];
      var browser_lang = (navigator.language || "").toLowerCase();
      var detected = null;
      if (supported.indexOf(browser_lang) >= 0) {
        detected = browser_lang;
      } else {
        var short_lang = browser_lang.split("-")[0];
        if (short_lang === "ja") short_lang = "jp";
        if (supported.indexOf(short_lang) >= 0) {
          detected = short_lang;
        }
      }
      if (detected && detected !== "en") {
        server_info.language = detected;
        loadLanguage(detected);
        this.cmd("configSet", ["language", detected]);
      }
    }
    this.projector.scheduleRender();
    if (((ref = server_info.event) != null ? ref[0] : void 0) === "log_event") {
      RateLimit(1000, () => {
        return this.reloadServerErrors();
      });
    }
    return this.on_server_info.resolve();
  }

  setServerErrors(server_errors) {
    var date_added, i, len, level, message, ref;
    this.server_errors = [];
    for (i = 0, len = server_errors.length; i < len; i++) {
      ref = server_errors[i], date_added = ref[0], level = ref[1], message = ref[2];
      this.server_errors.push({
        title: [Time.since(date_added), " - ", level],
        descr: message,
        href: null
      });
    }
    return this.projector.scheduleRender();
  }

  setAnnouncerInfo(announcer_info) {
    this.announcer_info = announcer_info.stats;
    // The pushed stats come from the same source as the announcerStats
    // command, and the tracker readouts prefer announcer_stats - so keep it in
    // step or the pushes leave the counts on whatever the last poll returned.
    // Empty means the node blanked them (non-admin xite); keep what we have.
    if (announcer_info.stats && Object.keys(announcer_info.stats).length) {
      this.announcer_stats = announcer_info.stats;
    }
    return this.projector.scheduleRender();
  }

  returnFalse() {
    return false;
  }

  updateEpixNet() {
    Page.cmd("wrapperNotification", ["info", "please update epixnet-conservancy via git", 8000]);
  }
}

window.Page = new EpixDash();

window.Page.createProjector();

})();
