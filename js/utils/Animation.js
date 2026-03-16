(function() {

  class Animation {
    slideDown(elem, props) {
      if (elem.offsetTop > 1000) {
        return;
      }
      var h = elem.offsetHeight;
      var cstyle = window.getComputedStyle(elem);
      var margin_top = cstyle.marginTop;
      var margin_bottom = cstyle.marginBottom;
      var padding_top = cstyle.paddingTop;
      var padding_bottom = cstyle.paddingBottom;
      var transition = cstyle.transition;
      elem.style.boxSizing = "border-box";
      elem.style.overflow = "hidden";
      elem.style.transform = "scale(0.6)";
      elem.style.opacity = "0";
      elem.style.height = "0px";
      elem.style.marginTop = "0px";
      elem.style.marginBottom = "0px";
      elem.style.paddingTop = "0px";
      elem.style.paddingBottom = "0px";
      elem.style.transition = "none";
      setTimeout(function() {
        elem.className += " animate-inout";
        elem.style.height = h + "px";
        elem.style.transform = "scale(1)";
        elem.style.opacity = "1";
        elem.style.marginTop = margin_top;
        elem.style.marginBottom = margin_bottom;
        elem.style.paddingTop = padding_top;
        elem.style.paddingBottom = padding_bottom;
      }, 1);
      elem.addEventListener("transitionend", function handler() {
        elem.classList.remove("animate-inout");
        elem.style.transition = elem.style.transform = elem.style.opacity = elem.style.height = null;
        elem.style.boxSizing = elem.style.marginTop = elem.style.marginBottom = null;
        elem.style.paddingTop = elem.style.paddingBottom = elem.style.overflow = null;
        elem.removeEventListener("transitionend", handler, false);
      });
    }

    slideUp(elem, remove_func, props) {
      if (elem.offsetTop > 1000) {
        return remove_func();
      }
      elem.className += " animate-back";
      elem.style.boxSizing = "border-box";
      elem.style.height = elem.offsetHeight + "px";
      elem.style.overflow = "hidden";
      elem.style.transform = "scale(1)";
      elem.style.opacity = "1";
      elem.style.pointerEvents = "none";
      setTimeout(function() {
        elem.style.height = "0px";
        elem.style.marginTop = "0px";
        elem.style.marginBottom = "0px";
        elem.style.paddingTop = "0px";
        elem.style.paddingBottom = "0px";
        elem.style.transform = "scale(0.8)";
        elem.style.borderTopWidth = "0px";
        elem.style.borderBottomWidth = "0px";
        elem.style.opacity = "0";
      }, 1);
      elem.addEventListener("transitionend", function handler(e) {
        if (e.propertyName === "opacity" || e.elapsedTime >= 0.6) {
          elem.removeEventListener("transitionend", handler, false);
          remove_func();
        }
      });
    }

    slideUpInout(elem, remove_func, props) {
      elem.className += " animate-inout";
      elem.style.boxSizing = "border-box";
      elem.style.height = elem.offsetHeight + "px";
      elem.style.overflow = "hidden";
      elem.style.transform = "scale(1)";
      elem.style.opacity = "1";
      elem.style.pointerEvents = "none";
      setTimeout(function() {
        elem.style.height = "0px";
        elem.style.marginTop = "0px";
        elem.style.marginBottom = "0px";
        elem.style.paddingTop = "0px";
        elem.style.paddingBottom = "0px";
        elem.style.transform = "scale(0.8)";
        elem.style.borderTopWidth = "0px";
        elem.style.borderBottomWidth = "0px";
        elem.style.opacity = "0";
      }, 1);
      elem.addEventListener("transitionend", function handler(e) {
        if (e.propertyName === "opacity" || e.elapsedTime >= 0.6) {
          elem.removeEventListener("transitionend", handler, false);
          remove_func();
        }
      });
    }

    showRight(elem, props) {
      elem.className += " animate";
      elem.style.opacity = 0;
      elem.style.transform = "TranslateX(-20px) Scale(1.01)";
      setTimeout(function() {
        elem.style.opacity = 1;
        elem.style.transform = "TranslateX(0px) Scale(1)";
      }, 1);
      elem.addEventListener("transitionend", function() {
        elem.classList.remove("animate");
        elem.style.transform = elem.style.opacity = null;
      });
    }

    show(elem, props) {
      var delay = (arguments[arguments.length - 2] != null ? arguments[arguments.length - 2].delay : undefined) * 1000 || 1;
      elem.style.opacity = 0;
      setTimeout(function() {
        elem.className += " animate";
      }, 1);
      setTimeout(function() {
        elem.style.opacity = 1;
      }, delay);
      elem.addEventListener("transitionend", function handler() {
        elem.classList.remove("animate");
        elem.style.opacity = null;
        elem.removeEventListener("transitionend", handler, false);
      });
    }

    hide(elem, remove_func, props) {
      var delay = (arguments[arguments.length - 2] != null ? arguments[arguments.length - 2].delay : undefined) * 1000 || 1;
      elem.className += " animate";
      setTimeout(function() {
        elem.style.opacity = 0;
      }, delay);
      elem.addEventListener("transitionend", function(e) {
        if (e.propertyName === "opacity") {
          remove_func();
        }
      });
    }

    addVisibleClass(elem, props) {
      setTimeout(function() {
        elem.classList.add("visible");
      });
    }
  }

  window.Animation = new Animation();

})();
