(function() {

class Trigger {
  constructor() {
    this.render = this.render.bind(this);
    this.handleTitleClick = this.handleTitleClick.bind(this);
    this.active = false;
  }

  handleTitleClick() {
    this.active = !this.active;
    if (this.active) {
      document.getElementById("left").classList.add("trigger-on");
    } else {
      document.getElementById("left").classList.remove("trigger-on");
    }
    return false;
  }

  render() {
    return h("div.Trigger", {
      classes: {
        "active": this.active
      }
    }, [
      // Backdrop behind the open drawer; clicking it closes the drawer.
      // Only visible on small screens via css (.Trigger-backdrop).
      h("a.Trigger-backdrop", {
        "href": "#Trigger",
        onclick: this.handleTitleClick,
        ontouchend: ""
      }),
      h("a.icon", {
        "href": "#Trigger",
        onclick: this.handleTitleClick,
        ontouchend: ""
      }, h("div.arrow-right"))
    ]);
  }
}

Object.assign(Trigger.prototype, LogMixin);
window.Trigger = Trigger;

})();
