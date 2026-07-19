(function() {

  class Menu {
    constructor() {
      this.render = this.render.bind(this);
      this.getStyle = this.getStyle.bind(this);
      this.renderItem = this.renderItem.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.getDirection = this.getDirection.bind(this);
      this.storeNode = this.storeNode.bind(this);
      this.toggle = this.toggle.bind(this);
      this.hide = this.hide.bind(this);
      this.show = this.show.bind(this);
      this.visible = false;
      this.items = [];
      this.node = null;
      this.height = 0;
      this.direction = "bottom";
      // When the menu lives inside a scroll/overflow container (the dashboard
      // site list sits in `.left`, which is `overflow-y: auto`), an absolutely
      // positioned menu is clipped by that container - its lower items (Delete)
      // get chopped off. In that case we position it `fixed` to the viewport,
      // anchored to its button, so it escapes the clip. `anchor` is the element
      // it opens from (the "⋮" button), measured fresh each open.
      this.clipped = false;
      this.anchor = null;
      this.onScrollHide = this.onScrollHide.bind(this);
    }

    show() {
      if (window.visible_menu) {
        window.visible_menu.hide();
      }
      this.visible = true;
      window.visible_menu = this;
      this.measure();
      this.direction = this.getDirection();
      // A fixed menu detaches from its button when the page scrolls, so close
      // it on any scroll (capture: catches scrolling ancestors too).
      window.addEventListener("scroll", this.onScrollHide, true);
    }

    hide() {
      this.visible = false;
      window.removeEventListener("scroll", this.onScrollHide, true);
    }

    onScrollHide() {
      if (this.visible) {
        this.hide();
        Page.projector.scheduleRender();
      }
    }

    // Measure the menu's full height and decide whether it needs to escape a
    // clipping ancestor. Safe to call before the node exists (no-op then).
    measure() {
      if (!this.node) {
        return;
      }
      this.node.style.maxHeight = "none";
      this.height = this.node.offsetHeight;
      this.node.style.maxHeight = "";
      this.clipped = this.detectClip();
      // The "⋮" button the menu renders right after; fall back to the row.
      this.anchor = this.node.previousElementSibling || this.node.parentNode;
    }

    // Only the dashboard site-list row menus are clipped (they live in `.left`,
    // an overflow scroll container); other menus - Dashboard/network, Head -
    // are positioned deliberately and must keep their absolute behavior. Bail
    // if a transform/perspective/will-change on an ancestor would trap
    // `position: fixed` (it would be positioned relative to that box, not the
    // viewport, so the escape wouldn't work).
    detectClip() {
      if (!this.node || !this.node.closest || !this.node.closest(".SiteList")) {
        return false;
      }
      var el = this.node.parentNode;
      while (el && el.nodeType === 1 && el !== document.body) {
        var cs = window.getComputedStyle(el);
        if (cs.transform !== "none" || cs.perspective !== "none" || cs.willChange === "transform") {
          return false;
        }
        el = el.parentNode;
      }
      return true;
    }

    toggle() {
      if (this.visible) {
        this.hide();
      } else {
        this.show();
      }
      Page.projector.scheduleRender();
    }

    addItem(title, cb, selected) {
      if (selected == null) {
        selected = false;
      }
      this.items.push([title, cb, selected]);
    }

    storeNode(node) {
      this.node = node;
      if (this.visible) {
        node.className = node.className.replace("visible", "");
        var self = this;
        this.measure();
        this.direction = this.getDirection();
        node.style.maxHeight = "0px";
        setTimeout(function() {
          node.className += " visible";
          node.attributes.style.value = self.getStyle();
        }, 20);
      }
    }

    getDirection() {
      if (!this.node || !this.anchor) {
        return "bottom";
      }
      // Flip the menu upward when opening downward would run it past the bottom
      // of the VISIBLE viewport - and only if there's room above. Uses the
      // anchor (the button) so it's correct whether the menu is absolute or
      // fixed; window.innerHeight (not body.clientHeight, which is the tall
      // scroll container) is what actually bounds the visible area.
      var rect = this.anchor.getBoundingClientRect();
      var viewport = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom + this.height + 20 > viewport && rect.top - this.height > 0) {
        return "top";
      } else {
        return "bottom";
      }
    }

    handleClick(e) {
      var keep_menu = false;
      var ref = this.items;
      for (var i = 0; i < ref.length; i++) {
        var item = ref[i];
        var title = item[0], cb = item[1], selected = item[2];
        if (title === e.currentTarget.textContent || e.currentTarget["data-title"] === title) {
          keep_menu = typeof cb === "function" ? cb(item) : undefined;
          break;
        }
      }
      if (keep_menu !== true && cb !== null) {
        this.hide();
      }
      return false;
    }

    renderItem(item) {
      var title = item[0], cb = item[1], selected = item[2];
      if (typeof selected === "function") {
        selected = selected();
      }
      if (title === "---") {
        return h("div.menu-item-separator", {
          key: Time.timestamp()
        });
      } else {
        var href, onclick;
        if (cb === null) {
          href = undefined;
          onclick = this.handleClick;
        } else if (typeof cb === "string") {
          href = cb;
          onclick = true;
        } else {
          href = "#" + title;
          onclick = this.handleClick;
        }
        var classes = {
          "selected": selected,
          "noaction": cb === null
        };
        return h("a.menu-item", {
          href: href,
          onclick: onclick,
          "data-title": title,
          key: title,
          classes: classes
        }, title);
      }
    }

    getStyle() {
      var max_height = this.visible ? this.height : 0;
      var style = "max-height: " + max_height + "px";
      if (this.direction === "top") {
        style += ";margin-top: " + (0 - this.height - 50) + "px";
      } else {
        style += ";margin-top: 0px";
      }
      // Escape a clipping ancestor by pinning to the viewport at the button's
      // position (the CSS `left: 99%` / transforms still align it leftward from
      // the anchor's right edge, so it looks identical - just un-clipped).
      if (this.clipped && this.anchor) {
        var rect = this.anchor.getBoundingClientRect();
        style += ";position: fixed;left: " + rect.right + "px;top: " + rect.bottom + "px";
      }
      return style;
    }

    render(class_name) {
      if (class_name == null) {
        class_name = "";
      }
      if (this.visible || this.node) {
        return h("div.menu" + class_name, {
          classes: {
            "visible": this.visible
          },
          style: this.getStyle(),
          afterCreate: this.storeNode
        }, this.items.map(this.renderItem));
      }
    }
  }

  window.Menu = Menu;

  document.body.addEventListener("mouseup", function(e) {
    if (!window.visible_menu || !window.visible_menu.node) {
      return false;
    }
    var menu_node = window.visible_menu.node;
    var menu_parents = [menu_node, menu_node.parentNode];
    if (menu_parents.indexOf(e.target.parentNode) < 0 && menu_parents.indexOf(e.target.parentNode.parentNode) < 0) {
      window.visible_menu.hide();
      Page.projector.scheduleRender();
    }
  });

})();
