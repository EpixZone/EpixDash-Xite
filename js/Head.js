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
    this.handleCreateSiteClick = this.handleCreateSiteClick.bind(this);
    this.renderMenuTheme = this.renderMenuTheme.bind(this);
    this.handleThemeClick = this.handleThemeClick.bind(this);
    this.renderMenuLanguage = this.renderMenuLanguage.bind(this);
    this.handleSegSitesClick = this.handleSegSitesClick.bind(this);
    this.handleSegFeedClick = this.handleSegFeedClick.bind(this);
    this.handleNavSitesClick = this.handleNavSitesClick.bind(this);
    this.handleNavFilesClick = this.handleNavFilesClick.bind(this);
    this.handleNavStatsClick = this.handleNavStatsClick.bind(this);
    this.handleHealthClick = this.handleHealthClick.bind(this);
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
    this.handleLangOpen = this.handleLangOpen.bind(this);
    this.handleLangBack = this.handleLangBack.bind(this);
    this.handleLangPick = this.handleLangPick.bind(this);
    // Whether the panel shows the language picker subview instead of the
    // main settings list. Trigger.open() resets it so the panel always
    // opens on the main view.
    this.lang_open = false;
  }

  // Native names, so someone stuck on the English default recognises their
  // own language in its own script (the reason the row wears a globe icon).
  langName(code) {
    var names = {
      "ar": "العربية", "da": "Dansk", "de": "Deutsch", "en": "English",
      "es": "Español", "fa": "فارسی", "fr": "Français", "hu": "Magyar",
      "it": "Italiano", "jp": "日本語", "kr": "한국어", "nl": "Nederlands",
      "pl": "Polski", "pt": "Português", "pt-br": "Português (Brasil)",
      "ru": "Русский", "sk": "Slovenčina", "sl": "Slovenščina",
      "tr": "Türkçe", "uk": "Українська", "zh": "中文（简体）", "zh-tw": "中文（繁體）"
    };
    return names[code] || code;
  }

  handleLangOpen() {
    this.lang_open = true;
    Page.projector.scheduleRender();
    // The clicked row is about to leave the DOM, which would drop focus to
    // body; hand it to the subview's back button once it renders.
    this.focusAfterRender(".panel .pback");
    return false;
  }

  handleLangBack() {
    this.lang_open = false;
    Page.projector.scheduleRender();
    this.focusAfterRender('.panel .srow[href="#Language"]');
    return false;
  }

  focusAfterRender(selector) {
    setTimeout(function() {
      var el = document.querySelector(selector);
      if (el) {
        el.focus();
      }
    }, 80);
  }

  handleLangPick(e) {
    // currentTarget, not target: the row has name/code span children and
    // the click usually lands on one of them.
    var lang = e.currentTarget.hash.replace("#", "");
    Page.cmd("configSet", ["language", lang], function() {
      Page.server_info.language = lang;
      loadLanguage(lang);
      Page.projector.scheduleRender();
    });
    return false;
  }

  // The language codes the node ships translations for, plus the current
  // language when it is something exotic (so the picker can still show it).
  languageCodes() {
    var langs, ref;
    langs = ["ar", "da", "de", "en", "es", "fa", "fr", "hu", "it", "jp", "kr", "nl", "pl", "pt", "pt-br", "ru", "sk", "sl", "tr", "uk", "zh", "zh-tw"];
    if (Page.server_info.language && Page.server_info.language.length >= 2 && (ref = Page.server_info.language, langs.indexOf(ref) < 0)) {
      langs.push(Page.server_info.language);
    }
    return langs;
  }

  currentLanguage() {
    return Page.server_info.language || "en";
  }

  // The settings row: globe icon + the current language's native name +
  // chevron into the picker subview. The globe is the wayfinding for
  // someone who landed on the English default and reads none of it.
  renderMenuLanguage() {
    return h("a.srow", {
      key: "language",
      href: "#Language",
      onclick: this.handleLangOpen
    }, [
      this.icon("globe"),
      h("span.grow", _("Language")),
      h("span.sval", this.langName(this.currentLanguage())),
      h("span.chev", [this.icon("chev")])
    ]);
  }

  // The picker subview: one row per language, native name first, code as
  // the muted secondary, checkmark on the active one.
  renderLanguageList() {
    var current = this.currentLanguage();
    return this.languageCodes().map((lang) => {
      return h("a.lrow", {
        href: "#" + lang,
        key: lang,
        "aria-current": current === lang ? "true" : "false",
        onclick: this.handleLangPick,
        classes: {selected: current === lang}
      }, [
        h("span.lname", this.langName(lang)),
        h("span.lcode.mono", lang),
        h("span.lcheck", current === lang ? [this.icon("check")] : [])
      ]);
    });
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

  // Theme as a labelled segmented control (the Notch settings design).
  // The <a> children stay text-only on purpose: handleThemeClick reads
  // e.target.hash, and a child element would swallow the hash.
  renderMenuTheme() {
    var ref, theme_names, theme_selected, themes;
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
    return h("div.srow-static", {key: "theme"}, [
      h("div.slab", _("Theme")),
      h("div.seg.pseg", {role: "group", "aria-label": _("Theme")}, themes.map((t) => {
        return h("a", {
          href: "#" + t,
          key: t,
          role: "button",
          "aria-pressed": theme_selected === t ? "true" : "false",
          onclick: this.handleThemeClick,
          classes: {active: theme_selected === t}
        }, theme_names[t] || t);
      }))
    ]);
  }

  // Order-by as the same labelled segmented control. Same one-per-option
  // bound handlers the old radio rows used.
  renderMenuOrderby() {
    var orderby = (Page.settings || {}).sites_orderby || "modified";
    return h("div.srow-static", {key: "orderby"}, [
      h("div.slab", _("Order by")),
      h("div.seg.pseg", {role: "group", "aria-label": _("Order by")}, [
        h("a", {href: "#modified", key: "modified", role: "button", "aria-pressed": orderby === "modified" ? "true" : "false", onclick: this.handleOrderbyModified, classes: {active: orderby === "modified"}}, _("Updated")),
        h("a", {href: "#peers", key: "peers", role: "button", "aria-pressed": orderby === "peers" ? "true" : "false", onclick: this.handleOrderbyPeers, classes: {active: orderby === "peers"}}, _("Peers")),
        h("a", {href: "#addtime", key: "addtime", role: "button", "aria-pressed": orderby === "addtime" ? "true" : "false", onclick: this.handleOrderbyAddtime, classes: {active: orderby === "addtime"}}, _("Added")),
        h("a", {href: "#size", key: "size", role: "button", "aria-pressed": orderby === "size" ? "true" : "false", onclick: this.handleOrderbySize, classes: {active: orderby === "size"}}, _("Size"))
      ])
    ]);
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
      shield: "M10 2.5l6 2.5v4c0 4-2.7 6.9-6 8.5-3.3-1.6-6-4.5-6-8.5V5z",
      refresh: "M16 8A6.3 6.3 0 004.2 6.2M4 3.5v3h3M4 12a6.3 6.3 0 0011.8 1.8M16 16.5v-3h-3",
      plus: "M10 4v12M4 10h12",
      gear: "M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM16 10a6 6 0 01-.1 1l1.7 1.3-1.5 2.6-2-.8a6 6 0 01-1.7 1l-.3 2.1H9.9l-.3-2.1a6 6 0 01-1.7-1l-2 .8-1.5-2.6L6.1 11a6 6 0 010-2L4.4 7.7l1.5-2.6 2 .8a6 6 0 011.7-1l.3-2.1h2.2l.3 2.1a6 6 0 011.7 1l2-.8 1.5 2.6L15.9 9a6 6 0 01.1 1z",
      hex: "M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5z",
      save: "M4 3.5h9.5L16 6v10.5H4zM6.5 3.5V8h7V3.5M7 12h6v4.5H7z",
      dir: "M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15.5h12",
      power: "M10 3v7M5.5 6.2a6.3 6.3 0 108.9 0",
      globe: "M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM2.5 10h15M10 2.5c1.9 2 3 4.6 3 7.5s-1.1 5.5-3 7.5c-1.9-2-3-4.6-3-7.5s1.1-5.5 3-7.5z",
      sliders: "M3 6.5h7.3M15.1 6.5H17M3 13.5h1.9M8.7 13.5H17M14.9 6.5a1.9 1.9 0 10-3.8 0 1.9 1.9 0 003.8 0zM8.9 13.5a1.9 1.9 0 10-3.8 0 1.9 1.9 0 003.8 0z",
      chev: "M7.5 5.5l4.5 4.5-4.5 4.5",
      back: "M12.5 5.5L8 10l4.5 4.5",
      check: "M4.5 10.5l3.5 3.5 7.5-8",
      x: "M5.5 5.5l9 9M14.5 5.5l-9 9"
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

  // The panel's inner content, in the Notch settings design: a titled
  // header with a close ×, full-width rows with hairline separators,
  // labelled segmented controls, and a centered version footer. Rendered
  // by Trigger inside aside.panel; every gating rule from the old settings
  // menu survives here verbatim.
  renderPanelContent(trigger) {
    var base, server_info;
    server_info = Page.server_info;
    if (!server_info) {
      return [];
    }
    if ((base = Page.settings || {}).sites_orderby == null) {
      base.sites_orderby = "modified";
    }
    var multiuser_ok = !server_info.multiuser || server_info.multiuser_admin;
    // The language picker replaces the whole panel body; back returns to
    // the main list without dropping the panel.
    if (this.lang_open) {
      return [
        h("div.phead", [
          h("a.pback", {
            href: "#Back",
            "aria-label": _("Back"),
            onclick: this.handleLangBack
          }, [this.icon("back")]),
          h("span.ptitle", [_("Language")]),
          h("a.pclose", {
            href: "#Close",
            "aria-label": _("Close"),
            onclick: trigger.handleToggleClick
          }, [this.icon("x")])
        ]),
        h("div.pscroll", this.renderLanguageList())
      ];
    }
    return [
      h("div.phead", [
        h("span.ptitle", [_("Settings")]),
        h("a.pclose", {
          href: "#Close",
          "aria-label": _("Close"),
          onclick: trigger.handleToggleClick
        }, [this.icon("x")])
      ]),
      h("div.pscroll", [
        h("div.pnav", [
          h("a", {
            href: "?",
            classes: { active: Page.mode === "Sites" },
            "aria-current": Page.mode === "Sites" ? "page" : "false",
            onclick: this.handleNavSitesClick
          }, [this.icon("grid"), _("Xites")]),
          h("a", {
            href: "?Files",
            classes: { active: Page.mode === "Files" },
            "aria-current": Page.mode === "Files" ? "page" : "false",
            onclick: this.handleNavFilesClick
          }, [this.icon("folder"), _("Files")]),
          h("a", {
            href: "?Stats",
            classes: { active: Page.mode === "Stats" },
            "aria-current": Page.mode === "Stats" ? "page" : "false",
            onclick: this.handleNavStatsClick
          }, [this.icon("bars"), _("Stats")])
        ]),
        h("div.pdiv"),
        h("a.srow", {
          key: "health",
          href: "#Health",
          onclick: this.handleHealthClick
        }, [this.icon("pulse"), h("span.grow", _("Network health")), h("span.chev", [this.icon("chev")])]),
        h("a.srow", {
          key: "blocks",
          href: "#Blocks",
          onclick: this.handlePanelBlocksClick
        }, [this.icon("shield"), h("span.grow", _("Manage blocks")), h("span.chev", [this.icon("chev")])]),
        h("a.srow", {
          key: "updateall",
          href: "#UpdateAll",
          onclick: this.handlePanelUpdateAllClick
        }, [this.icon("refresh"), h("span.grow", _("Update all xites"))]),
        this.renderMenuOrderby(),
        this.renderMenuTheme(),
        this.renderMenuLanguage(),
        h("a.srow", {
          key: "create",
          href: "#Create",
          onclick: this.handlePanelCreateClick
        }, [this.icon("plus"), h("span.grow", _("Create new xite")), h("span.chev", [this.icon("chev")])]),
        server_info.plugins.indexOf("UiConfig") >= 0 ? h("a.srow", {
          key: "config",
          href: "/Config"
        }, [this.icon("sliders"), h("span.grow", _("Configuration")), h("span.chev", [this.icon("chev")])]) : void 0,
        server_info.plugins.indexOf("UiPluginManager") >= 0 ? h("a.srow", {
          key: "plugins",
          href: "/Plugins"
        }, [this.icon("hex"), h("span.grow", _("Plugins")), h("span.chev", [this.icon("chev")])]) : void 0,
        server_info.plugins.indexOf("Stats") >= 0 ? h("a.srow", {
          key: "nodestats",
          href: "/Stats"
        }, [this.icon("bars"), h("span.grow", _("Node stats")), h("span.chev", [this.icon("chev")])]) : void 0,
        // The backend refuses /Backup on a restricted gateway or a NoNewSites
        // node, and clients on v0.3.24 or older have no /Backup page at all.
        server_info.plugins.indexOf("UiBackup") >= 0 && !server_info.ui_restrict &&
          this.isVersionNewerThan(server_info.version, "0.3.24") &&
          server_info.plugins.indexOf("NoNewSites") < 0 && multiuser_ok ? h("a.srow", {
          key: "backup",
          href: "/Backup"
        }, [this.icon("save"), h("span.grow", _("Backup & Restore")), h("span.chev", [this.icon("chev")])]) : void 0,
        multiuser_ok ? h("a.srow", {
          key: "datadir",
          href: "#DataDir",
          onclick: this.handlePanelBackupClick
        }, [this.icon("dir"), h("span.grow", _("Show data directory"))]) : void 0,
        // A read-only gateway refuses serverShutdown, so don't offer it there.
        multiuser_ok && !server_info.ui_restrict ? h("a.srow.danger", {
          key: "shutdown",
          href: "#Shutdown",
          onclick: this.handlePanelShutdownClick
        }, [this.icon("power"), h("span.grow", _("Shut down EpixNet"))]) : void 0,
        h("div.pversion", ["EpixNet v" + server_info.version])
      ])
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
