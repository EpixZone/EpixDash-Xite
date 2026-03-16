(function() {

  class MarkedRenderer extends marked.Renderer {
    image(href, title, text) {
      return "<code>![" + text + "](" + href + ")</code>";
    }
  }

  class Text {
    toColor(text, saturation, lightness) {
      if (saturation == null) saturation = 30;
      if (lightness == null) lightness = 50;
      var hash = 0;
      for (var i = 0; i <= text.length - 1; i++) {
        hash += text.charCodeAt(i) * i;
        hash = hash % 1777;
      }
      return "hsl(" + (hash % 360) + "," + saturation + "%," + lightness + "%)";
    }

    renderMarked(text, options) {
      if (options == null) options = {};
      options["gfm"] = true;
      options["breaks"] = true;
      options["sanitize"] = true;
      options["renderer"] = marked_renderer;
      text = marked(text, options);
      return this.fixHtmlLinks(text);
    }

    emailLinks(text) {
      return text.replace(/([a-zA-Z0-9]+)@xid.bit/g, "<a href='?to=$1' onclick='return Page.message_create.show(\"$1\")'>$1@xid.bit</a>");
    }

    fixHtmlLinks(text) {
      if (window.is_proxy) {
        return text.replace(/href="http:\/\/(127.0.0.1|localhost):42222/g, 'href="http://epix');
      } else {
        return text.replace(/href="http:\/\/(127.0.0.1|localhost):42222/g, 'href="');
      }
    }

    fixLink(link) {
      if (window.is_proxy) {
        var back = link.replace(/http:\/\/(127.0.0.1|localhost):42222/, 'http://epix');
        return back.replace(/http:\/\/epix\/([^\/]+\.bit)/, "http://$1");
      } else {
        return link.replace(/http:\/\/(127.0.0.1|localhost):42222/, '');
      }
    }

    toUrl(text) {
      return text.replace(/[^A-Za-z0-9]/g, "+").replace(/[+]+/g, "+").replace(/[+]+$/, "");
    }

    getSiteUrl(address) {
      if (window.is_proxy) {
        if (address.indexOf(".") >= 0) {
          return "http://" + address + "/";
        } else {
          return "http://epix/" + address + "/";
        }
      } else {
        return "/" + address + "/";
      }
    }

    fixReply(text) {
      return text.replace(/(>.*\n)([^\n>])/gm, "$1\n$2");
    }

    toBitcoinAddress(text) {
      return text.replace(/[^A-Za-z0-9]/g, "");
    }

    jsonEncode(obj) {
      return unescape(encodeURIComponent(JSON.stringify(obj)));
    }

    jsonDecode(obj) {
      return JSON.parse(decodeURIComponent(escape(obj)));
    }

    fileEncode(obj) {
      if (typeof obj === "string") {
        return btoa(unescape(encodeURIComponent(obj)));
      } else {
        return btoa(unescape(encodeURIComponent(JSON.stringify(obj, undefined, '\t'))));
      }
    }

    utf8Encode(s) {
      return unescape(encodeURIComponent(s));
    }

    utf8Decode(s) {
      return decodeURIComponent(escape(s));
    }

    distance(s1, s2) {
      s1 = s1.toLocaleLowerCase();
      s2 = s2.toLocaleLowerCase();
      var next_find_i = 0;
      var next_find = s2[0];
      var extra_parts = {};
      for (var i = 0; i < s1.length; i++) {
        var char = s1[i];
        if (char !== next_find) {
          if (extra_parts[next_find_i]) {
            extra_parts[next_find_i] += char;
          } else {
            extra_parts[next_find_i] = char;
          }
        } else {
          next_find_i++;
          next_find = s2[next_find_i];
        }
      }
      if (extra_parts[next_find_i]) {
        extra_parts[next_find_i] = "";
      }
      var extra_arr = [];
      for (var key in extra_parts) {
        extra_arr.push(extra_parts[key]);
      }
      if (next_find_i >= s2.length) {
        return extra_arr.length + extra_arr.join("").length;
      } else {
        return false;
      }
    }

    parseQuery(query) {
      var params = {};
      var parts = query.split('&');
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var ref = part.split("=");
        var key = ref[0], val = ref[1];
        if (val) {
          params[decodeURIComponent(key)] = decodeURIComponent(val);
        } else {
          params["url"] = decodeURIComponent(key);
        }
      }
      return params;
    }

    encodeQuery(params) {
      var back = [];
      if (params.url) {
        back.push(params.url);
      }
      for (var key in params) {
        var val = params[key];
        if (!val || key === "url") {
          continue;
        }
        back.push(encodeURIComponent(key) + "=" + encodeURIComponent(val));
      }
      return back.join("&");
    }

    highlight(text, search) {
      if (!text) {
        return [""];
      }
      var parts = text.split(RegExp(search, "i"));
      var back = [];
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        back.push(part);
        if (i < parts.length - 1) {
          back.push(h("span.highlight", { key: i }, search));
        }
      }
      return back;
    }

    formatSize(size) {
      if (!parseInt(size)) {
        return "";
      }
      var size_mb = size / 1024 / 1024;
      if (size_mb >= 1000) {
        return (size_mb / 1024).toFixed(1) + " GB";
      } else if (size_mb >= 100) {
        return size_mb.toFixed(0) + " MB";
      } else if (size / 1024 >= 1000) {
        return size_mb.toFixed(2) + " MB";
      } else {
        return (size / 1024).toFixed(2) + " KB";
      }
    }
  }

  window.marked_renderer = new MarkedRenderer();

  window.is_proxy = document.location.host === "epix" || window.location.pathname === "/";

  window.Text = new Text();

})();
