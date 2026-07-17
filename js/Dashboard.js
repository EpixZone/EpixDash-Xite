(function() {

class Dashboard {
  constructor() {
    this.render = this.render.bind(this);
    this.getWarnings = this.getWarnings.bind(this);
    this.handleWarningsClick = this.handleWarningsClick.bind(this);
    this.handleTrackersClick = this.handleTrackersClick.bind(this);
    this.handleNewversionClick = this.handleNewversionClick.bind(this);
    this.handleLogoutClick = this.handleLogoutClick.bind(this);
    this.handleMultiuserClick = this.handleMultiuserClick.bind(this);
    this.handlePortRecheckClick = this.handlePortRecheckClick.bind(this);
    this.handleNetworkClick = this.handleNetworkClick.bind(this);
    this.handleDisableAlwaysTorClick = this.handleDisableAlwaysTorClick.bind(this);
    this.handleEnableAlwaysTorClick = this.handleEnableAlwaysTorClick.bind(this);
    this.menu_newversion = new Menu();
    this.menu_network = new Menu();
    this.menu_trackers = new Menu();
    this.menu_multiuser = new Menu();
    this.menu_warnings = new Menu();
    this.port_checking = false;
    this.has_web_gl = null;
    Page.cmd('wrapperPermissionAdd', 'ADMIN', () => {
      Page.reloadServerInfo();
      Page.reloadSiteInfo();
      if (Page.site_list) {
        Page.site_list.update();
      }
    });
  }

  isTorAlways() {
    return Page.server_info.fileserver_ip === "127.0.0.1";
  }

  hasWebGl() {
    if (this.has_web_gl === null) {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext("webgl");
      this.has_web_gl = ctx ? true : false;
      this.log("Webgl:", this.has_web_gl);
    }
    return this.has_web_gl;
  }

  tagTrackersTitle() {
    var key, num_ok, num_total, stats, status_db, title, val;
    if (Page.server_info.offline) {
      return h("span.status.status-warning", "n/a");
    }
    num_ok = 0;
    num_total = 0;
    status_db = {
      announcing: [],
      error: [],
      announced: []
    };
    if (Page.announcer_stats) {
      stats = Page.announcer_stats;
    } else {
      stats = Page.announcer_info;
    }
    for (key in stats) {
      val = stats[key];
      if (val.status === "announced") {
        num_ok += 1;
      }
      num_total += 1;
    }
    title = num_ok + "/" + num_total;
    if (num_total === 0) {
      return h("span.status", "Waiting...");
    } else if (num_ok > num_total / 2) {
      return h("span.status.status-ok", title);
    } else if (num_ok > 0) {
      return h("span.status.status-warning", title);
    } else {
      return h("span.status.status-error", title);
    }
  }

  handleEnableAlwaysTorClick() {
    return Page.cmd("configSet", ["tor", "always"], (res) => {
      Page.cmd("wrapperNotification", ["done", "Tor always mode enabled, please restart your EpixNet to make it work.<br>For your privacy switch to Tor browser and start a new profile by renaming the data directory."]);
      return Page.cmd("wrapperConfirm", ["Restart EpixNet client?", "Restart now"], (res) => {
        if (res) {
          return Page.cmd("serverShutdown", {
            restart: true
          });
        }
      });
    });
  }

  handleDisableAlwaysTorClick() {
    return Page.cmd("configSet", ["tor", null], (res) => {
      return Page.cmd("wrapperNotification", ["done", "Tor always mode disabled, please restart your EpixNet."]);
    });
  }

  // The consolidated Network popup: one row each for Clearnet, Tor and I2P,
  // driven by server_info.network_status (per-network inbound reachability).
  networkStatus() {
    return Page.server_info.network_status || {};
  }

  netRow(name, badge, detail) {
    var row = [h("span.net-name", name), badge];
    if (detail) {
      row.push(h("span.net-detail", detail));
    }
    return row;
  }

  clearnetBadge(c) {
    if (!c || !c.enabled) {
      return h("span.status.status-disabled", _("Disabled"));
    }
    if (c.reachable) {
      return h("span.status.status-ok", _("Open"));
    }
    return h("span.status.status-warning", _("Closed"));
  }

  clearnetDetail(c) {
    if (!c || !c.enabled) {
      return null;
    }
    return (c.ip ? c.ip : "") + ":" + c.port;
  }

  torBadge(t) {
    if (!t || !t.enabled) {
      return h("span.status.status-disabled", _("Off"));
    }
    if (t.reachable) {
      return h("span.status.status-ok", t.always ? _("Always") : _("Online"));
    }
    return h("span.status.status-warning", t.status || _("Connecting"));
  }

  i2pBadge(p) {
    if (!p || !p.enabled) {
      return h("span.status.status-disabled", _("Off"));
    }
    if (p.reachable) {
      return h("span.status.status-ok", _("Online"));
    }
    return h("span.status.status-warning", p.phase || _("Connecting"));
  }

  handleNetworkClick() {
    var ns = this.networkStatus();
    var faq = Text.getSiteUrl("epix1readmehqfdxy4pzx7u72wwaerc4psx0gt6fety") + "faq/#do-i-need-to-have-a-port-opened";
    this.menu_network.items = [];
    if (Page.server_info.offline) {
      this.menu_network.items.push(["Offline mode, network communication disabled.", "/Config"]);
      this.menu_network.toggle();
      return false;
    }
    if (ns.reachable) {
      this.menu_network.items.push([_("Peers can reach this node."), faq]);
    } else {
      this.menu_network.items.push([_("Peers can't reach this node directly. It still works, but opening a port or enabling Tor/I2P lets peers connect to you."), faq]);
    }
    this.menu_network.items.push(["---"]);
    this.menu_network.items.push([this.netRow(_("Clearnet"), this.clearnetBadge(ns.clearnet), this.clearnetDetail(ns.clearnet)), null]);
    this.menu_network.items.push([this.netRow(_("Tor"), this.torBadge(ns.tor), ns.tor ? ns.tor.address : null), null]);
    this.menu_network.items.push([this.netRow(_("I2P"), this.i2pBadge(ns.i2p), ns.i2p ? ns.i2p.address : null), null]);
    this.menu_network.items.push(["---"]);
    // The Tor-always toggle changes config and restarts the node - a read-only
    // gateway refuses both, so only offer it off a gateway.
    if (!Page.server_info.ui_restrict) {
      if (this.isTorAlways()) {
        this.menu_network.items.push([_("Disable always-Tor mode"), this.handleDisableAlwaysTorClick]);
      } else if (ns.tor && ns.tor.enabled) {
        this.menu_network.items.push([_("Route every connection through Tor (slower)"), this.handleEnableAlwaysTorClick]);
      }
    }
    this.menu_network.items.push([_("Re-check reachability"), this.handlePortRecheckClick]);
    this.menu_network.toggle();
    return false;
  }

  // The pill value: green when peers can reach us over any network.
  networkPill() {
    if (Page.server_info.offline) {
      return h("span.status.status-warning", _("Offline mode"));
    }
    if (this.port_checking) {
      return h("span.status", _("Checking"));
    }
    var ns = Page.server_info.network_status;
    if (!ns) {
      return h("span.status", _("Checking"));
    }
    if (ns.reachable) {
      return h("span.status.status-ok", _("Reachable"));
    }
    return h("span.status.status-warning", _("Limited"));
  }

  handlePortRecheckClick() {
    this.port_checking = true;
    return Page.cmd("serverPortcheck", [], (res) => {
      this.port_checking = false;
      return Page.reloadServerInfo();
    });
  }

  handleMultiuserClick() {
    this.menu_multiuser.items = [];
    this.menu_multiuser.items.push([
      "Show your masterseed", () => {
        return Page.cmd("userShowMasterSeed");
      }
    ]);
    if (Page.server_info.multiuser_admin) {
      this.menu_multiuser.items.push([
        "Select user", () => {
          return Page.cmd("userSelectForm");
        }
      ]);
    }
    this.menu_multiuser.items.push([
      "Logout", () => {
        return Page.cmd("userLogout");
      }
    ]);
    this.menu_multiuser.toggle();
    return false;
  }

  handleLogoutClick() {
    return Page.cmd("uiLogout");
  }

  handleNewversionClick() {
    this.menu_newversion.items = [];
    this.menu_newversion.items.push([
      "Update EpixNet", () => {
        return Page.updateEpixNet();
      }
    ]);
    this.menu_newversion.items.push(["Details of the update", Text.getSiteUrl("Blog.EpixNetwork.bit")]);
    this.menu_newversion.toggle();
    return false;
  }

  handleTrackersClick() {
    var request_taken, stat, stats, status, success_percent, title, title_text, tracker_name, tracker_url, tracker_display;
    if (Page.announcer_stats) {
      stats = Page.announcer_stats;
      Page.reloadAnnouncerStats();
    } else {
      stats = Page.announcer_info;
    }
    this.menu_trackers.items = [];
    for (tracker_url in stats) {
      stat = stats[tracker_url];
      tracker_name = tracker_url.replace(/(.*:\/\/.*?)[\/#].*/, "$1").replace(/:[0-9]+$/, "");

      // Create a truncated display name for long URLs
      tracker_display = tracker_name;
      if (tracker_name.length > 35) {
        tracker_display = tracker_name.substring(0, 32) + "...";
      }

      success_percent = parseInt((stat.num_success / stat.num_request) * 100);
      if (isNaN(success_percent)) {
        success_percent = "?";
      }
      status = stat.status.capitalize();
      if (status === "Announced" && stat.time_request && stat.time_status) {
        request_taken = stat.time_status - stat.time_request;
        status += " in " + (request_taken.toFixed(2)) + "s";
      }
      title_text = "Full URL: " + tracker_name + "\nRequests: " + stat.num_request;
      if (stat.last_error) {
        title_text += "\nLast error: " + stat.last_error + " (" + (Time.since(stat.time_last_error)) + ")";
      }

      title = h("div.tracker-item", {
        title: title_text
      }, [
        h("div.tracker-name", tracker_display),
        h("div.tracker-status", status + " (" + success_percent + "% success)")
      ]);

      this.menu_trackers.items.push([title, null]);
    }
    this.menu_trackers.toggle();
    return false;
  }

  handleWarningsClick() {
    var i, len, warning, warnings;
    warnings = this.getWarnings();
    this.menu_warnings.items = [];
    for (i = 0, len = warnings.length; i < len; i++) {
      warning = warnings[i];
      this.menu_warnings.items.push([h("b.status-error", warning.title), warning.href]);
      if (warning.descr) {
        this.menu_warnings.items.push([warning.descr, warning.href]);
      }
      this.menu_warnings.items.push(["---"]);
    }
    this.menu_warnings.items.push([
      "Restart EpixNet client", () => {
        return Page.cmd("serverShutdown", {
          restart: true
        });
      }
    ]);
    this.menu_warnings.toggle();
    return false;
  }

  getWarnings() {
    var warnings;
    warnings = [];
    if (navigator.userAgent.match(/(\b(MS)?IE\s+|Trident\/7.0)/)) {
      warnings.push({
        title: "Unsupported browser",
        href: "http://browsehappy.com/",
        descr: "Internet Explorer is not fully supported browser by EpixNet, please consider switching to Firefox, Chromium or other compatible browser"
      });
    }
    // The Epix Browser routes clearnet through Tor when the extension's
    // "Clearnet traffic over Tor" box is checked, so it's already safe - skip
    // the Tor-browser nudge in that case.
    var browser_safe = Page.server_info.epix_browser && Page.server_info.browser_tor_clearnet;
    if (this.isTorAlways() && !browser_safe && (!navigator.userAgent.match(/(Firefox)/) || (navigator.maxTouchPoints != null) || (navigator.serviceWorker != null))) {
      warnings.push({
        title: "Your browser is not safe",
        href: Text.getSiteUrl("epix1readmehqfdxy4pzx7u72wwaerc4psx0gt6fety") + "faq/#how-to-use-epixnet-in-tor-browser",
        descr: "To protect your anonymity you should use EpixNet in the Tor or Epix Browser."
      });
    }
    if (Page.server_info.lib_verify_best === "btctools") {
      warnings.push({
        title: "Slow verification library",
        href: "#",
        descr: "To significantly reduce CPU usage install libsecp256k1 or OpenSSL"
      });
    }
    if (Math.abs(Page.server_info.timecorrection) > 30) {
      warnings.push({
        title: ["Time out of sync: ", 0 - Page.server_info.timecorrection.toFixed(2), "s"],
        href: "https://time.is",
        descr: "Looks like your system time is out of sync. Other users may not see your posted content and other problems could happen."
      });
    }
    if (Page.server_errors.length > 2) {
      warnings = warnings.concat(Page.server_errors.slice(-2).reverse());
      warnings.push({
        title: (Page.server_errors.length - 2) + " more errors...",
        href: "#EpixNet:Console"
      });
    } else {
      warnings = warnings.concat(Page.server_errors);
    }
    return warnings;
  }

  render() {
    var warnings;
    if (Page.server_info) {
      warnings = this.getWarnings();
      return h("div#Dashboard", warnings.length ? h("a.warnings.dashboard-item", {
        href: "#Warnings",
        onmousedown: this.handleWarningsClick,
        onclick: Page.returnFalse
      }, _("Warnings") + ": " + warnings.length) : void 0, this.menu_warnings.render(".menu-warnings"), parseFloat(Page.server_info.version.replace(/\./g, "0")) < parseFloat(Page.latest_version.replace(/\./g, "0")) ? h("a.newversion.dashboard-item", {
        href: "#Update",
        onmousedown: this.handleNewversionClick,
        onclick: Page.returnFalse
      }, "New EpixNet version: " + Page.latest_version) : Page.server_info.rev < Page.latest_rev ? h("a.newversion.dashboard-item", {
        href: "#Update",
        onmousedown: this.handleNewversionClick,
        onclick: Page.returnFalse
      }, "New important update: rev" + Page.latest_rev) : void 0, this.menu_newversion.render(".menu-newversion"), Page.server_info.multiuser ? h("a.port.dashboard-item.multiuser", {
        href: "#Multiuser",
        onmousedown: this.handleMultiuserClick,
        onclick: Page.returnFalse
      }, [
        h("span", _("User") + ": "), h("span.status", {
          style: "color: " + (Text.toColor(Page.server_info.master_address))
        }, Page.server_info.master_address.slice(0, 5) + ".." + Page.server_info.master_address.slice(-4))
      ]) : void 0, Page.server_info.multiuser ? this.menu_multiuser.render(".menu-multiuser") : void 0, Page.server_info.plugins && Page.server_info.plugins.indexOf("UiPassword") >= 0 ? h("a.port.dashboard-item.logout", {
        href: "#Logout",
        onmousedown: this.handleLogoutClick,
        onclick: Page.returnFalse
      }, [h("span", _("Logout"))]) : void 0, h("span.dash-net", [this.menu_network.render(".menu-network"), h("a.dashboard-item.network", {
        href: "#Network",
        classes: {
          bounce: this.port_checking
        },
        onmousedown: this.handleNetworkClick,
        onclick: Page.returnFalse
      }, [h("span", _("Network") + ": "), this.networkPill()])]), Page.announcer_info || Page.announcer_stats ? h("a.dashboard-item.trackers", {
        href: "#Trackers",
        onmousedown: this.handleTrackersClick,
        onclick: Page.returnFalse
      }, [h("span", _("Trackers") + ": "), this.tagTrackersTitle()]) : void 0, this.menu_trackers.render(".menu-trackers"));
    } else {
      return h("div#Dashboard");
    }
  }
}

Object.assign(Dashboard.prototype, LogMixin);
window.Dashboard = Dashboard;

})();
