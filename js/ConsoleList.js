(function() {

class ConsoleList {
  constructor() {
    this.show = this.show.bind(this);
    this.render = this.render.bind(this);
    this.renderLogs = this.renderLogs.bind(this);
    this.storeNode = this.storeNode.bind(this);
    this.afterUpdate = this.afterUpdate.bind(this);
    this.handleHideClick = this.handleHideClick.bind(this);
    this.handleRefreshClick = this.handleRefreshClick.bind(this);
    this.update = this.update.bind(this);
    this.logs = null;
    this.visible = false;
    this.max_height = 0;
    this.updated = false;
  }

  update() {
    this.need_update = false;

    // First try to get logs from Page.server_errors if available
    if (Page.server_errors && Page.server_errors.length > 0) {
      this.logs = [];
      for (var i = 0; i < Page.server_errors.length; i++) {
        var error = Page.server_errors[i];
        this.logs.push({
          date_added: Date.now() / 1000,
          level: "ERROR",
          message: error.title + (error.descr ? ": " + error.descr : ""),
          time_display: error.title[0] || "Recently"
        });
      }
      this.logs.reverse(); // Show newest first
      if (!this.max_height) {
        this.max_height = 100;
      }
      this.updated = true;
      return Page.projector.scheduleRender();
    }

    // Fallback to serverErrors command
    Page.cmd("serverErrors", {}, (server_errors) => {
      console.log("serverErrors response:", server_errors); // Debug log
      var date_added, i, len, level, message, ref;
      this.logs = [];

      // If no server errors, add some useful server info
      if (!server_errors || server_errors.length === 0) {
        var now = Date.now() / 1000;
        this.logs.push({
          date_added: now,
          level: "INFO",
          message: "Console opened - EpixNet v" + (Page.server_info ? Page.server_info.version : "unknown") + " running",
          time_display: "Now"
        });

        if (Page.server_info) {
          this.logs.push({
            date_added: now - 1,
            level: "INFO",
            message: "Server info: " + Page.server_info.sites + " sites, " + Page.server_info.connections + " connections",
            time_display: "Now"
          });

          if (Page.server_info.tor_enabled) {
            this.logs.push({
              date_added: now - 2,
              level: "INFO",
              message: "Tor status: " + (Page.server_info.tor_status || "enabled"),
              time_display: "Now"
            });
          }

          this.logs.push({
            date_added: now - 3,
            level: "INFO",
            message: "Port status: " + Page.server_info.fileserver_port + " (" + (Page.server_info.port_opened ? "opened" : "closed") + ")",
            time_display: "Now"
          });
        }

        // Add a note about what this console shows
        this.logs.push({
          date_added: now - 4,
          level: "INFO",
          message: "This console shows server errors and status information. No errors currently logged.",
          time_display: "Now"
        });
      } else {
        for (i = 0, len = server_errors.length; i < len; i++) {
          ref = server_errors[i], date_added = ref[0], level = ref[1], message = ref[2];
          this.logs.push({
            date_added: date_added,
            level: level,
            message: message,
            time_display: Time.since(date_added)
          });
        }
      }

      this.logs.reverse(); // Show newest first
      if (!this.max_height) {
        this.max_height = 100;
      }
      this.updated = true;
      return Page.projector.scheduleRender();
    });
  }

  handleHideClick() {
    this.visible = false;
    this.max_height = 0;
    Page.projector.scheduleRender();
    return false;
  }

  handleRefreshClick() {
    this.need_update = true;
    Page.projector.scheduleRender();
    return false;
  }

  afterUpdate() {
    this.updated = false;
    if (this.node && this.visible) {
      this.max_height = this.node.offsetHeight + 100;
      return Page.projector.scheduleRender();
    }
  }

  storeNode(node) {
    return this.node = node;
  }

  renderLogs() {
    return h("div.logs", [
      h("div.log.log-head", [
        h("div.log-col", { style: "width: 15%" }, "Time"),
        h("div.log-col", { style: "width: 10%" }, "Level"),
        h("div.log-col", { style: "width: 75%" }, "Message")
      ]),
      this.logs.map((log) => {
        return h("div.log", {
          key: log.date_added + log.message,
          classes: {
            "log-error": log.level === "ERROR",
            "log-warning": log.level === "WARNING",
            "log-info": log.level === "INFO"
          }
        }, [
          h("div.log-col", { style: "width: 15%" }, log.time_display),
          h("div.log-col", { style: "width: 10%" }, log.level),
          h("div.log-col", { style: "width: 75%" }, log.message)
        ]);
      })
    ]);
  }

  render() {
    if (this.need_update) {
      this.update();
    }
    if (!this.logs) {
      return h("div#ConsoleList", {
        classes: {
          visible: false
        }
      }, "Loading console...");
    }
    if (this.updated) {
      this.updated = false;
      setTimeout(this.afterUpdate);
    }
    return h("div#ConsoleList", {
      classes: {
        visible: this.visible
      },
      style: "max-height: " + this.max_height + "px"
    }, [
      h("div.console-header", [
        h("a.console-hide", {
          onclick: this.handleHideClick
        }, "\u2039 Back to dashboard"),
        h("a.console-refresh", {
          onclick: this.handleRefreshClick,
          style: "float: right; margin-right: 30px;"
        }, "\u21BB Refresh")
      ]),
      this.logs.length === 0 ?
        h("div.console-empty", "No console logs available.") :
        h("div", {
          afterCreate: this.storeNode
        }, [this.renderLogs()])
    ]);
  }

  show() {
    this.visible = true;
    this.need_update = true;
    return Page.projector.scheduleRender();
  }
}

Object.assign(ConsoleList.prototype, LogMixin);
window.ConsoleList = ConsoleList;

})();
