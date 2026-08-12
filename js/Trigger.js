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
        "aria-label": "Menu",
        "aria-expanded": this.active ? "true" : "false",
        onclick: this.handleToggleClick,
        ontouchend: ""
      }, [this.renderIconHamburger()]),
      h("a.Trigger-backdrop", {
        "href": "#Close",
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
