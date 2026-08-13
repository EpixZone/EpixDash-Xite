(function() {

// Trackers answering that make the node healthy whatever the share says.
// Peer discovery needs a working handful, not a good ratio, and public
// tracker lists carry entries that have been dead for years: without this a
// node with 8 of 17 answering reads Degraded forever over a list it does not
// control. Below the floor the percentage bands decide.
var HEALTHY_TRACKER_FLOOR = 5;

class Dashboard {
  constructor() {
    this.render = this.render.bind(this);
    this.getWarnings = this.getWarnings.bind(this);
    this.handleNewversionClick = this.handleNewversionClick.bind(this);
    this.handleLogoutClick = this.handleLogoutClick.bind(this);
    this.handleMultiuserClick = this.handleMultiuserClick.bind(this);
    this.handlePortRecheckClick = this.handlePortRecheckClick.bind(this);
    this.handleDisableAlwaysTorClick = this.handleDisableAlwaysTorClick.bind(this);
    this.handleEnableAlwaysTorClick = this.handleEnableAlwaysTorClick.bind(this);
    this.handleStripClick = this.handleStripClick.bind(this);
    this.handleBackClick = this.handleBackClick.bind(this);
    this.handleTorToggleClick = this.handleTorToggleClick.bind(this);
    this.openHealth = this.openHealth.bind(this);
    this.handleRestartClick = this.handleRestartClick.bind(this);
    this.closeHealth = this.closeHealth.bind(this);
    this.menu_newversion = new Menu();
    this.menu_multiuser = new Menu();
    this.port_checking = false;
    this.health_open = false;
    this.has_web_gl = null;
    // The health drawer closes on Escape, like the hamburger panel does.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.health_open) {
        this.closeHealth();
      }
    });
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

  networkStatus() {
    return Page.server_info.network_status || {};
  }

  // Inline stroke icons (mockup set). Keyed by name so a state change swaps
  // the whole svg instead of maquette trying to morph mismatched children.
  icon(name, size) {
    var shapes = {
      check: [h("circle", {cx: "12", cy: "12", r: "9"}), h("path", {d: "M8.2 12.4l2.6 2.6 5-5.4"})],
      warn: [h("path", {d: "M12 3.6 21.4 20H2.6L12 3.6Z"}), h("path", {d: "M12 10v4"}), h("path", {d: "M12 16.8h.01"})],
      err: [h("circle", {cx: "12", cy: "12", r: "9"}), h("path", {d: "M9 9l6 6M15 9l-6 6"})],
      wifi: [h("path", {d: "M2.5 9.7a14.2 14.2 0 0 1 19 0"}), h("path", {d: "M5.6 13.2a9.6 9.6 0 0 1 12.8 0"}), h("path", {d: "M8.8 16.6a5.1 5.1 0 0 1 6.4 0"}), h("path", {d: "M12 19.8h.01"})],
      loader: [h("path", {d: "M12 3a9 9 0 0 1 9 9"}), h("circle", {cx: "12", cy: "12", r: "9", opacity: ".25"})],
      off: [h("circle", {cx: "12", cy: "12", r: "9"}), h("path", {d: "M8 12h8"})],
      refresh: [h("path", {d: "M20 12a8 8 0 1 1-2.4-5.7M20 3.8v4.4h-4.4"})],
      chevR: [h("path", {d: "M9 6l6 6-6 6"})],
      chevL: [h("path", {d: "M15 6l-6 6 6 6"})]
    };
    return h("svg.ic", {
      key: name,
      width: "" + size,
      height: "" + size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.8",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true"
    }, shapes[name]);
  }

  inkClasses(ink) {
    return {
      "ok-ink": ink === "ok",
      "warn-ink": ink === "warn",
      "bad-ink": ink === "bad"
    };
  }

  // announcer_stats is preferred, announcer_info is the fallback (same rule
  // the old Trackers pill used).
  trackerStats() {
    if (Page.announcer_stats) {
      return Page.announcer_stats;
    } else {
      return Page.announcer_info;
    }
  }

  trackerCounts() {
    var key, val, stats, num_ok, num_total;
    num_ok = 0;
    num_total = 0;
    stats = this.trackerStats();
    for (key in stats) {
      val = stats[key];
      if (val.status === "announced") {
        num_ok += 1;
      }
      num_total += 1;
    }
    return {ok: num_ok, total: num_total};
  }

  // Worst-of ranking: offline > checking > unreachable > tracker trouble > ok.
  healthState() {
    var counts, percent, answering;
    if (Page.server_info.offline) {
      return {ink: "warn", icon: "warn", label: _("Offline mode"), cause: _("network disabled")};
    }
    if (this.port_checking || !Page.server_info.network_status) {
      return {ink: "", icon: "loader", label: _("Checking…"), cause: null};
    }
    if (!Page.server_info.network_status.reachable) {
      return {ink: "warn", icon: "warn", label: _("Limited"), cause: _("peers can't reach you")};
    }
    counts = this.trackerCounts();
    if (counts.total === 0) {
      return {ink: "", icon: "loader", label: _("Waiting for trackers…"), cause: null};
    }
    // The same bands the individual tracker rows use, applied to the share of
    // trackers answering: under 10% bad, under 75% degraded, the rest healthy.
    // Rounded before it is judged so the verdict agrees with the count the
    // chip and the card header both show. Enough trackers answering outright
    // is healthy whatever the share works out to - see HEALTHY_TRACKER_FLOOR.
    percent = Math.round((counts.ok / counts.total) * 100);
    if (counts.ok >= HEALTHY_TRACKER_FLOOR || percent >= 75) {
      return {ink: "ok", icon: "check", label: _("Healthy"), cause: null};
    }
    answering = counts.ok + _(" of ") + counts.total + _(" trackers answering");
    if (percent < 10) {
      return {ink: "bad", icon: "err", label: _("Bad"), cause: answering};
    }
    return {ink: "warn", icon: "warn", label: _("Degraded"), cause: answering};
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

  handleTorToggleClick() {
    if (this.isTorAlways()) {
      return this.handleDisableAlwaysTorClick();
    } else {
      return this.handleEnableAlwaysTorClick();
    }
  }

  handlePortRecheckClick() {
    if (this.port_checking) {
      return false;
    }
    this.port_checking = true;
    Page.projector.scheduleRender();
    return Page.cmd("serverPortcheck", [], (res) => {
      this.port_checking = false;
      return Page.reloadServerInfo();
    });
  }

  handleStripClick() {
    this.openHealth();
    return false;
  }

  handleBackClick() {
    this.closeHealth();
    return false;
  }

  openHealth() {
    if (window.visible_menu) {
      window.visible_menu.hide();
    }
    if (Page.site_list && Page.site_list.closeRowActions) {
      Page.site_list.closeRowActions();
    }
    this.health_open = true;
    // Live refresh on open, same as the old Trackers menu did.
    if (Page.announcer_stats) {
      Page.reloadAnnouncerStats();
    }
    Page.projector.scheduleRender();
  }

  closeHealth() {
    if (!this.health_open) {
      return;
    }
    this.health_open = false;
    Page.projector.scheduleRender();
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
    // Server errors ride in the same list but carry an error flag, so the
    // health screen can paint them red instead of warning amber.
    var errors = (Page.server_errors || []).map(function(e) {
      return Object.assign({error: true}, e);
    });
    if (errors.length > 2) {
      warnings = warnings.concat(errors.slice(-2).reverse());
      // Plain row (no link): the dashboard console this used to open is
      // gone; the full log lives in the wrapper sidebar's console.
      warnings.push({
        error: true,
        title: (errors.length - 2) + " more errors...",
        href: null
      });
    } else {
      warnings = warnings.concat(errors);
    }
    return warnings;
  }

  // "Tor ok, I2P connecting, 7/9 announced" at a glance. Clearnet lives in the
  // health screen only. Hidden entirely in offline mode.
  renderMiniSummary() {
    var ns, counts, parts, out, i;
    if (Page.server_info.offline) {
      return null;
    }
    ns = Page.server_info.network_status;
    parts = [];
    if (ns && ns.tor && ns.tor.enabled) {
      parts.push(h("span.sum-seg", {key: "tor"}, [
        h("span.sum-ic", {classes: this.inkClasses(ns.tor.reachable ? "ok" : "warn")}, [this.icon(ns.tor.reachable ? "check" : "loader", 13)]),
        h("span.sum-name", _("Tor"))
      ]));
    }
    if (ns && ns.i2p && ns.i2p.enabled) {
      parts.push(h("span.sum-seg", {key: "i2p"}, [
        h("span.sum-ic", {classes: this.inkClasses(ns.i2p.reachable ? "ok" : "warn")}, [this.icon(ns.i2p.reachable ? "check" : "loader", 13)]),
        h("span.sum-name", _("I2P"))
      ]));
    }
    if (Page.announcer_info || Page.announcer_stats) {
      counts = this.trackerCounts();
      parts.push(h("span.sum-seg.sum-trackers", {key: "trackers"}, counts.ok + "/" + counts.total));
    }
    if (!parts.length) {
      return null;
    }
    // "Tor . I2P . 7/9": middle-dot separators between the segments.
    out = [];
    for (i = 0; i < parts.length; i++) {
      if (i > 0) {
        out.push(h("span.sep", {key: "sep" + i}, "·"));
      }
      out.push(parts[i]);
    }
    return out;
  }

  // The health element rides on the header line (Head renders it), so it
  // costs no vertical space of its own. The cause line drops here - it is
  // the first thing the health screen says.
  renderHeaderHealth() {
    var state, summary, sic_icon, sic_ink;
    if (!Page.server_info) {
      return null;
    }
    state = this.healthState();
    summary = this.renderMiniSummary();
    // The chip icon reports the worst thing going on: red error when the
    // node has errors, amber warning when something needs attention, else a
    // wifi mark carrying the health state's own color (the spinner stays
    // while checking).
    if (Page.server_errors && Page.server_errors.length) {
      sic_icon = "err";
      sic_ink = "bad";
    } else if (this.getWarnings().length) {
      sic_icon = "warn";
      sic_ink = "warn";
    } else {
      sic_icon = state.icon === "loader" ? "loader" : "wifi";
      sic_ink = state.ink;
    }
    return h("a.health-chip", {
      href: "#Health",
      classes: {bounce: this.port_checking},
      onclick: this.handleStripClick,
      "aria-haspopup": "true",
      "aria-label": state.cause ? state.label + " \u00B7 " + state.cause : state.label,
      title: state.cause ? state.label + " \u00B7 " + state.cause : state.label
    }, [
      h("span.sic", {classes: this.inkClasses(sic_ink)}, [
        this.icon(sic_icon, 18)
      ]),
      h("span.sstate", {classes: this.inkClasses(state.ink)}, state.label),
      state.cause ? h("span.scause", state.cause) : null,
      summary ? h("span.ssum", {"aria-hidden": "true"}, summary) : null,
      h("span.schev", [this.icon("chevR", 15)])
    ]);
  }

  // Status chips under the strip: warnings / newversion / multiuser / logout.
  // Menu.js popovers stay for these, so the onmousedown+returnFalse pattern
  // stays too, and each menu renders right after its chip (Menu anchors on
  // previousElementSibling).
  renderChips(warnings) {
    var show_newversion_version = parseFloat(Page.server_info.version.replace(/\./g, "0")) < parseFloat(Page.latest_version.replace(/\./g, "0"));
    var show_newversion_rev = !show_newversion_version && Page.server_info.rev < Page.latest_rev;
    var show_multiuser = Page.server_info.multiuser;
    var show_logout = Page.server_info.plugins && Page.server_info.plugins.indexOf("UiPassword") >= 0;
    if (!show_newversion_version && !show_newversion_rev && !show_multiuser && !show_logout) {
      return null;
    }
    return h("div.health-chips", [
      show_newversion_version ? h("a.chip.newversion.dashboard-item", {
        href: "#Update",
        onmousedown: this.handleNewversionClick,
        onclick: Page.returnFalse
      }, "New EpixNet version: " + Page.latest_version) : show_newversion_rev ? h("a.chip.newversion.dashboard-item", {
        href: "#Update",
        onmousedown: this.handleNewversionClick,
        onclick: Page.returnFalse
      }, "New important update: rev" + Page.latest_rev) : void 0,
      this.menu_newversion.render(".menu-newversion"),
      show_multiuser ? h("a.chip.port.dashboard-item.multiuser", {
        href: "#Multiuser",
        onmousedown: this.handleMultiuserClick,
        onclick: Page.returnFalse
      }, [
        h("span", _("User") + ": "), h("span.status", {
          style: "color: " + (Text.toColor(Page.server_info.master_address))
        }, Page.server_info.master_address.slice(0, 5) + ".." + Page.server_info.master_address.slice(-4))
      ]) : void 0,
      show_multiuser ? this.menu_multiuser.render(".menu-multiuser") : void 0,
      show_logout ? h("a.chip.port.dashboard-item.logout", {
        href: "#Logout",
        onmousedown: this.handleLogoutClick,
        onclick: Page.returnFalse
      }, [h("span", _("Logout"))]) : void 0
    ]);
  }

  // Middle truncation without a double ellipsis: the head span ellipsizes via
  // CSS (text-overflow) while the tail span - the last 12 chars, keeping
  // .onion / .b32.i2p endings readable - never shrinks. One ellipsis total,
  // drawn by the browser.
  renderAddr(text) {
    if (!text) {
      return null;
    }
    text = "" + text;
    if (text.length <= 16) {
      return h("div.condet.mono", [h("span.th", text)]);
    }
    return h("div.condet.mono", [
      h("span.th", text.slice(0, text.length - 12)),
      h("span.tt", text.slice(-12))
    ]);
  }

  clearnetDetail(c) {
    if (!c || !c.enabled) {
      return null;
    }
    // No known external ip (the normal state for an unreachable node):
    // ":26599" reads like a bug, so label the bare port instead.
    if (!c.ip) {
      return _("Port ") + c.port;
    }
    return c.ip + ":" + c.port;
  }

  clearnetStat(c) {
    if (!c || !c.enabled) {
      return h("span.constat", [this.icon("off", 15), _("Disabled")]);
    }
    if (c.reachable) {
      return h("span.constat.ok-ink", [this.icon("check", 15), _("Open")]);
    }
    return h("span.constat.warn-ink", [this.icon("warn", 15), _("Closed")]);
  }

  torStat(t) {
    if (!t || !t.enabled) {
      return h("span.constat", [this.icon("off", 15), _("Off")]);
    }
    if (t.reachable) {
      if (t.always) {
        return h("span.constat.ok-ink", [this.icon("check", 15), _("Online") + " · " + _("always")]);
      }
      return h("span.constat.ok-ink", [this.icon("check", 15), _("Online")]);
    }
    return h("span.constat.warn-ink", [this.icon("loader", 15), t.status || _("Connecting")]);
  }

  i2pStat(p) {
    if (!p || !p.enabled) {
      return h("span.constat", [this.icon("off", 15), _("Off")]);
    }
    if (p.reachable) {
      return h("span.constat.ok-ink", [this.icon("check", 15), _("Online")]);
    }
    return h("span.constat.warn-ink", [this.icon("loader", 15), p.phase || _("Connecting")]);
  }

  connRow(key, name, stat, detail) {
    return h("div.conrow", {key: key}, [
      h("div.conmain", [
        h("div.conname", name),
        detail
      ]),
      stat
    ]);
  }

  renderConnections() {
    var ns = this.networkStatus();
    return h("div.hcard.hcard-connections", [
      this.connRow("clearnet", _("Clearnet"), this.clearnetStat(ns.clearnet), this.renderAddr(this.clearnetDetail(ns.clearnet))),
      this.connRow("tor", _("Tor"), this.torStat(ns.tor), this.renderAddr(ns.tor ? ns.tor.address : null)),
      this.connRow("i2p", _("I2P"), this.i2pStat(ns.i2p), this.renderAddr(ns.i2p ? ns.i2p.address : null))
    ]);
  }

  // A tracker's row state is its success rate over time, not how the last
  // round happened to end. Public tracker lists are full of entries that fail
  // intermittently, and judging on the last round alone painted a tracker that
  // works most of the time red the moment it missed once. The last error still
  // shows in the row's meta line either way. "?" means nothing has been asked
  // of it yet, which is not a verdict.
  trackerState(success_percent) {
    if (success_percent === "?") {
      return {ink: "", icon: "loader", label: _("Waiting")};
    }
    if (success_percent < 10) {
      return {ink: "bad", icon: "err", label: _("Bad")};
    }
    if (success_percent < 75) {
      return {ink: "warn", icon: "warn", label: _("Degraded")};
    }
    return {ink: "ok", icon: "check", label: _("Healthy")};
  }

  renderTrackerRow(tracker_url, stat, announce_times) {
    var tracker_name, tracker_display, success_percent, request_taken, title_text, state, width, meta;
    tracker_name = tracker_url.replace(/(.*:\/\/.*?)[\/#].*/, "$1").replace(/:[0-9]+$/, "");

    // Create a truncated display name for long URLs
    tracker_display = tracker_name;
    if (tracker_name.length > 35) {
      tracker_display = tracker_name.substring(0, 32) + "...";
    }

    // The rate is rounded before it is judged, so the label never disagrees
    // with the percentage printed next to it.
    success_percent = this.trackerRate(stat);
    if (success_percent < 0) {
      success_percent = "?";
    }
    // The node reports the announce's own duration as `latency` (seconds,
    // fractional). This used to subtract time_status from time_request, but
    // the node never sets time_status, so the timing here and the average in
    // the card header have both been missing all along.
    request_taken = null;
    if (stat.status === "announced" && typeof stat.latency === "number") {
      request_taken = stat.latency;
      announce_times.push(request_taken);
    }
    state = this.trackerState(success_percent);

    title_text = "Full URL: " + tracker_name + "\nRequests: " + stat.num_request +
      "\nSucceeded: " + stat.num_success + "\nLast announce: " + stat.status;
    if (stat.last_error) {
      title_text += "\nLast error: " + stat.last_error + " (" + (Time.since(stat.time_last_error)) + ")";
    }

    width = success_percent === "?" ? 0 : success_percent;
    meta = success_percent + "%";
    if (request_taken !== null) {
      meta += " · " + request_taken.toFixed(2) + "s";
    }
    if (stat.last_error) {
      meta += " · " + stat.last_error + " (" + Time.since(stat.time_last_error) + ")";
    }

    return h("div.trrow", {key: tracker_url, title: title_text}, [
      h("div.trtop", [
        h("span.trname.mono", [h("span.th", tracker_display)]),
        h("span.trstat", {classes: this.inkClasses(state.ink)}, [this.icon(state.icon, 13), state.label])
      ]),
      h("div.trbot", [
        h("span.track", [
          h("span.tfill", {
            styles: {
              width: width + "%",
              background: state.ink ? "var(--dash-" + state.ink + "-ink)" : "var(--epix-text-mid)"
            }
          })
        ]),
        h("span.trmeta", meta)
      ])
    ]);
  }

  // Success rate as a number the list can sort on. Trackers nothing has been
  // asked of yet have no rate: -1 parks them below the rated ones instead of
  // ranking them alongside trackers that actually failed.
  trackerRate(stat) {
    return stat.num_request ? Math.round((stat.num_success / stat.num_request) * 100) : -1;
  }

  renderTrackers() {
    var stats, counts, rows, announce_times, avg, order;
    stats = this.trackerStats();
    counts = this.trackerCounts();
    announce_times = [];
    // Best health first, so the trackers actually carrying the node are at the
    // top and the dead weight sinks. Ties break on the url, which keeps the
    // order steady across refreshes rather than reshuffling equal rows.
    order = Object.keys(stats).sort((a, b) => {
      return (this.trackerRate(stats[b]) - this.trackerRate(stats[a])) || a.localeCompare(b);
    });
    rows = order.map((tracker_url) => {
      return this.renderTrackerRow(tracker_url, stats[tracker_url], announce_times);
    });
    avg = null;
    if (announce_times.length) {
      avg = announce_times.reduce(function(a, b) { return a + b; }, 0) / announce_times.length;
    }
    return h("div.hcard.hcard-trackers", [
      h("div.trhead", [
        h("span.th1", counts.ok + _(" of ") + counts.total + _(" announced")),
        avg !== null ? h("span.th2", _("avg announce ") + avg.toFixed(1) + " s") : null
      ]),
      h("div.tracker-rows", rows)
    ]);
  }

  // Warnings live here rather than in a banner of their own: this screen is
  // the one place that answers "is my node ok". The restart action came from
  // the old warnings menu.
  handleRestartClick() {
    return Page.cmd("serverShutdown", {restart: true});
  }

  renderWarningsSection() {
    var warnings = this.getWarnings();
    if (!warnings.length) {
      return null;
    }
    return [
      h("div.seclabel", {key: "warnlabel"}, _("Warnings")),
      h("div.hcard.hcard-warnings", {key: "warncard"}, [
        warnings.map((warning, i) => {
          var body = [
            h("div.wtitle", warning.title),
            warning.descr ? h("div.wdescr", warning.descr) : null
          ];
          return warning.href ? h("a.wrow", {
            key: "w" + i,
            classes: {error: !!warning.error},
            href: warning.href
          }, body.concat([h("span.wchev", [this.icon("chevR", 15)])])) : h("div.wrow", {
            key: "w" + i,
            classes: {error: !!warning.error}
          }, body);
        }),
        h("button.wrestart", {
          key: "restart",
          onclick: this.handleRestartClick
        }, [this.icon("refresh", 16), _("Restart EpixNet client")])
      ])
    ];
  }

  renderHealthScreen(state) {
    var si = Page.server_info;
    var ns = this.networkStatus();
    var has_stats = !!(Page.announcer_info || Page.announcer_stats);
    var faq = Text.getSiteUrl("epix1readmehqfdxy4pzx7u72wwaerc4psx0gt6fety") + "faq/#do-i-need-to-have-a-port-opened";
    // Exact old gating: no toggle on a read-only gateway; enable offered only
    // when Tor is running, disable only when already in always mode. The old
    // offline menu offered no actions either, so hide both when offline.
    var show_tor_toggle = !si.offline && !si.ui_restrict && (this.isTorAlways() || (ns.tor && ns.tor.enabled));
    return h("div.health-screen.screen", {
      classes: {open: this.health_open},
      role: "region",
      "aria-label": _("Network health"),
      "aria-hidden": this.health_open ? "false" : "true"
    }, [
      h("div.shead", [
        h("a.back.health-back", {
          href: "#Back",
          onclick: this.handleBackClick
        }, [this.icon("chevL", 18), Page.head ? Page.head.modeTitle() : _("Dashboard")]),
        h("h2", _("Network health")),
        h("div.ssub", {classes: this.inkClasses(state.ink)}, [
          this.icon(state.icon, 15),
          h("span", state.cause ? state.label + " · " + state.cause : state.label)
        ])
      ]),
      h("div.sbody", [
        this.renderWarningsSection(),
        h("div.seclabel", _("Connections")),
        this.renderConnections(),
        has_stats ? h("div.seclabel.seclabel-trackers", _("Trackers")) : null,
        has_stats ? this.renderTrackers() : null,
        h("div.hactions", [
          si.offline ? h("a.offline-note", {
            key: "offline",
            href: "/Config"
          }, "Offline mode, network communication disabled.") : null,
          !si.offline ? h("button.recheck", {
            key: "recheck",
            classes: {checking: this.port_checking},
            disabled: this.port_checking,
            onclick: this.handlePortRecheckClick
          }, [this.icon("refresh", 16), _("Re-check reachability")]) : null,
          show_tor_toggle ? h("button.togglerow", {
            key: "tor",
            role: "switch",
            "aria-checked": this.isTorAlways() ? "true" : "false",
            onclick: this.handleTorToggleClick
          }, [
            // Keep the old distinct string for the already-on case (it is an
            // existing i18n key).
            h("span.tlabel", this.isTorAlways() ? _("Disable always-Tor mode") : _("Route every connection through Tor (slower)")),
            h("span.sw", {"aria-hidden": "true"})
          ]) : null,
          h("a.learn-more", {key: "learn", href: faq}, _("Learn more"))
        ])
      ])
    ]);
  }

  render() {
    var warnings, state;
    if (Page.server_info) {
      warnings = this.getWarnings();
      state = this.healthState();
      return h("div#Dashboard", [
        this.renderChips(warnings),
        // Scrim behind the health drawer: the dashboard stays visible
        // through it, and clicking it closes - same pattern as the
        // hamburger panel's backdrop, mirrored to the right side.
        h("div.health-backdrop", {
          classes: {open: this.health_open},
          onclick: this.handleBackClick,
          "aria-hidden": "true"
        }),
        this.renderHealthScreen(state)
      ]);
    } else {
      return h("div#Dashboard");
    }
  }
}

Object.assign(Dashboard.prototype, LogMixin);
window.Dashboard = Dashboard;

})();
