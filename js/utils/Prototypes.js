(function() {

  String.prototype.startsWith = function(s) {
    return this.slice(0, s.length) === s;
  };

  String.prototype.endsWith = function(s) {
    return s === '' || this.slice(-s.length) === s;
  };

  String.prototype.repeat = function(count) {
    return new Array(count + 1).join(this);
  };

  String.prototype.capitalize = function() {
    if (this.length) {
      return this[0].toUpperCase() + this.slice(1);
    } else {
      return "";
    }
  };

  window.isEmpty = function(obj) {
    for (var key in obj) {
      return false;
    }
    return true;
  };

})();
