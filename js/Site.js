(function() {

// Inline stroke icons for the row-action strip and row accents (per the
// design language: new icons are inline SVG, 1.5-2px stroke, currentColor).
var ICON_PATHS = {
  dots: '<circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/>',
  star: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
  starF: '<path fill="currentColor" stroke="none" d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7M20 3.8v4.4h-4.4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8.2 12.4l2.6 2.6 5-5.4"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  zip: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  upgrade: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  chevronUp: '<path d="M6 14.5l6-6 6 6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  person: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 13h9.2l.9-13M10 11v5.5M14 11v5.5"/>'
};

// Must match the .message.fading transition in css/all.css: the element stays
// mounted for this long so the fade has something to animate.
var MESSAGE_FADE_MS = 260;

var actionIcon = function(name, size) {
  size = size || 18;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON_PATHS[name] || "") + '</svg>';
};

// The row's peer figure, capped so the fixed-width column never grows:
// exact up to 999, then floored magnitude tiers - 1k+ ... 999k+, 1m+ ...
// 99m+ (the ceiling). "999k+" is the widest output; the .peers column
// width in css is sized to it. The exact count stays in the hover title.
var formatPeers = function(n) {
  if (n <= 999) {
    return String(n);
  }
  if (n < 1000000) {
    return Math.floor(n / 1000) + "k+";
  }
  return Math.min(99, Math.floor(n / 1000000)) + "m+";
};

class Site {
  constructor(row, item_list) {
    this.item_list = item_list;
    this.renderOptionalStats = this.renderOptionalStats.bind(this);
    this.render = this.render.bind(this);
    this.renderMergedExpander = this.renderMergedExpander.bind(this);
    this.renderFact = this.renderFact.bind(this);
    this.renderSeedRow = this.renderSeedRow.bind(this);
    this.renderActions = this.renderActions.bind(this);
    this.handleMergedExpandClick = this.handleMergedExpandClick.bind(this);
    this.handleLimitIncreaseClick = this.handleLimitIncreaseClick.bind(this);
    this.handleHelpAllClick = this.handleHelpAllClick.bind(this);
    this.handleHelpClick = this.handleHelpClick.bind(this);
    this.handleActionsClick = this.handleActionsClick.bind(this);
    this.handleRowActionsClick = this.handleRowActionsClick.bind(this);
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
    // The declared favicon failed to load; fall back to the brand-color
    // letter tile. Bound once: maquette forbids a function property changing
    // identity across renders.
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
    this.message_fading = false;
    this.message_fade_timer = null;
    this.message_progress = null;
    this.favorite = Page.settings.favorite_sites[row.address];
    this.key = row.address;
    this.optional_helps = [];
    this.setRow(row);
    this.files = new SiteFiles(this);
    // Files-page seed row state: the switch waits for the node's ack (pending)
    // and the per-directory list collapses past three rows. Handlers are
    // cached per directory - maquette forbids identity changing per render.
    this.help_all_pending = false;
    this.seed_expanded = false;
    this.seed_stop_handlers = {};
    this.handleSeedExpandClick = () => {
      this.seed_expanded = !this.seed_expanded;
      Page.projector.scheduleRender();
      return false;
    };
  }

  // Files this xite is still going to download, as one number: the update's own
  // changed files plus the optional files THIS node promised to fetch (the
  // whole-site toggle, an optionalHelp directory, or full retention). The node
  // reports `optional_left` already excluding anything `tasks` covers, so these
  // add. A xite the user never opted into reports 0 however many optional files
  // it declares - the count is what will be downloaded, not what exists.
  // Only work actually pending. `bad_files` is deliberately not in here: those
  // are files a previous pass failed on, and they have their own error pill -
  // folding them in left a row counting down forever with nothing downloading.
  filesLeft(row) {
    if (!row) { return 0; }
    return (row.tasks || 0) + (row.optional_left || 0);
  }

  setRow(row) {
    var base, base1, base2, base3, event, files_left, key, phase, prev_left, ref, val;
    if (this.help_all_hold_until && Date.now() < this.help_all_hold_until) {
      row.settings.autodownloadoptional = this.help_all_value;
    }
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
    // An update pass reaches us two ways: as an `event` on the push that
    // announces each step, and as `update_phase` on every siteInfo for as long
    // as the pass runs. The phase is what makes the pill survive a reload -
    // events only reach a page that was already open, so refreshing mid-update
    // used to blank the row.
    event = (ref = row.event) != null ? ref[0] : void 0;
    phase = row.update_phase;
    files_left = this.filesLeft(row);
    prev_left = this.filesLeft(this.row);
    // The node reports how far the current phase has got as {done, total}
    // (files while a batch drains, candidate peers while checking), or null
    // when the phase has nothing countable. The pill renders it as a fill
    // behind its label. Read per push; only the progress-bearing states below
    // adopt it, so an error or "Updated!" pill never wears a stale bar.
    val = row.progress;
    val = (val && val.total > 0) ? Math.min(1, val.done / val.total) : null;
    if (event === "updated" && files_left === 0) {
      this.setUpdateOutcome(row);
    } else if (files_left > 0) {
      // Files are landing: the update's own changed files, then any optional
      // ones this node promised to fetch. The pass isn't done until they are,
      // so an `updated` event arriving mid-download does not end the countdown.
      this.setMessage(_("Updating: ") + files_left + _(" left"));
      this.message_progress = val;
    } else if (event === "deleting" || phase === "deleting") {
      // The node is removing this xite (locks, durable intent, directory
      // deletion, Store handover) - visible seconds on a synced xite. The
      // phase rides every siteInfo, so the pill survives a reload and the
      // row reads as working until it disappears.
      this.setMessage(_("Deleting…"), "checking");
    } else if (event === "updating" || phase === "updating") {
      // A peer answered with something newer: this xite really is out of date.
      // Verifying/staging has nothing countable, so no bar - better absent
      // than invented.
      this.setMessage(_("Updating..."));
    } else if (event === "checking" || phase === "checking") {
      // Asking peers whether anything is newer. Nothing is known to be wrong
      // yet, so this pill is deliberately quiet - it is not news.
      // Reuses the health strip's existing key, so all 22 languages already
      // translate it. The bar is its walk through the candidate peers - the
      // honest reason this state takes as long as it does.
      this.setMessage(_("Checking…"), "checking");
      this.message_progress = val;
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
    } else if (prev_left > 0) {
      // The last file landed. This is the "Updated!" the outcome event was not
      // allowed to show while the countdown was still running.
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

  // How an update pass ended. `update_applied` is the node telling us whether
  // the pass actually brought anything: most passes find nothing, and flashing
  // a green "Updated!" on every row every cycle announced work that never
  // happened. Older nodes don't send the field, so only an explicit false
  // counts as "nothing to report".
  setUpdateOutcome(row) {
    if (row.content_updated === false) {
      return this.setMessage(row.peers <= 1 ? _("No peers") : _("Update failed"), "error");
    }
    if (row.update_applied === false) {
      // Nothing was newer. Retire the pill - unless this xite has a standing
      // problem, which is not something the end of a check should hide.
      if (row.bad_files > 0) {
        return this.setMessage(row.peers <= 1 ? _("No peers") : row.bad_files + _(" file update failed"), "error");
      }
      return this.setMessage("");
    }
    return this.setMessage(_("Updated!"), "done");
  }

  setMessage(message, message_class) {
    clearTimeout(this.message_timer);
    clearTimeout(this.message_fade_timer);
    this.message_fading = false;
    if (message) {
      this.message = message;
      // Cleared on every new message; the progress-bearing states in setRow
      // re-assign it right after their setMessage call. During a fade the old
      // value stays, so the bar doesn't jump while the pill is going out.
      this.message_progress = null;
      this.message_class = message_class != null ? message_class : "";
      this.message_visible = true;
      this.message_collapsed = this.message_class === "error" && !this.show_errors;
      if (this.message_class === "done") {
        this.message_timer = setTimeout((() => {
          return this.setMessage("");
        }), 5000);
      }
    } else if (this.message_visible) {
      // Fade the pill out instead of blinking it off. Keep the text and the
      // colour class through the fade - swapping them mid-transition reads as
      // a second, different pill appearing.
      this.message_fading = true;
      this.message_fade_timer = setTimeout((() => {
        this.message_fading = false;
        this.message_visible = false;
        return Page.projector.scheduleRender();
      }), MESSAGE_FADE_MS);
    } else {
      this.message_class = "";
    }
    return Page.projector.scheduleRender();
  }

  // Drives the spinner over the row's icon. Deliberately excludes the checking
  // phase: at that point we don't know there is anything to do, and a spinner
  // on every row every resync cycle is exactly the noise this flow removes.
  isWorking() {
    var ref;
    return this.row.tasks > 0 || ((ref = this.row.event) != null ? ref[0] : void 0) === "updating" || this.row.update_phase === "updating";
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
    Page.settings.favorite_sites[this.row.address] = true;
    Page.saveSettings();
    Page.site_list.reorder();
    return false;
  }

  handleUnfavoriteClick() {
    this.setFavorite(false);
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
      var root = this.row.content.clone_root;
      if (!root || root === "." || root === "./") root = "";
      return Page.cmd("siteClone", {
        "address": this.row.content.cloned_from,
        "root_inner_path": root,
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
    // Removal takes visible time on a synced xite (locks, durable intent,
    // directory deletion, Store handover): show it immediately. The node
    // pushes the same "deleting" phase on every siteInfo for the duration,
    // so the pill also survives a reload mid-delete.
    this.setMessage(_("Deleting…"), "checking");
    Page.projector.scheduleRender();
    // Wait for the server: only remove the row when the delete actually
    // succeeded, so a refusal (e.g. NoNewSites) leaves the site in place.
    // The node surfaces policy refusals as their own notification.
    Page.cmd("siteDelete", { "address": this.row.address }, (res) => {
      var ref;
      if (res && res.error) {
        this.setMessage(null);
        Page.projector.scheduleRender();
        return false; // refused - keep the row; the node showed why
      }
      if (onSuccess) {
        onSuccess();
      }
      if (Page.site_list && Page.site_list.open_actions_site === this) {
        Page.site_list.open_actions_site = null;
      }
      // Delete the canonical list item: `this` may be a merger's sublist
      // copy, which the item list does not hold.
      this.item_list.deleteItem((ref = this.item_list.items_bykey[this.row.address]) != null ? ref : this);
      return Page.projector.scheduleRender();
    });
    return false;
  }

  // The row's action items, in the same order the old popup menu used.
  // On a group overview row Update / Check files / Pause / Resume / Delete
  // become their "all" variants and cover the parent + its merged xites.
  // The Pause<->Resume flip follows the PARENT's serving state, like any
  // single row. Favorite and Save as .zip stay parent-scoped.
  getActionItems() {
    var items, merged_sites;
    merged_sites = this.getMergedSites();
    items = [];
    if (this.favorite) {
      items.push({label: _("Unfavorite"), icon: "starF", onclick: this.handleUnfavoriteClick});
    } else {
      items.push({label: _("Favorite"), icon: "star", onclick: this.handleFavoriteClick});
    }
    if (merged_sites) {
      items.push({label: _("Update all"), icon: "refresh", onclick: this.handleUpdateAllClick});
      items.push({label: _("Check all files"), icon: "check", onclick: this.handleCheckfilesAllClick});
      if (this.row.settings.serving) {
        items.push({label: _("Pause all"), icon: "pause", onclick: this.handlePauseAllClick});
      } else {
        items.push({label: _("Resume all"), icon: "play", onclick: this.handleResumeAllClick});
      }
    } else {
      items.push({label: _("Update"), icon: "refresh", onclick: this.handleUpdateClick});
      items.push({label: _("Check files"), icon: "check", onclick: this.handleCheckfilesClick});
      if (this.row.settings.serving) {
        items.push({label: _("Pause"), icon: "pause", onclick: this.handlePauseClick});
      } else {
        items.push({label: _("Resume"), icon: "play", onclick: this.handleResumeClick});
      }
    }
    items.push({label: _("Save as .zip"), icon: "zip", href: "/EpixNet-Internal/Zip?address=" + this.row.address});
    if (this.row.content.cloneable === true) {
      items.push({label: _("Clone"), icon: "copy", onclick: this.handleCloneClick});
    }
    if (this.row.settings.own && this.row.content.cloned_from) {
      items.push({sep: true});
      items.push({label: _("Upgrade code"), icon: "upgrade", onclick: this.handleCloneUpgradeClick});
    }
    items.push({sep: true});
    if (merged_sites) {
      items.push({label: _("Delete all"), icon: "trash", danger: true, onclick: this.handleDeleteAllClick});
    } else {
      items.push({label: _("Delete"), icon: "trash", danger: true, onclick: this.handleDeleteClick});
    }
    return items;
  }

  // The "⋯" button: toggles this row's inline action strip. One strip open
  // app-wide, tracked on SiteList so the panel/health screen can fold it.
  handleActionsClick() {
    var list = Page.site_list;
    if (!list) {
      return false;
    }
    if (list.open_actions_site === this) {
      list.open_actions_site = null;
    } else {
      // Single-overlay rule: opening a strip folds any open popup menu
      // (warnings chip, Files helps) and any other row's strip.
      if (window.visible_menu) {
        window.visible_menu.hide();
      }
      list.open_actions_site = this;
    }
    Page.projector.scheduleRender();
    return false;
  }

  // Delegated click on the strip: an item click folds the strip afterwards
  // (parity with the old menu's close-on-select). The item's own handler ran
  // first (child fires before this bubbled call); the zip link keeps its
  // default navigation because nothing here prevents it.
  handleRowActionsClick(e) {
    var node = e.target;
    while (node && node !== e.currentTarget) {
      if (node.classList && node.classList.contains("action-btn")) {
        if (Page.site_list) {
          Page.site_list.closeRowActions();
        }
        return;
      }
      node = node.parentNode;
    }
  }

  renderActions() {
    var children, i, item, items, len;
    if (Page.site_list == null || Page.site_list.open_actions_site !== this) {
      return void 0;
    }
    items = this.getActionItems();
    children = [];
    for (i = 0, len = items.length; i < len; i++) {
      item = items[i];
      if (item.sep) {
        // Separators of the old menu become visual gaps in the strip.
        children.push(h("div.row-actions-sep", {key: "sep" + i}));
        continue;
      }
      children.push(h("a.action-btn", {
        key: item.label,
        href: item.href ? item.href : "#" + item.label,
        classes: {
          danger: !!item.danger
        },
        onclick: item.onclick
      }, [
        h("span.action-icon", {innerHTML: actionIcon(item.icon, 17)}),
        h("span.action-label", [item.label])
      ]));
    }
    return h("div.row-actions", {
      key: "actions",
      onclick: this.handleRowActionsClick,
      enterAnimation: Animation.slideDown,
      exitAnimation: Animation.slideUpInout
    }, children);
  }

  // Stop helping a directory: plain removal. The node's siteInfo push drops
  // the row within a frame, so there is no meaningful "Resume" window - the
  // old toggle-state map went stale and showed re-added directories as
  // stopped.
  handleHelpClick(directory, title) {
    Page.cmd("OptionalHelpRemove", [directory, this.row.address]);
    return false;
  }

  // The Files-page auto-download switch. Optimistic-after-ack: the row shows
  // a pending state until the node answers, then flips. Plain onclick - the
  // old heart menu opened on mousedown and died to the global menu-hide
  // mouseup in the same physical click.
  handleHelpAllClick() {
    if (this.help_all_pending) {
      return false;
    }
    this.help_all_pending = true;
    // A lost ack (websocket drop mid-command) must not disable the switch
    // forever: give up on pending after 10s and let the user retry.
    clearTimeout(this.help_all_timer);
    this.help_all_timer = setTimeout((() => {
      if (this.help_all_pending) {
        this.help_all_pending = false;
        Page.projector.scheduleRender();
      }
    }), 10000);
    var want = this.row.settings.autodownloadoptional !== true;
    Page.cmd("OptionalHelpAll", [want, this.row.address], (res) => {
      clearTimeout(this.help_all_timer);
      this.help_all_pending = false;
      if (res && res.error) {
        // The node refused: keep the real state, say why.
        Page.cmd("wrapperNotification", ["error", res.error]);
        return Page.projector.scheduleRender();
      }
      this.row.settings.autodownloadoptional = want;
      // Hold the acked value against in-flight siteList snapshots queued
      // before the toggle - one of those landing now would flip the switch
      // back for a moment.
      this.help_all_value = want;
      this.help_all_hold_until = Date.now() + 4000;
      return Page.projector.scheduleRender();
    });
    Page.projector.scheduleRender();
    return false;
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

  // The row marker: the xite's declared favicon when it loads, else a
  // letter tile in the address' brand-color bucket. "Epix Talk" -> T,
  // "EpixScreen" -> S: the brand prefix carries no identity, so the tile
  // letter comes from the distinctive word instead.
  renderMarker() {
    var content, letter, m, name;
    content = this.row.content || {};
    if (content.favicon && !this.favicon_failed) {
      return h("img.favicon", {
        src: "/" + this.row.address + "/" + content.favicon,
        alt: "",
        onerror: this.handleFaviconError
      });
    }
    name = content.title || this.row.address;
    m = /^Epix\s*(.)/.exec(name);
    letter = ((m ? m[1] : name.charAt(0)) || "?").toUpperCase();
    return h("div.tile." + Text.toBrandClass(this.row.address), {
      "aria-hidden": "true"
    }, [letter]);
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
    var actions_open, merged_expander, merged_stats, now, peers_value, ref, stat_value;
    now = Date.now() / 1000;
    merged_expander = this.renderMergedExpander();
    // A merger's row is the group overview: the newest update time across
    // the group and everyone's peers summed (own size). Its own numbers show
    // on its individual line inside the expanded sublist.
    merged_stats = merged_expander ? this.merged_stats : null;
    actions_open = Page.site_list != null && Page.site_list.open_actions_site === this;
    peers_value = merged_stats ? merged_stats.peers : Math.max((this.row.settings.peers ? this.row.settings.peers : 0), this.row.peers);
    if (Page.settings.sites_orderby === "size") {
      stat_value = ((this.row.settings.size + (this.row.settings.size_optional || 0)) / 1024 / 1024).toFixed(1) + "MB";
    } else {
      stat_value = Time.sinceShort(merged_stats ? merged_stats.modified : this.row.settings.modified);
    }
    return h("div.site", {
      key: this.key,
      "data-key": this.key,
      classes: {
        "modified-lastday": now - (merged_stats ? merged_stats.modified : this.row.settings.modified) < 60 * 60 * 24,
        "disabled": !this.row.settings.serving && !this.row.demo,
        "working": this.isWorking(),
        "has-merged": !!merged_expander,
        "actions-open": actions_open
      }
    }, this.renderMarker(), h("a.inner", {
      href: this.getHref(),
      title: ((ref = this.row.content.title) != null ? ref.length : void 0) > 20 ? this.row.content.title : void 0
    }, [
      h("div.title-line", [
        h("span.title", [this.row.content.title || this.row.address]),
        this.favorite ? h("span.fav-star", {
          key: "fav",
          "aria-hidden": "true",
          innerHTML: actionIcon("starF", 13)
        }) : void 0,
        (Page.notification_counts && Page.notification_counts[this.row.address] > 0)
          ? h("span.site-unread-badge", {key: "unread"}, Page.notification_counts[this.row.address] > 99 ? "99+" : String(Page.notification_counts[this.row.address]))
          : void 0,
        merged_expander
      ]), h("div.details", [
        // The meta pair is one collapsible unit: display:contents normally
        // (layout as if unwrapped), a shrinkable ellipsizing block in the
        // compact list so it gives way to the pill as a whole. Old-dashboard
        // icon treatment: clock + date, person + count - the word "peers"
        // was the space hog on every row.
        h("span.dmeta", [
          h("span.modified", [
            h("span.mic", {innerHTML: actionIcon("clock", 12)}),
            stat_value
          ]),
          h("span.peers", {title: peers_value + _(" peers")}, [
            formatPeers(peers_value),
            h("span.mic", {innerHTML: actionIcon("person", 12)})
          ])
        ]),
        // The message pill is pushed flush right on the meta line (margin-left:
        // auto) so it sits opposite the date instead of on top of it. It
        // shrinks with an ellipsis when the row is too narrow for both.
        h("div.message", {
          classes: {
            visible: this.message_visible,
            fading: this.message_fading,
            done: this.message_class === 'done',
            error: this.message_class === 'error',
            checking: this.message_class === 'checking',
            collapsed: this.message_collapsed
          },
          title: this.message || undefined
        }, [
          // Progress fill behind the label, tinted from the pill's own ink so
          // it works on every colour without per-state rules. Absent (not 0%)
          // when the phase has nothing countable.
          this.message_progress != null ? h("span.mbar", {
            styles: {width: Math.round(this.message_progress * 100) + "%"}
          }) : void 0,
          h("span.mtext", [this.message])
        ])
      ]), this.row.demo ? h("div.details.demo", "Activate \u00BB") : void 0, this.row.need_limit ? h("a.details.needaction", {
        href: "#Set+limit",
        onclick: this.handleLimitIncreaseClick
      }, "Set limit to " + this.row.need_limit + "MB") : void 0
    ]), h("a.settings", {
      href: "#Actions",
      "aria-label": _("Actions"),
      "aria-expanded": actions_open ? "true" : "false",
      onclick: this.handleActionsClick
    }, [h("span.action-icon", {innerHTML: actionIcon(actions_open ? "chevronUp" : "dots", 20)})]), this.renderActions());
  }

  // A .fact chip (same anatomy the Stats mini panels use: label + optional
  // status dot / mini meter + value).
  renderFact(fact) {
    return h("span.fact", {
      key: fact.key,
      title: fact.tip,
      classes: {
        "fact-ok": fact.ink === "ok",
        "fact-warn": fact.ink === "warn",
        "fact-bad": fact.ink === "bad"
      }
    }, [
      fact.ink ? h("span.fact-dot", {"aria-hidden": "true"}) : void 0,
      fact.dot ? h("span.kdot." + fact.dot, {"aria-hidden": "true"}) : void 0,
      h("span.fact-label", fact.label),
      fact.meter ? h("span.fact-meter", [
        h("span.fact-meter-fill", {
          styles: {
            width: Math.min(100, Math.round(fact.meter.num / Math.max(1, fact.meter.den) * 100)) + "%"
          }
        })
      ]) : void 0,
      h("span.fact-value", fact.value)
    ]);
  }

  // The share-ratio ring, kept by request - the glanceable gauge the old
  // dashboard had, with its bugs fixed: it now carries a label, the arc is
  // ratio/(ratio+1) so empty = taking only, HALF ring = break-even, full =
  // pure giving (the old dash math drew a FULL ring at 0.0), and the color is
  // amber below 1 / teal at 1+ instead of a hue ramp that started at alarm
  // red and wrapped past 360.
  renderRatioRing() {
    var sent, recv, has, ratio, display, frac, offset, cls;
    sent = this.row.settings.bytes_sent || 0;
    recv = this.row.settings.bytes_recv || 0;
    has = sent > 0 || recv > 0;
    ratio = recv > 0 ? sent / recv : (sent > 0 ? Infinity : 0);
    if (!has) {
      display = "\u2013";
    } else if (ratio === Infinity || ratio >= 100) {
      display = "\u221E";
    } else if (ratio >= 10) {
      display = ratio.toFixed(0);
    } else {
      display = ratio.toFixed(1);
    }
    frac = !has ? 0 : (ratio === Infinity ? 1 : ratio / (ratio + 1));
    // r=12 -> circumference 75.4; offset counts down from empty to full.
    offset = 75.4 * (1 - frac);
    cls = !has ? "r-idle" : (ratio >= 1 ? "r-good" : "r-low");
    return h("span.ratio-ring." + cls, {
      key: "ratio",
      title: _("Share ratio: uploaded vs downloaded for this xite. Half ring = break-even.")
    }, [
      h("span.rr-label", _("Ratio")),
      h("span.rr-wrap", [
        h("span.rr-gauge", {
          innerHTML: '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle r="12" cx="15" cy="15" fill="transparent" class="rr-bg"></circle><circle r="12" cx="15" cy="15" fill="transparent" class="rr-fg" style="stroke-dashoffset: ' + offset.toFixed(1) + '"></circle></svg>'
        }),
        h("span.rr-value", display)
      ])
    ]);
  }

  getSeedStopHandler(directory, title) {
    var base;
    return (base = this.seed_stop_handlers)[directory] != null ? base[directory] : base[directory] = (() => {
      this.handleHelpClick(directory, title);
      return false;
    });
  }

  // The seed row: an explicit labeled switch for "auto-download everything
  // new", then each optionalHelp folder commitment as a visible row with a
  // Stop action - replacing the share/heart/chevron cluster whose dropdown
  // died to a mousedown/mouseup race before it could be read.
  renderSeedRow() {
    var auto, dirs, shown, hidden;
    auto = this.row.settings.autodownloadoptional === true;
    dirs = this.optional_helps;
    shown = this.seed_expanded ? dirs : dirs.slice(0, 3);
    hidden = dirs.length - shown.length;
    return h("div.seedrow", {key: "seedrow"}, [
      h("a.switchrow", {
        href: "#Auto-download",
        role: "switch",
        "aria-checked": auto ? "true" : "false",
        onclick: this.handleHelpAllClick,
        classes: {
          pending: this.help_all_pending
        }
      }, [
        h("span.sw-label", [
          _("Auto-download new optional files"),
          h("span.sw-hint", _("Fetch and seed every optional file this xite publishes"))
        ]),
        h("span.switch")
      ]),
      auto ? (dirs.length ? h("div.seed-note", _("Seeding everything new") + " \u00B7 " + dirs.length + " " + _("folder commitments")) : void 0) : [
        shown.map((pair) => {
          var directory = pair[0], title = pair[1];
          return h("div.seed-dir", {key: directory}, [
            h("span.fact-dot.sd-on", {"aria-hidden": "true"}),
            h("span.sd-title", {title: directory}, title || directory),
            h("a.sd-stop", {
              href: "#Stop",
              onclick: this.getSeedStopHandler(directory, title)
            }, _("Stop"))
          ]);
        }),
        hidden > 0 ? h("a.sd-more", {
          href: "#More",
          onclick: this.handleSeedExpandClick
        }, "+" + hidden + " " + _("more")) : void 0,
        this.seed_expanded && dirs.length > 3 ? h("a.sd-more", {
          href: "#Less",
          onclick: this.handleSeedExpandClick
        }, _("Show less")) : void 0
      ]
    ]);
  }

  renderOptionalStats() {
    var row, facts;
    row = this.row;
    facts = [
      {
        key: "content",
        label: _("Content"),
        value: Text.formatSize(row.settings.size) || "0 B",
        meter: {
          num: row.settings.size,
          den: row.size_limit * 1024 * 1024
        },
        tip: _("Xite size limit: ") + (Text.formatSize(row.size_limit * 1024 * 1024))
      }, {
        key: "optional",
        label: _("Optional"),
        value: (Text.formatSize(row.settings.optional_downloaded) || "0 B") + " " + _("of") + " " + (Text.formatSize(row.settings.size_optional) || "0 B"),
        meter: {
          num: row.settings.optional_downloaded,
          den: row.settings.size_optional
        },
        tip: _("Optional files downloaded from this xite")
      }, {
        key: "sent",
        label: _("Sent"),
        dot: "kd-out",
        value: Text.formatSize(row.settings.bytes_sent) || "0 B"
      }, {
        key: "recv",
        label: _("Received"),
        dot: "kd-in",
        value: Text.formatSize(row.settings.bytes_recv) || "0 B"
      }
    ];
    if (row.need_limit) {
      facts.push({
        key: "needlimit",
        label: _("Running out of space"),
        value: _("Set limit to ") + row.need_limit + "MB",
        ink: "warn"
      });
    }
    return h("div.site.spanel.fpanel", {
      key: this.key
    }, [
      h("div.phead", [
        h("a.fname", {
          href: this.getHref()
        }, row.content.title || row.address),
        h("span.ph-right", [
          this.renderRatioRing(),
          h("span.pval", (Text.formatSize(row.settings.optional_downloaded) || "0 B") + " " + _("optional"))
        ])
      ]),
      h("div.pfacts", facts.map(this.renderFact)),
      this.renderSeedRow(),
      this.files.render()
    ]);
  }
}

Object.assign(Site.prototype, LogMixin);
window.Site = Site;

})();
