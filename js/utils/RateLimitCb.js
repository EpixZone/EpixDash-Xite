(function() {

  var last_time = {};
  var calling = {};
  var calling_iterval = {};
  var call_after_interval = {};

  window.RateLimitCb = function(interval, fn, args) {
    if (args == null) {
      args = [];
    }
    var cb = function() {
      var left = interval - (Date.now() - last_time[fn]);
      if (left <= 0) {
        delete last_time[fn];
        if (calling[fn]) {
          RateLimitCb(interval, fn, calling[fn]);
        }
        delete calling[fn];
      } else {
        setTimeout(function() {
          delete last_time[fn];
          if (calling[fn]) {
            RateLimitCb(interval, fn, calling[fn]);
          }
          delete calling[fn];
        }, left);
      }
    };
    if (last_time[fn]) {
      calling[fn] = args;
    } else {
      last_time[fn] = Date.now();
      fn.apply(this, [cb].concat(Array.prototype.slice.call(args)));
    }
  };

  window.RateLimit = function(interval, fn) {
    if (calling_iterval[fn] > interval) {
      clearInterval(calling[fn]);
      delete calling[fn];
    }
    if (!calling[fn]) {
      call_after_interval[fn] = false;
      fn();
      calling_iterval[fn] = interval;
      calling[fn] = setTimeout(function() {
        if (call_after_interval[fn]) {
          fn();
        }
        delete calling[fn];
        delete call_after_interval[fn];
      }, interval);
    } else {
      call_after_interval[fn] = true;
    }
  };

})();
