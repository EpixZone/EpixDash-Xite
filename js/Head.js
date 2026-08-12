(function() {

class Head {
  constructor() {
    this.render = this.render.bind(this);
    this.renderPanelContent = this.renderPanelContent.bind(this);
    this.handleShutdownEpixNetClick = this.handleShutdownEpixNetClick.bind(this);
    this.handleManageBlocksClick = this.handleManageBlocksClick.bind(this);
    this.handleOrderbyClick = this.handleOrderbyClick.bind(this);
    this.handleUpdateAllClick = this.handleUpdateAllClick.bind(this);
    this.handleBackupClick = this.handleBackupClick.bind(this);
    this.handleConsoleClick = this.handleConsoleClick.bind(this);
    this.handleCreateSiteClick = this.handleCreateSiteClick.bind(this);
    this.renderMenuTheme = this.renderMenuTheme.bind(this);
    this.handleThemeClick = this.handleThemeClick.bind(this);
    this.renderMenuLanguage = this.renderMenuLanguage.bind(this);
    this.handleLanguageClick = this.handleLanguageClick.bind(this);
    this.handleSegSitesClick = this.handleSegSitesClick.bind(this);
    this.handleSegFeedClick = this.handleSegFeedClick.bind(this);
    this.handleNavSitesClick = this.handleNavSitesClick.bind(this);
    this.handleNavFilesClick = this.handleNavFilesClick.bind(this);
    this.handleNavStatsClick = this.handleNavStatsClick.bind(this);
    this.handleHealthClick = this.handleHealthClick.bind(this);
    this.handlePanelConsoleClick = this.handlePanelConsoleClick.bind(this);
    this.handlePanelBlocksClick = this.handlePanelBlocksClick.bind(this);
    this.handlePanelUpdateAllClick = this.handlePanelUpdateAllClick.bind(this);
    this.handlePanelCreateClick = this.handlePanelCreateClick.bind(this);
    this.handlePanelBackupClick = this.handlePanelBackupClick.bind(this);
    this.handlePanelShutdownClick = this.handlePanelShutdownClick.bind(this);
    // maquette forbids new handler identities across renders, so every
    // radio row's handler is created once here.
    this.handleOrderbyPeers = () => { this.handleOrderbyClick("peers"); return false; };
    this.handleOrderbyModified = () => { this.handleOrderbyClick("modified"); return false; };
    this.handleOrderbyAddtime = () => { this.handleOrderbyClick("addtime"); return false; };
    this.handleOrderbySize = () => { this.handleOrderbyClick("size"); return false; };
  }

  handleLanguageClick(e) {
    var lang;
    lang = e.target.hash.replace("#", "");
    Page.cmd("configSet", ["language", lang], function() {
      Page.server_info.language = lang;
      loadLanguage(lang);
      Page.projector.scheduleRender();
    });
    return false;
  }

  renderMenuLanguage() {
    var lang, langs, ref;
    langs = ["ar", "da", "de", "en", "es", "fa", "fr", "hu", "it", "jp", "nl", "pl", "pt", "pt-br", "ru", "sk", "sl", "tr", "uk", "zh", "zh-tw", "kr"];
    if (Page.server_info.language && Page.server_info.language.length >= 2 && (ref = Page.server_info.language, langs.indexOf(ref) < 0)) {
      langs.push(Page.server_info.language);
    }
    return h("div.menu-radio", h("div", _("Language: ")), (() => {
      var i, len, results;
      results = [];
      for (i = 0, len = langs.length; i < len; i++) {
        lang = langs[i];
        if (lang === "pt") {
          results.push([
            h("span.lang-pair", [
              h("a.half", {
                href: "#pt",
                onclick: this.handleLanguageClick,
                classes: { selected: Page.server_info.language === "pt" }
              }, "pt"),
              h("a.half", {
                href: "#pt-br",
                onclick: this.handleLanguageClick,
                classes: { selected: Page.server_info.language === "pt-br" }
              }, "pt-br")
            ]), " "
          ]);
        } else if (lang === "pt-br") {
          continue;
        } else {
          results.push([
            h("a", {
              href: "#" + lang,
              onclick: this.handleLanguageClick,
              classes: {
                selected: Page.server_info.language === lang,
                long: lang.length > 2
              }
            }, lang), " "
          ]);
        }
      }
      return results;
    })());
  }

  handleThemeClick(e) {
    var DARK, mqDark, theme;
    theme = e.target.hash.replace("#", "");
    if (theme === "system") {
      DARK = "(prefers-color-scheme: dark)";
      mqDark = window.matchMedia(DARK);
    }
    Page.cmd("userGetGlobalSettings", [], function(user_settings) {
      if (theme === "system") {
        theme = mqDark.matches ? "dark" : "light";
        user_settings.use_system_theme = true;
      } else {
        user_settings.use_system_theme = false;
      }
      user_settings.theme = theme;
      Page.server_info.user_settings = user_settings;
      // The always-mounted panel shows the Theme radio: re-render so the
      // selected dot follows the new settings right away.
      Page.projector.scheduleRender();
      document.getElementById("style-live").innerHTML = "* { transition: all 0.5s ease-in-out }";
      Page.cmd("userSetGlobalSettings", [user_settings]);
      return setTimeout(function() {
        document.body.className = document.body.className.replace(/theme-[a-z]+/, "");
        document.body.className += " theme-" + theme;
        return setTimeout(function() {
          return document.getElementById("style-live").innerHTML = "";
        }, 1000);
      }, 300);
    });
    return false;
  }

  renderMenuTheme() {
    var ref, theme, theme_names, theme_selected, themes;
    themes = ["system", "light", "dark"];
    theme_names = {"system": _("System"), "light": _("Light"), "dark": _("Dark")};
    if (Page.server_info.user_settings.use_system_theme) {
      theme_selected = "system";
    } else {
      theme_selected = (ref = Page.server_info.user_settings) != null ? ref.theme : void 0;
      if (!theme_selected) {
        theme_selected = "system";
      }
    }
    return h("div.menu-radio.menu-themes", h("div", _("Theme: ")), (() => {
      var i, len, results;
      results = [];
      for (i = 0, len = themes.length; i < len; i++) {
        theme = themes[i];
        results.push([
          h("a", {
            href: "#" + theme,
            onclick: this.handleThemeClick,
            classes: {
              selected: theme_selected === theme,
              long: true
            }
          }, theme_names[theme] || theme), " "
        ]);
      }
      return results;
    })());
  }

  handleCreateSiteClick() {
    return Page.cmd("siteClone", [Page.site_info.address, "template-new"]);
  }

  handleBackupClick() {
    Page.cmd("serverShowdirectory", "backup");
    return Page.cmd("wrapperNotification", ["info", "Backup <b>users.json</b> file to keep your identity safe."]);
  }

  // Whether a dotted version string like "0.3.25" is newer than `min`.
  // Non-numeric parts count as 0; equal versions are NOT newer.
  isVersionNewerThan(version, min) {
    var a = String(version || "").split(".");
    var b = String(min).split(".");
    for (var i = 0; i < Math.max(a.length, b.length); i++) {
      var x = parseInt(a[i], 10) || 0;
      var y = parseInt(b[i], 10) || 0;
      if (x !== y) { return x > y; }
    }
    return false;
  }

  handleUpdateAllClick() {
    var i, len, ref, results, site;
    ref = Page.site_list.sites;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      site = ref[i];
      if (site.row.settings.serving) {
        results.push(Page.cmd("siteUpdate", {
          "address": site.row.address
        }));
      } else {
        results.push(void 0);
      }
    }
    return results;
  }

  handleOrderbyClick(orderby) {
    Page.settings.sites_orderby = orderby;
    Page.site_list.reorder();
    return Page.saveSettings();
  }

  handleManageBlocksClick() {
    Page.projector.replace($("#MuteList"), Page.mute_list.render);
    return Page.mute_list.show();
  }

  handleConsoleClick() {
    Page.projector.replace($("#ConsoleList"), Page.console_list.render);
    return Page.console_list.show();
  }

  handleShutdownEpixNetClick() {
    return Page.cmd("wrapperConfirm", ["Are you sure?", "Shut down EpixNet"], () => {
      return Page.cmd("serverShutdown");
    });
  }

  // ---- Panel item handlers (each closes the panel) ----

  closePanel() {
    if (Page.trigger) {
      Page.trigger.close();
    }
  }

  goSitesMode() {
    if (Page.mode !== "Sites") {
      Page.setUrl("?");
    }
  }

  handleNavSitesClick() {
    // Xites and Feed are panes of the same page, so this one entry covers
    // both and leaves whichever pane the user was on alone.
    this.goSitesMode();
    this.closePanel();
    return false;
  }

  handleNavFilesClick() {
    Page.setUrl("?Files");
    this.closePanel();
    return false;
  }

  handleNavStatsClick() {
    Page.setUrl("?Stats");
    this.closePanel();
    return false;
  }

  handleHealthClick() {
    this.closePanel();
    if (Page.dashboard && Page.dashboard.openHealth) {
      Page.dashboard.openHealth();
    }
    return false;
  }

  handlePanelConsoleClick() {
    // The console panel renders in the feed pane, so land there first.
    Page.setSegFeed(true);
    this.goSitesMode();
    this.closePanel();
    this.handleConsoleClick();
    return false;
  }

  handlePanelBlocksClick() {
    Page.setSegFeed(true);
    this.goSitesMode();
    this.closePanel();
    this.handleManageBlocksClick();
    return false;
  }

  handlePanelUpdateAllClick() {
    this.closePanel();
    this.handleUpdateAllClick();
    return false;
  }

  handlePanelCreateClick() {
    this.closePanel();
    this.handleCreateSiteClick();
    return false;
  }

  handlePanelBackupClick() {
    this.closePanel();
    this.handleBackupClick();
    return false;
  }

  handlePanelShutdownClick() {
    this.closePanel();
    this.handleShutdownEpixNetClick();
    return false;
  }

  handleSegSitesClick() {
    Page.setSegFeed(false);
    return false;
  }

  handleSegFeedClick() {
    Page.setSegFeed(true);
    return false;
  }

  // ---- Inline svg icons (stroke, currentColor) ----

  icon(name) {
    var paths = {
      grid: "M3 3h5.5v5.5H3zM11.5 3H17v5.5h-5.5zM3 11.5h5.5V17H3zM11.5 11.5H17V17h-5.5z",
      folder: "M3 5.5A1.5 1.5 0 014.5 4h3.6l1.8 2h5.6A1.5 1.5 0 0117 7.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 14.5z",
      bars: "M4 16.5v-6M10 16.5v-13M16 16.5v-9",
      pulse: "M2.5 10h3l2-5 3.5 10 2.5-7 1 2h3",
      terminal: "M4 6l4 4-4 4M10 15h6",
      shield: "M10 2.5l6 2.5v4c0 4-2.7 6.9-6 8.5-3.3-1.6-6-4.5-6-8.5V5z",
      refresh: "M16 8A6.3 6.3 0 004.2 6.2M4 3.5v3h3M4 12a6.3 6.3 0 0011.8 1.8M16 16.5v-3h-3",
      plus: "M10 4v12M4 10h12",
      gear: "M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM16 10a6 6 0 01-.1 1l1.7 1.3-1.5 2.6-2-.8a6 6 0 01-1.7 1l-.3 2.1H9.9l-.3-2.1a6 6 0 01-1.7-1l-2 .8-1.5-2.6L6.1 11a6 6 0 010-2L4.4 7.7l1.5-2.6 2 .8a6 6 0 011.7-1l.3-2.1h2.2l.3 2.1a6 6 0 011.7 1l2-.8 1.5 2.6L15.9 9a6 6 0 01.1 1z",
      hex: "M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5z",
      save: "M4 3.5h9.5L16 6v10.5H4zM6.5 3.5V8h7V3.5M7 12h6v4.5H7z",
      dir: "M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15.5h12",
      power: "M10 3v7M5.5 6.2a6.3 6.3 0 108.9 0"
    };
    return h("svg", {
      width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", "aria-hidden": "true"
    }, [
      h("path", {
        d: paths[name] || "",
        stroke: "currentColor",
        "stroke-width": "1.6",
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      })
    ]);
  }

  radioRow(label, selected, onclick) {
    return h("a.pradio", {
      href: "#" + label,
      classes: { selected: selected },
      onclick: onclick,
      onmousedown: Page.returnFalse
    }, [h("span.dot"), label]);
  }

  // The panel's inner content. Rendered by Trigger inside aside.panel;
  // every gating rule from the old settings menu survives here verbatim.
  renderPanelContent(trigger) {
    var base, orderby, server_info;
    server_info = Page.server_info;
    if (!server_info) {
      return [];
    }
    if ((base = Page.settings || {}).sites_orderby == null) {
      base.sites_orderby = "modified";
    }
    orderby = (Page.settings || {}).sites_orderby || "modified";
    var multiuser_ok = !server_info.multiuser || server_info.multiuser_admin;
    return [
      h("div.phead", [
        h("img", { src: "img/logo.png", alt: "" }),
        h("span", [_("EpixNet Dashboard")]),
        h("span.version", ["v" + server_info.version])
      ]),
      h("div.pscroll", [
        h("div.pnav", [
          h("a", {
            href: "?",
            classes: { active: Page.mode === "Sites" },
            onclick: this.handleNavSitesClick
          }, [this.icon("grid"), _("Xites")]),
          h("a", {
            href: "?Files",
            classes: { active: Page.mode === "Files" },
            onclick: this.handleNavFilesClick
          }, [this.icon("folder"), _("Files")]),
          h("a", {
            href: "?Stats",
            classes: { active: Page.mode === "Stats" },
            onclick: this.handleNavStatsClick
          }, [this.icon("bars"), _("Stats")])
        ]),
        h("div.pdiv"),
        h("a.prow", {
          href: "#Health",
          onclick: this.handleHealthClick
        }, [this.icon("pulse"), _("Network health")]),
        h("a.prow", {
          href: "#Console",
          onclick: this.handlePanelConsoleClick
        }, [this.icon("terminal"), _("Console")]),
        h("a.prow", {
          href: "#Blocks",
          onclick: this.handlePanelBlocksClick
        }, [this.icon("shield"), _("Manage blocks")]),
        h("div.pdiv"),
        this.radioRow(_("Order xites by update time"), orderby === "modified", this.handleOrderbyModified),
        this.radioRow(_("Order xites by peers"), orderby === "peers", this.handleOrderbyPeers),
        this.radioRow(_("Order xites by add time"), orderby === "addtime", this.handleOrderbyAddtime),
        this.radioRow(_("Order xites by size"), orderby === "size", this.handleOrderbySize),
        h("div.pdiv"),
        this.renderMenuTheme(),
        this.renderMenuLanguage(),
        h("div.pdiv"),
        h("a.prow", {
          href: "#UpdateAll",
          onclick: this.handlePanelUpdateAllClick
        }, [this.icon("refresh"), _("Update all xites")]),
        h("a.prow", {
          href: "#Create",
          onclick: this.handlePanelCreateClick
        }, [this.icon("plus"), _("Create new, empty xite")]),
        server_info.plugins.indexOf("UiConfig") >= 0 ? h("a.prow", {
          href: "/Config"
        }, [this.icon("gear"), _("Configuration")]) : void 0,
        server_info.plugins.indexOf("UiPluginManager") >= 0 ? h("a.prow", {
          href: "/Plugins"
        }, [this.icon("hex"), _("Plugins")]) : void 0,
        server_info.plugins.indexOf("Stats") >= 0 ? h("a.prow", {
          href: "/Stats"
        }, [this.icon("bars"), _("Node Stats")]) : void 0,
        // The backend refuses /Backup on a restricted gateway or a NoNewSites
        // node, and clients on v0.3.24 or older have no /Backup page at all.
        server_info.plugins.indexOf("UiBackup") >= 0 && !server_info.ui_restrict &&
          this.isVersionNewerThan(server_info.version, "0.3.24") &&
          server_info.plugins.indexOf("NoNewSites") < 0 && multiuser_ok ? h("a.prow", {
          href: "/Backup"
        }, [this.icon("save"), _("Backup & Restore")]) : void 0,
        multiuser_ok ? h("a.prow", {
          href: "#DataDir",
          onclick: this.handlePanelBackupClick
        }, [this.icon("dir"), _("Show data directory")]) : void 0,
        // A read-only gateway refuses serverShutdown, so don't offer it there.
        multiuser_ok && !server_info.ui_restrict ? h("a.prow.danger", {
          href: "#Shutdown",
          onclick: this.handlePanelShutdownClick
        }, [this.icon("power"), _("Shut down EpixNet")]) : void 0
      ]),
      h("div.pfoot", [_("Version ") + server_info.version])
    ];
  }

  // One header line: the product name carries the mode. Sites reuses the
  // existing "EpixNet Dashboard" translation key; the other two compose.
  modeTitle() {
    if (Page.mode === "Files") {
      return "EpixNet " + _("Files");
    }
    if (Page.mode === "Stats") {
      return "EpixNet " + _("Stats");
    }
    return _("EpixNet Dashboard");
  }

  render() {
    return h("div#Head", [
      h("div.eyebrow", [
        h("span.apptitle", [this.modeTitle()]),
        // Desktop page tabs: the panel's three nav links promoted into the
        // header so switching pages costs zero clicks of overhead. Hidden
        // by css on mobile, where the hamburger + segmented control rule.
        h("nav.head-tabs", {"aria-label": _("Pages")}, [
          h("a", {
            href: "?",
            classes: {active: Page.mode === "Sites"},
            "aria-current": Page.mode === "Sites" ? "page" : "false",
            onclick: this.handleNavSitesClick
          }, [_("Xites")]),
          h("a", {
            href: "?Files",
            classes: {active: Page.mode === "Files"},
            "aria-current": Page.mode === "Files" ? "page" : "false",
            onclick: this.handleNavFilesClick
          }, [_("Files")]),
          h("a", {
            href: "?Stats",
            classes: {active: Page.mode === "Stats"},
            "aria-current": Page.mode === "Stats" ? "page" : "false",
            onclick: this.handleNavStatsClick
          }, [_("Stats")])
        ]),
        // Node health rides the header line instead of taking a row below it.
        Page.dashboard ? Page.dashboard.renderHeaderHealth() : null
      ]),
      h("div.seg", [
        h("button", {
          type: "button",
          classes: { active: !Page.seg_feed },
          "aria-pressed": !Page.seg_feed ? "true" : "false",
          onclick: this.handleSegSitesClick
        }, [_("Xites")]),
        h("button", {
          type: "button",
          classes: { active: Page.seg_feed },
          "aria-pressed": Page.seg_feed ? "true" : "false",
          onclick: this.handleSegFeedClick
        }, [_("Feed")])
      ])
    ]);
  }
}

Object.assign(Head.prototype, LogMixin);

window.Head = Head;

})();
