(function() {

  class Time {
    since(timestamp) {
      var now = +(new Date) / 1000;
      if (timestamp > 1000000000000) {
        timestamp = timestamp / 1000;
      }
      var secs = now - timestamp;
      var back;
      if (secs < 60) {
        back = _("Just now");
      } else if (secs < 60 * 60) {
        var minutes = Math.round(secs / 60);
        back = "" + minutes + _(" minutes ago");
      } else if (secs < 60 * 60 * 24) {
        back = (Math.round(secs / 60 / 60)) + _(" hours ago");
      } else if (secs < 60 * 60 * 24 * 3) {
        back = (Math.round(secs / 60 / 60 / 24)) + _(" days ago");
      } else {
        back = _("on ") + this.date(timestamp);
      }
      back = back.replace(/^1 ([a-z]+)s/, "1 $1");
      return back;
    }

    dateIso(timestamp) {
      if (timestamp == null) timestamp = null;
      if (!timestamp) {
        timestamp = window.Time.timestamp();
      }
      if (timestamp > 1000000000000) {
        timestamp = timestamp / 1000;
      }
      var tzoffset = (new Date()).getTimezoneOffset() * 60;
      return (new Date((timestamp - tzoffset) * 1000)).toISOString().split("T")[0];
    }

    date(timestamp, format) {
      if (timestamp == null) timestamp = null;
      if (format == null) format = "short";
      if (!timestamp) {
        timestamp = window.Time.timestamp();
      }
      if (timestamp > 1000000000000) {
        timestamp = timestamp / 1000;
      }
      var parts = (new Date(timestamp * 1000)).toString().split(" ");
      var display;
      if (format === "short") {
        display = parts.slice(1, 4);
      } else if (format === "day") {
        display = parts.slice(1, 3);
      } else if (format === "month") {
        display = [parts[1], parts[3]];
      } else if (format === "long") {
        display = parts.slice(1, 5);
      }
      return display.join(" ").replace(/( [0-9]{4})/, ",$1");
    }

    weekDay(timestamp) {
      if (timestamp > 1000000000000) {
        timestamp = timestamp / 1000;
      }
      return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][(new Date(timestamp * 1000)).getDay()];
    }

    timestamp(date) {
      if (date == null) date = "";
      if (date === "now" || date === "") {
        return parseInt(+(new Date) / 1000);
      } else {
        return parseInt(Date.parse(date) / 1000);
      }
    }
  }

  window.Time = new Time();

})();
