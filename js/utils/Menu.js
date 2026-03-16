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
    }

    show() {
      if (window.visible_menu) {
        window.visible_menu.hide();
      }
      this.visible = true;
      window.visible_menu = this;
      this.direction = this.getDirection();
    }

    hide() {
      this.visible = false;
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
        setTimeout(function() {
          node.className += " visible";
          node.attributes.style.value = self.getStyle();
        }, 20);
        node.style.maxHeight = "none";
        this.height = node.offsetHeight;
        node.style.maxHeight = "0px";
        this.direction = this.getDirection();
      }
    }

    getDirection() {
      if (this.node && this.node.parentNode.getBoundingClientRect().top + this.height + 60 > document.body.clientHeight && this.node.parentNode.getBoundingClientRect().top - this.height > 0) {
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
      var max_height;
      if (this.visible) {
        max_height = this.height;
      } else {
        max_height = 0;
      }
      var style = "max-height: " + max_height + "px";
      if (this.direction === "top") {
        style += ";margin-top: " + (0 - this.height - 50) + "px";
      } else {
        style += ";margin-top: 0px";
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
