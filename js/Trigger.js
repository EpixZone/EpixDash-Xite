(function() {

// The panel host: renders the fixed hamburger toggle, the backdrop and THE
// panel - the app's only overlay. Panel item
// content comes from Head.renderPanelContent so all the gating logic stays
// in one place.
class Trigger {
  constructor() {
    this.render = this.render.bind(this);
    this.handleToggleClick = this.handleToggleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.active = false;
    document.addEventListener("keydown", this.handleKeydown);
  }

  open() {
    this.active = true;
    // The panel always opens on the main settings list, not wherever the
    // language subview was left last time.
    if (Page.head) {
      Page.head.lang_open = false;
    }
    // Opening the only overlay closes every lesser transient surface.
    if (window.visible_menu) {
      window.visible_menu.hide();
    }
    if (Page.site_list && Page.site_list.closeRowActions) {
      Page.site_list.closeRowActions();
    }
    return Page.projector.scheduleRender();
  }

  close() {
    if (!this.active) {
      return;
    }
    this.active = false;
    // The focused element is inside the panel that just left; hand focus
    // back to the toggle so keyboard users are not dropped on body.
    setTimeout(function() {
      var el = document.querySelector("#Trigger .icon, .Trigger .icon");
      if (el && document.activeElement === document.body) {
        el.focus();
      }
    }, 80);
    return Page.projector.scheduleRender();
  }

  handleToggleClick() {
    if (this.active) {
      this.close();
    } else {
      this.open();
    }
    return false;
  }

  handleKeydown(e) {
    if (e.key !== "Escape") {
      return;
    }
    if (this.active) {
      this.close();
    } else if (Page.dashboard && Page.dashboard.health_open) {
      Page.dashboard.closeHealth();
    }
  }

  renderIconHamburger() {
    return h("svg", {
      width: "20", height: "20", viewBox: "0 0 20 20", fill: "none",
      "aria-hidden": "true"
    }, [
      h("path", {
        d: "M3 5h14M3 10h14M3 15h14",
        stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round"
      })
    ]);
  }

  render() {
    return h("div.Trigger", {
      classes: {
        "active": this.active
      }
    }, [
      // The fixbutton corner mask: keeps the exclusion zone (viewport
      // top-right, y 0..64) plain page background in every scrolled state.
      h("div.corner-mask", {"aria-hidden": "true"}),
      h("a.icon", {
        "href": "#Menu",
        "aria-label": _("Menu"),
        "aria-expanded": this.active ? "true" : "false",
        onclick: this.handleToggleClick,
        ontouchend: ""
      }, [this.renderIconHamburger()]),
      // Click-only scrim: keyboard users close with Escape or the panel's
      // own close button, so keep it out of the tab order and the tree.
      h("a.Trigger-backdrop", {
        "href": "#Close",
        tabindex: "-1",
        "aria-hidden": "true",
        onclick: this.handleToggleClick,
        ontouchend: ""
      }),
      h("aside.panel", {
        "aria-hidden": this.active ? "false" : "true"
      }, Page.head ? Page.head.renderPanelContent(this) : [])
    ]);
  }
}

Object.assign(Trigger.prototype, LogMixin);
window.Trigger = Trigger;

})();
