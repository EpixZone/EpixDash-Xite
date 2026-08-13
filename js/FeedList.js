(function() {

class FeedList {
  constructor() {
    this.onSiteInfo = this.onSiteInfo.bind(this);
    this.render = this.render.bind(this);
    this.renderSearchHelp = this.renderSearchHelp.bind(this);
    this.saveFeedVisit = this.saveFeedVisit.bind(this);
    this.getClass = this.getClass.bind(this);
    this.renderNotifications = this.renderNotifications.bind(this);
    this.renderNotificationAlerts = this.renderNotificationAlerts.bind(this);
    this.queryNotificationAlerts = this.queryNotificationAlerts.bind(this);
    this.handleAlertDismissClick = this.handleAlertDismissClick.bind(this);
    this.handleNotificationHideClick = this.handleNotificationHideClick.bind(this);
    this.renderSearchStat = this.renderSearchStat.bind(this);
    this.renderWelcome = this.renderWelcome.bind(this);
    this.renderFeed = this.renderFeed.bind(this);
    this.exitAnimation = this.exitAnimation.bind(this);
    this.enterAnimation = this.enterAnimation.bind(this);
    this.handleSearchClear = this.handleSearchClear.bind(this);
    this.handleSearchInfoClick = this.handleSearchInfoClick.bind(this);
    this.handleFilterClick = this.handleFilterClick.bind(this);
    this.handleSearchKeyup = this.handleSearchKeyup.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.storeNodeSearch = this.storeNodeSearch.bind(this);
    this.updateBodyOverflow = this.updateBodyOverflow.bind(this);
    this.search = this.search.bind(this);
    this.update = this.update.bind(this);
    this.displayRows = this.displayRows.bind(this);
    this.checkScroll = this.checkScroll.bind(this);
    this.feeds = null;
    this.searching = null;
    this.searching_text = null;
    this.searched = null;
    this.res = null;
    this.loading = false;
    this.filter = null;
    this.feed_types = {};
    this.need_update = false;
    this.updating = false;
    this.limit = 30;
    this.query_limit = 20;
    this.query_day_limit = 3;
    this.show_stats = false;
    this.feed_keys = {};
    this.date_feed_visit = null;
    this.date_save_feed_visit = 0;
    this.notification_alerts = [];
    this.notification_alerts_loaded = false;
    // Addresses whose declared favicon failed to load; they fall back to the
    // brand-color ring until the page reloads. The handler is bound once:
    // maquette forbids a function property changing identity across renders.
    this.favicon_failed = {};
    this.handleFaviconError = (e) => {
      var address = e.target.getAttribute("data-address");
      if (address) {
        this.favicon_failed[address] = true;
      }
      return Page.projector.scheduleRender();
    };
    Page.on_settings.then(() => {
      this.need_update = true;
      this.queryNotificationAlerts();
      // Refresh unread counts on a light timer so tile badges update even
      // when no file_done event fires. queryNotificationAlerts is bound above.
      this.notification_timer = setInterval(this.queryNotificationAlerts, 30000);
      return document.body.onscroll = () => {
        return RateLimit(300, () => {
          return this.checkScroll();
        });
      };
    });
  }

  checkScroll() {
    var ref, scroll_top;
    scroll_top = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scroll_top + window.innerHeight > document.getElementById("FeedList").clientHeight - 400 && !this.updating && ((ref = this.feeds) != null ? ref.length : void 0) > 5 && Page.mode === "Sites" && this.limit < 300) {
      this.limit += 30;
      this.query_limit += 30;
      if (this.query_day_limit !== null) {
        this.query_day_limit += 5;
        if (this.query_day_limit > 30) {
          this.query_day_limit = null;
        }
      }
      this.log("checkScroll update");
      if (this.searching) {
        this.search(this.searching);
      } else {
        this.update();
      }
      return true;
    } else {
      return false;
    }
  }

  // Rows folded into an existing feed item keep the fields the item needs to
  // render and link them individually - they are separate comments, each with
  // its own author and permalink.
  groupedRow(row) {
    return { body: row.body, author: row.author, permalink: row.permalink || row.url };
  }

  displayRows(rows, search) {
    var i, last_row, len, row, row_group;
    this.feeds = [];
    this.feed_keys = {};
    if (!rows) {
      return false;
    }
    rows.sort(function(a, b) {
      return a.date_added + (a.type === "mention" ? 1 : 0) - b.date_added - (b.type === "mention" ? 1 : 0);
    });
    row_group = {};
    last_row = {};
    this.feed_types = {};
    rows.reverse();
    for (i = 0, len = rows.length; i < len; i++) {
      row = rows[i];
      if (last_row.body === row.body && last_row.date_added === row.date_added) {
        continue;
      }
      if (row_group.type === row.type && row.url === row_group.url && row.site === row_group.site) {
        // A NULL body has nothing to show as an extra line; count it under
        // "+N more" instead of rendering an empty block (and feeding null
        // into isQuotedIn / the vnode key).
        if (!row.body) {
          if (row_group.more == null) {
            row_group.more = 0;
          }
          row_group.more += 1;
        } else if (row_group.body_more == null) {
          row_group.body_more = [];
          row_group.body_more.push(this.groupedRow(row));
        } else if (row_group.body_more.length < 3) {
          row_group.body_more.push(this.groupedRow(row));
        } else {
          if (row_group.more == null) {
            row_group.more = 0;
          }
          row_group.more += 1;
        }
        row_group.feed_id = row.date_added;
      } else {
        if (row.feed_id == null) {
          row.feed_id = row.date_added;
        }
        row.key = row.site + row.type + row.title + row.feed_id;
        if (this.feed_keys[row.key]) {
          this.log("Duplicate feed key: " + row.key);
        } else {
          this.feeds.push(row);
        }
        this.feed_keys[row.key] = true;
        row_group = row;
      }
      this.feed_types[row.type] = true;
      last_row = row;
    }
    return Page.projector.scheduleRender();
  }

  update(cb) {
    var params;
    if (this.searching || this.updating) {
      return false;
    }
    if (!Page.server_info) {
      params = [];
    } else {
      params = {
        limit: this.query_limit,
        day_limit: this.query_day_limit
      };
    }
    this.logStart("Updating feed", params);
    this.updating = true;
    return Page.cmd("feedQuery", params, (res) => {
      var rows;
      if (res.rows) {
        rows = res.rows;
      } else {
        rows = res;
      }
      this.res = res;
      if (rows.length < 10 && this.query_day_limit !== null) {
        this.log("Only " + res.rows.length + " results, query without day limit");
        this.query_limit = 20;
        this.query_day_limit = null;
        this.updating = false;
        this.update();
        return false;
      }
      this.displayRows(rows);
      setTimeout(this.checkScroll, 100);
      this.logEnd("Updating feed");
      if (cb) {
        cb();
      }
      return this.updating = false;
    });
  }

  search(search, cb) {
    var params;
    if (!Page.server_info) {
      params = search;
    } else {
      params = {
        search: search,
        limit: this.query_limit * 3,
        day_limit: this.query_day_limit * 10 || null
      };
    }
    this.log("Searching for", params);
    this.loading = true;
    Page.projector.scheduleRender();
    return Page.cmd("feedSearch", params, (res) => {
      this.loading = false;
      if (res.rows.length < 10 && this.query_day_limit !== null) {
        this.log("Only " + res.rows.length + " results, search without day limit");
        this.query_limit = 30;
        this.query_day_limit = null;
        this.search(search, cb);
        return false;
      }
      this.displayRows(res["rows"], search);
      delete res["rows"];
      this.res = res;
      this.searched = search;
      if (cb) {
        return cb();
      }
    });
  }

  storeNodeSearch(node) {
    return document.body.onkeypress = (e) => {
      var ref, ref1;
      if ((ref = e.charCode) === 0 || ref === 32) {
        return;
      }
      if (((ref1 = document.activeElement) != null ? ref1.tagName : void 0) !== "INPUT") {
        return node.focus();
      }
    };
  }

  handleSearchInput(e) {
    var delay, ref;
    if (((ref = this.searching) != null ? ref.length : void 0) > 3) {
      delay = 400;
    } else {
      delay = 800;
    }
    if (Page.site_list.sites.length > 300) {
      delay = delay * 3;
    } else if (Page.site_list.sites.length > 100) {
      delay = delay * 2;
    }
    this.searching = e.target.value;
    this.searching_text = this.searching.replace(/[^ ]+:.*$/, "").trim();
    if (e.target.value === "") {
      delay = 1;
    }
    // Enter searches immediately. The event arrives here relayed from
    // handleSearchKeyup (input events carry no key), so read e.key.
    if (e.key === "Enter") {
      delay = 1;
    }
    clearInterval(this.input_timer);
    setTimeout(() => {
      return this.waiting = true;
    });
    this.input_timer = setTimeout((() => {
      return RateLimitCb(delay, (cb_done) => {
        this.limit = 30;
        this.query_limit = 20;
        this.query_day_limit = 3;
        this.waiting = false;
        if (this.searching) {
          return this.search(this.searching, () => {
            return cb_done();
          });
        } else {
          return this.update(() => {
            cb_done();
            if (!this.searching) {
              this.searching = null;
            }
            return this.searched = null;
          });
        }
      });
    }), delay);
    return false;
  }

  handleSearchKeyup(e) {
    if (e.keyCode === 27) {
      e.target.value = "";
      this.handleSearchInput(e);
    }
    if (e.keyCode === 13) {
      this.handleSearchInput(e);
    }
    return false;
  }

  handleFilterClick(e) {
    this.filter = e.target.getAttribute("href").replace("#", "");
    if (this.filter === "all") {
      this.filter = null;
    }
    // Keep the address bar shareable: ?Discover deep-links to the welcome tab
    if (this.filter === "discover") {
      Page.setUrl("?Discover");
    } else if ((Page.params.url || "").toLowerCase() === "discover") {
      Page.setUrl("?");
    }
    Page.projector.scheduleRender();
    return false;
  }

  handleSearchInfoClick(e) {
    this.show_stats = !this.show_stats;
    return false;
  }

  handleSearchClear(e) {
    e.target.value = "";
    this.handleSearchInput(e);
    return false;
  }

  formatTitle(title) {
    if (this.searching_text && this.searching_text.length > 1) {
      return Text.highlight(title || "", this.searching_text);
    } else {
      if (title) {
        return title;
      } else {
        return "";
      }
    }
  }

  inlineMarkdown(text) {
    try {
      var html;
      if (typeof marked !== "undefined") {
        if (marked.parseInline) {
          html = marked.parseInline(text);
        } else if (marked.inlineLexer) {
          html = marked.inlineLexer(text, [], {});
        } else {
          html = text;
        }
      } else {
        html = text;
      }
      // Sanitize: strip any tags except basic inline formatting
      return html.replace(/<(?!\/?(?:b|i|em|strong|code|a|del|s)\b)[^>]*>/gi, "");
    } catch (e) {
      return text;
    }
  }

  // Cut on a word boundary rather than mid-word: a feed line ending in
  // "your BLAKE3 ha" reads as a rendering bug, not as an excerpt.
  truncateWords(text, limit) {
    text = (text || "").trim();
    if (text.length <= limit) {
      return { text: text, cut: false };
    }
    var cut = text.slice(0, limit);
    var space = cut.lastIndexOf(" ");
    if (space > limit * 0.6) {
      cut = cut.slice(0, space);
    }
    return { text: cut.replace(/[\s,.;:!?\-\u2013\u2014]+$/, ""), cut: true };
  }

  // Truncating raw markdown can orphan a delimiter ("**v0.4.3" with no
  // closer swallows the rest of the line once marked parses it).
  balanceMarkdown(text) {
    var pairs = [/\*\*/g, /`/g, /~~/g];
    for (var i = 0; i < pairs.length; i++) {
      var found = text.match(pairs[i]);
      if (found && found.length % 2 === 1) {
        var last = text.lastIndexOf(found[0]);
        text = text.slice(0, last) + text.slice(last + found[0].length);
      }
    }
    // A dangling "[label](half-a-url" never closes either. Only a started
    // link counts: prose may hold a lone "[" with no parenthesis after it.
    var link = text.lastIndexOf("](");
    if (link !== -1 && text.indexOf(")", link) === -1) {
      var open = text.lastIndexOf("[", link);
      text = text.slice(0, open === -1 ? link : open);
    }
    var bracket = text.lastIndexOf("[");
    if (bracket !== -1 && text.indexOf("]", bracket) === -1) {
      text = text.slice(0, bracket);
    }
    return text.replace(/\s+$/, "");
  }

  // Highlight the search term in already-rendered html, skipping tags so a
  // match inside an href or a class name can't break the markup.
  highlightHtml(html, search) {
    if (!search || search.length < 2) {
      return html;
    }
    var pattern;
    try {
      pattern = new RegExp("(" + search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    } catch (e) {
      return html;
    }
    return html.split(/(<[^>]*>)/).map(function(part) {
      if (part[0] === "<") {
        return part;
      }
      return part.replace(pattern, '<span class="highlight">$1</span>');
    }).join("");
  }

  // Split a comment body into the ordered quote / reply segments the author
  // actually wrote. A reply with two quoted questions has four segments; the
  // old "grab the first quote, delete every > line, join the rest" collapsed
  // them into one run-on paragraph.
  parseCommentBody(body) {
    var author = null;
    var segments = [];
    var current = null;
    body = (body || "").replace(/\r\n?/g, "\n");
    var author_match = body.match(/^[ ]*(?:([a-zA-Z0-9._\-]+)@[a-zA-Z0-9._\-]+|@([^\s:]+))[ ]*:/);
    if (author_match) {
      author = author_match[1] || author_match[2];
      body = body.slice(author_match[0].length);
    }
    body.split("\n").forEach(function(line) {
      var quote_match = line.match(/^[ ]*>[ ]*(?:\[([^\]]*)\](?:\([^)]*\))?[: ]*)?(.*)$/);
      if (quote_match) {
        var user = quote_match[1] || null;
        var text = quote_match[2] || "";
        if (current && current.type === "quote" && !user) {
          current.text += " " + text;
        } else {
          current = { type: "quote", user: user, text: text };
          segments.push(current);
        }
      } else if (line.trim() === "") {
        current = null;
      } else if (current && current.type === "text") {
        current.text += " " + line.trim();
      } else {
        current = { type: "text", text: line.trim() };
        segments.push(current);
      }
    });
    segments = segments.filter(function(segment) {
      segment.text = segment.text.replace(/\s+/g, " ").trim();
      return segment.text.length > 0;
    });
    return { author: author, segments: segments };
  }

  isQuotedIn(main_body, other_body) {
    // A feed row's body can be NULL (a site's feed SQL returns whatever its
    // schema holds); nothing quotes or is quoted then.
    if (!main_body || !other_body) return false;
    var normalize = function(text) {
      return text.replace(/\s+/g, " ").trim().toLowerCase();
    };
    var other = normalize(this.parseCommentBody(other_body).segments.filter(function(segment) {
      return segment.type === "text";
    }).map(function(segment) {
      return segment.text;
    }).join(" "));
    if (other.length < 12) return false;
    // Every quote counts, not just the first: a multi-quote reply answers
    // several of the grouped comments, and a quote is usually an excerpt of
    // the comment rather than the whole of it, so containment goes both ways.
    return this.parseCommentBody(main_body).segments.some(function(segment) {
      if (segment.type !== "quote") return false;
      var quote = normalize(segment.text);
      if (quote.length < 12) return false;
      return other.indexOf(quote.slice(0, 60)) !== -1 || quote.indexOf(other.slice(0, 60)) !== -1;
    });
  }

  escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Returns {html, cut} - the caller needs to know whether anything was left
  // behind, to decide if the excerpt earns a "more" link.
  renderExcerpt(text, limit, continues) {
    var excerpt = this.truncateWords(text, limit);
    var body = excerpt.text;
    var cut = excerpt.cut || !!continues;
    if (cut) {
      // "ran into.\u2026" reads as a typo; the ellipsis replaces the stop.
      body = body.replace(/[\s.,;:]+$/, "");
    }
    var html = this.inlineMarkdown(this.balanceMarkdown(body));
    if (cut && html) {
      html += "\u2026";
    }
    return { html: this.highlightHtml(html, this.searching_text), cut: cut && !!html };
  }

  renderExcerptHtml(text, limit, continues) {
    return this.renderExcerpt(text, limit, continues).html;
  }

  // The link the excerpt's "more" points at. A xite whose feed query supplies
  // a `permalink` lands on the item itself; anything else falls back to the
  // page it lives on. `hidden` emits it for the overflow check below to
  // reveal - the text may still be cut by the css line clamp.
  renderMoreLink(href, hidden) {
    if (!href) {
      return "";
    }
    return '<a class="read-more' + (hidden ? " is-hidden" : "") + '" href="' +
      this.escapeHtml(href) + '">' + _("more") + " \u203a</a>";
  }

  // Whether the excerpt got cut is only half a css decision: the 2-line clamp
  // depends on the rendered width, so a body the truncator left whole can
  // still be clipped. Measure it and reveal the link that was rendered hidden.
  updateBodyOverflow(element) {
    var text = element.querySelector(".body-text");
    var link = element.querySelector(".read-more");
    if (!text || !link) {
      return;
    }
    if (text.scrollHeight > text.clientHeight + 1) {
      link.classList.remove("is-hidden");
    }
  }

  formatBodyHtml(body, type, opts) {
    if (opts == null) opts = {};
    var is_more = opts.more;
    if (type !== "comment" && type !== "mention") {
      var plain = this.renderExcerpt((body || "").replace(/\s+/g, " "), 220);
      if (!plain.html) {
        return "";
      }
      return '<div class="body-text">' + plain.html + "</div>" +
        this.renderMoreLink(opts.href, !plain.cut);
    }

    var parsed = this.parseCommentBody(body);
    var segments = parsed.segments;
    var html = "";

    // The quote a reply opens with is context for the answer, so it leads.
    // A grouped follow-up line has no room for both, and the answer is the
    // part the reader has not seen yet, so there the quote is dropped.
    var index = 0;
    var quote_shown = false;
    if (!is_more && segments[0] && segments[0].type === "quote") {
      var quote = segments[0];
      index = 1;
      quote_shown = true;
      html += '<div class="reply-quote">' +
        (quote.user ? '<span class="reply-user">' + this.escapeHtml(quote.user) + "</span>" : "") +
        '<span class="reply-text">' + this.renderExcerptHtml(quote.text, 110) + "</span></div>";
    } else if (is_more) {
      while (segments[index] && segments[index].type === "quote") {
        index += 1;
      }
    }

    // Take the reply that answers that quote, and stop at the next quote:
    // pairing is what makes a multi-quote reply readable.
    var texts = [];
    while (segments[index] && segments[index].type === "text") {
      texts.push(segments[index].text);
      index += 1;
    }
    if (!texts.length) {
      // Nothing but quotes \u2014 show those rather than an empty line.
      texts = segments.slice(quote_shown ? 1 : 0).map(function(segment) {
        return segment.text;
      });
      index = segments.length;
    }

    var excerpt = this.renderExcerpt(texts.join(" "), is_more ? 160 : 200, index < segments.length);
    // The feed row's own author column wins: a follow query selects the
    // commenter directly, while the "user@site:" body prefix only exists on
    // the feeds that build one.
    var author = opts.author || parsed.author;
    if (excerpt.html) {
      html += '<div class="body-text">' +
        (author ? '<b class="body-author">' + this.escapeHtml(author) + " \u203A </b>" : "") +
        excerpt.html + "</div>";
    }
    // Outside .body-text on purpose: inside the line clamp it would be the
    // first thing cut off.
    html += this.renderMoreLink(opts.href, !excerpt.cut);
    return html;
  }

  formatType(type, title) {
    if (type === "comment") {
      return _("Comment on");
    } else if (type === "mention") {
      if (title) {
        return _("You got mentioned in");
      } else {
        return _("You got mentioned");
      }
    } else {
      return "";
    }
  }

  enterAnimation(elem, props) {
    if (this.searching === null) {
      return Animation.slideDown.apply(this, arguments);
    } else {
      return null;
    }
  }

  exitAnimation(elem, remove_func, props) {
    if (this.searching === null) {
      return Animation.slideUp.apply(this, arguments);
    } else {
      return remove_func();
    }
  }

  // The timeline marker for a feed item: the source xite's favicon when the
  // site declares one and it loads, else a ring in the site's brand color.
  renderFeedMarker(site) {
    var content = site.row.content || {};
    var favicon = content.favicon;
    var address = site.row.address;
    if (favicon && !this.favicon_failed[address]) {
      return h("img.favicon", {
        src: "/" + address + "/" + favicon,
        alt: "",
        "data-address": address,
        onerror: this.handleFaviconError
      });
    }
    // Same letter tile the xites list uses (brand bucket + first letter with
    // the "Epix " prefix skipped), so rows without a favicon match the rest.
    var name = content.title || address;
    var m = /^Epix\s*(.)/.exec(name);
    var letter = ((m ? m[1] : name.charAt(0)) || "?").toUpperCase();
    return h("div.tile." + Text.toBrandClass(address), {"aria-hidden": "true"}, [letter]);
  }

  renderFeed(feed) {
    var classes, err, href, site, type_formatted;
    if (this.filter && feed.type !== this.filter) {
      return null;
    }
    try {
      site = Page.site_list.item_list.items_bykey[feed.site];
      type_formatted = this.formatType(feed.type, feed.title);
      classes = {};
      if (this.date_feed_visit && feed.date_added > this.date_feed_visit) {
        classes["new"] = true;
      }
      // Everything that points at this item - the headline and the excerpt's
      // "more" - goes to the item itself when its xite gives us a permalink.
      // Only "+N more", which means "the rest of the thread", stays on the
      // page the item lives on.
      href = site.getHref() + (feed.permalink || feed.url);
      return h("div.feed." + feed.type, {
        key: feed.key,
        enterAnimation: this.enterAnimation,
        exitAnimation: this.exitAnimation,
        classes: classes
      }, [
        h("div.marker", [this.renderFeedMarker(site)]),
        h("div.meta", [
          h("a.site", {
            href: site.getHref()
          }, [site.row.content.title]), h("span.sep", "\u00B7"), h("span.added", [Time.since(feed.date_added)]), h("span.dot", {
            title: "new"
          }, "\u2022")
        ]), h("div.title-container", [
          type_formatted ? h("span.type", type_formatted) : void 0, h("a.title", {
            href: href
          }, this.formatTitle(feed.title))
        ]), h("div.body", {
          key: feed.body,
          innerHTML: this.formatBodyHtml(feed.body, feed.type, {
            href: href,
            author: feed.author
          }),
          afterCreate: this.updateBodyOverflow,
          afterUpdate: this.updateBodyOverflow,
          enterAnimation: this.enterAnimation,
          exitAnimation: this.exitAnimation
        }), feed.body_more ? feed.body_more.map((body_more) => {
          if (this.isQuotedIn(feed.body, body_more.body)) {
            return null;
          }
          return h("div.body.body-more", {
            key: body_more.body,
            innerHTML: this.formatBodyHtml(body_more.body, feed.type, {
              more: true,
              href: site.getHref() + body_more.permalink,
              author: body_more.author
            }),
            afterCreate: this.updateBodyOverflow,
            afterUpdate: this.updateBodyOverflow,
            enterAnimation: this.enterAnimation,
            exitAnimation: this.exitAnimation
          });
        }) : void 0, feed.more > 0 ? h("a.more", {
          href: site.getHref() + feed.url
        }, ["+" + feed.more + " more"]) : void 0
      ]);
    } catch (error) {
      err = error;
      this.log(err);
      return h("div", {
        key: Time.timestamp()
      });
    }
  }

  renderSearchStat(stat) {
    var back, site, total_taken;
    if (stat.taken === 0) {
      return null;
    }
    total_taken = this.res.taken;
    site = Page.site_list.item_list.items_bykey[stat.site];
    if (!site) {
      return [];
    }
    back = [];
    back.push(h("tr", {
      key: stat.site + "_" + stat.feed_name,
      classes: {
        "slow": stat.taken > total_taken * 0.1,
        "extra-slow": stat.taken > total_taken * 0.3
      }
    }, [
      h("td.site", h("a.site", {
        href: site.getHref()
      }, [site.row.content.title])), h("td.feed_name", stat.feed_name), h("td.taken", (stat.taken != null ? stat.taken + "s" : "n/a "))
    ]));
    if (stat.error) {
      back.push(h("tr.error", h("td", "Error:"), h("td", {
        colSpan: 2
      }, stat.error)));
    }
    return back;
  }

  handleNotificationHideClick(e) {
    var address;
    address = e.target.getAttribute("address");
    Page.settings.siteblocks_ignore[address] = true;
    Page.mute_list.update();
    Page.saveSettings();
    return false;
  }

  queryNotificationAlerts() {
    try {
      Page.cmd("notificationQuery", {}, (res) => {
        try {
          if (!res || res.error || res.muted) {
            this.notification_alerts = [];
            Page.notification_counts = {};
          } else {
            this.notification_alerts = (res.results || []).filter(function(r) {
              return r.count > 0;
            });
            var counts = {};
            (res && res.results ? res.results : []).forEach(function(r) {
              if (r && r.count > 0) counts[r.site] = (counts[r.site] || 0) + r.count;
            });
            Page.notification_counts = counts;
          }
        } catch(e) {
          console.log("notificationQuery callback error:", e);
          this.notification_alerts = [];
          Page.notification_counts = {};
        }
        this.notification_alerts_loaded = true;
        Page.projector.scheduleRender();
      });
    } catch(e) {
      console.log("notificationQuery call error:", e);
    }
  }

  handleAlertDismissClick(e) {
    e.preventDefault();
    var site_address = e.target.getAttribute("data-site");
    var name = e.target.getAttribute("data-name");
    if (site_address && name) {
      Page.cmd("notificationDismiss", [site_address, name], () => {
        this.queryNotificationAlerts();
      });
    }
    return false;
  }

  renderNotificationAlerts() {
    try {
      if (!this.notification_alerts_loaded || this.notification_alerts.length === 0) {
        return null;
      }
      return h("div.notification-alerts",
        this.notification_alerts.map((alert) => {
          var linkChildren = [];
          if (alert.icon) {
            linkChildren.push(h("img.alert-icon", {src: "/" + alert.site + "/" + alert.icon, width: 20, height: 20}));
          }
          linkChildren.push(h("span.alert-count", alert.count.toString()));
          linkChildren.push(h("span.alert-title", alert.title || alert.name));
          return h("div.alert-item-row", {
            key: alert.site + "-" + alert.name,
            enterAnimation: Animation.slideDown,
            exitAnimation: Animation.slideUp
          }, [
            h("a.alert-item", {href: "/" + alert.site + "/"}, linkChildren),
            h("a.alert-dismiss", {
              href: "#Dismiss",
              title: "Dismiss",
              "data-site": alert.site,
              "data-name": alert.name,
              onclick: this.handleAlertDismissClick
            }, "\u00D7")
          ]);
        })
      );
    } catch(e) {
      console.log("renderNotificationAlerts error:", e);
      return null;
    }
  }

  renderNotifications() {
    return h("div.notifications", {
      classes: {
        empty: Page.mute_list.siteblocks_serving.length === 0
      }
    }, [
      Page.mute_list.siteblocks_serving.map((siteblock) => {
        return h("div.notification", {
          key: siteblock.address,
          enterAnimation: Animation.show,
          exitAnimation: Animation.slideUpInout
        }, [
          "You are serving a blocked xite: ", h("a.site", {
            href: siteblock.site.getHref()
          }, siteblock.site.row.content.title), h("span.reason", [h("b", "Reason: "), siteblock.reason]), h("a.hide", {
            href: "#Hide",
            onclick: this.handleNotificationHideClick,
            address: siteblock.address
          }, "\u00D7")
        ]);
      })
    ]);
  }

  getClass() {
    if (this.searching !== null) {
      return "search";
    } else {
      return "newsfeed.limit-" + this.limit;
    }
  }

  saveFeedVisit(date_feed_visit) {
    this.log("Saving feed visit...", Page.settings.date_feed_visit, "->", date_feed_visit);
    Page.settings.date_feed_visit = date_feed_visit;
    return Page.saveSettings();
  }

  renderSearchHelp() {
    return h("div.search-help", ["Tip: Search in specific xite using ", h("code", "anything site:SiteName")]);
  }

  renderDiscoverSite(cssClass, address, title, description, comingSoon) {
    if (comingSoon) {
      return h("div.site." + cssClass + ".coming-soon", [
        h("div.title", [title]),
        h("div.description", [_(description)]),
        h("div.visit", [_("Coming Soon")])
      ]);
    }
    var installed = Page.site_list.sites_byaddress && Page.site_list.sites_byaddress[address];
    var href = "/" + address + "/";
    var visitText = installed ? _("Visit \u2501") : _("Activate \u2501");
    return h("a.site." + cssClass, {href: href, classes: {installed: !!installed}}, [
      h("div.title", [title]),
      h("div.description", [_(description)]),
      h("div.visit", [visitText]),
      (Page.notification_counts && Page.notification_counts[address] > 0)
        ? h("span.site-unread-badge", {key: "unread"}, Page.notification_counts[address] > 99 ? "99+" : String(Page.notification_counts[address]))
        : null
    ]);
  }

  renderWelcome() {
    return h("div.welcome", [
      h("img", {src: "img/logo.png", height: 150}),
      h("h1", _("Welcome to EpixNet")),
      h("h2", _("Decentralization Without Compromise")),
      h("div.served", [_("This xite currently served by "), h("b.peers", (Page.site_info["peers"] || "n/a")), _(" peers, without any central server.")]),
      h("div.sites", [
        this.renderDiscoverSite("site-epixtalk", "epix1talk58lw26c0cyrtuu8axptne2p6zf33s7xxwu", "Epix Talk", "Decentralized forum"),
        this.renderDiscoverSite("site-epixblog", "epix18l0gy59ka9ka89wm9mwsspfmkcv9tvf7g0cs6f", "Epix Blog", "Decentralized microblogging"),
        this.renderDiscoverSite("site-epixpost", "epix1p0stmcza0xjkvv0vnjlk0ypr7xsunt4lxkhgcm", "Epix Post", "Decentralized social network"),
        this.renderDiscoverSite("site-epixmail", "epix1pvta40a8d944w3npr9ztqrfh3wec53hh2je4fa", "Epix Mail", "Decentralized encrypted mailing"),
        this.renderDiscoverSite("site-epixsites", "epix1searchd8hcnyfacvklmszzxwx9ptnf5rde04xf", "Epix Sites", "Decentralized xite discovery"),
        this.renderDiscoverSite("site-epixwiki", "epix1wkkpkx4ldeuh30e3wnz25ft70j9rj9ns77plwa", "Epix Wiki", "Decentralized wiki"),
        this.renderDiscoverSite("site-deflix", "epix1jaahfehr280m9uqlf44vtkrz9hjkvq8fewz68v", "DeFlix", "Decentralized video streaming"),
        this.renderDiscoverSite("site-epixdocs", "epix1readmehqfdxy4pzx7u72wwaerc4psx0gt6fety", "Epix Documentation", "EpixNet guides & documentation")
      ]),
      // The heading stays as an explanation; the tiles are always visible.
      h("div.utility-section", [
        h("div.utility-header", [
          h("span", _("EpixNet Utility Xites"))
        ]),
        h("div.utility-sites", [
          this.renderDiscoverSite("site-xid", "epix1xauthduuyn63k6kj54jzgp4l8nnjlhrsyaku8c", "xID", "Decentralized identity & DNS"),
          this.renderDiscoverSite("site-explorer", "epix1epxrwflutk4j2saxuy84wvv52tdepuep8yqcqk", "Explorer", "Decentralized Epix blockchain explorer"),
          this.renderDiscoverSite("site-vrfdebugger", "epix1k2332529z7kvtneswpure2ewakzrynm6uakrtu", "VRF Debugger", "Decentralized VRF beacon debugger")
        ])
      ])
    ]);
  }

  render() {
    var feed_type, ref, ref1;
    if (this.need_update) {
      RateLimitCb(5000, this.update);
      this.need_update = false;
    }
    if (this.feeds && Page.settings.date_feed_visit < ((ref = this.feeds[0]) != null ? ref.date_added : void 0)) {
      this.saveFeedVisit(this.feeds[0].date_added);
    }
    if (this.feeds && Page.site_list.loaded && document.body.className !== "loaded" && !this.updating) {
      if (document.body.scrollTop > 500) {
        setTimeout((() => {
          return document.body.classList.add("loaded");
        }), 2000);
      } else {
        document.body.classList.add("loaded");
      }
    }
    var has_feeds = this.feeds && this.feeds.length > 0;
    var active_filter = this.filter;
    if (!has_feeds && active_filter !== "discover") {
      active_filter = "discover";
    }
    // A filter that cannot change the result is noise: with only one feed
    // type, "Feed" and that type's tab are the same set, so the type
    // segments only render when there are at least two. If the hidden lone
    // type was the active filter, Feed lights up instead - same rows.
    var type_count = Object.keys(this.feed_types).length;
    if (type_count < 2 && active_filter !== "discover") {
      active_filter = null;
    }
    return h("div#FeedList.FeedContainer", {
      classes: {
        faded: Page.mute_list.visible
      }
    }, Page.mute_list.updated ? this.renderNotifications() : void 0, this.renderNotificationAlerts(), this.feeds === null || !Page.site_list.loaded ? h("div.loading") : [
      has_feeds ? h("div.feeds-filters", [
        h("a.feeds-filter", {
          key: "all",
          href: "#all",
          classes: {
            active: active_filter === null
          },
          onclick: this.handleFilterClick
          // "Latest", not "All" or "Feed": All implied Discover was
          // included, and the pane itself is already named Feed (the
          // mobile Xites|Feed switch), so a Feed tab inside it collided.
          // Latest = the unfiltered stream; the type tabs are its slices.
        }, _("Latest")), (() => {
          var results;
          results = [];
          if (type_count < 2) {
            return results;
          }
          for (feed_type in this.feed_types) {
            results.push(h("a.feeds-filter", {
              key: feed_type,
              href: "#" + feed_type,
              classes: {
                active: active_filter === feed_type
              },
              onclick: this.handleFilterClick
            }, _(feed_type)));
          }
          return results;
        })(),
        h("a.feeds-filter", {
          key: "discover",
          href: "#discover",
          classes: {
            active: active_filter === "discover"
          },
          onclick: this.handleFilterClick
        }, _("Discover"))
      // With no feeds there is nothing to filter between, and the welcome
      // view is already what shows - a lone "Discover" pill is just noise.
      ]) : void 0,
      active_filter === "discover" ? this.renderWelcome() : [
        h("div.feeds-search", {
          classes: {
            "searching": this.searching,
            "searched": this.searched,
            "loading": this.loading || this.waiting
          }
        }, h("div.icon-magnifier"), this.loading ? h("div.loader", {
          enterAnimation: Animation.show,
          exitAnimation: Animation.hide
        }, h("div.arc")) : void 0, this.searched && !this.loading ? h("a.search-clear.nolink", {
          href: "#clear",
          onclick: this.handleSearchClear,
          enterAnimation: Animation.show,
          exitAnimation: Animation.hide
        }, "\u00D7") : void 0, ((ref1 = this.res) != null ? ref1.stats : void 0) ? h("a.search-info.nolink", {
          href: "#ShowStats",
          enterAnimation: Animation.show,
          exitAnimation: Animation.hide,
          onclick: this.handleSearchInfoClick
        }, (this.searching ? this.res.num + " results " : "") + ("from " + this.res.sites + " xites in " + (this.res.taken.toFixed(2)) + "s")) : void 0, h("input", {
          type: "text",
          placeholder: _("Search in connected xites"),
          value: this.searching,
          onkeyup: this.handleSearchKeyup,
          oninput: this.handleSearchInput,
          afterCreate: this.storeNodeSearch
        }), this.show_stats ? h("div.search-info-stats", {
          enterAnimation: Animation.slideDown,
          exitAnimation: Animation.slideUp
        }, [h("table", [h("tr", h("th", "Xite"), h("th", "Feed"), h("th.taken", "Taken")), this.res.stats.map(this.renderSearchStat)])]) : void 0, this.renderSearchHelp(), this.feeds.length === 0 && this.searched ? h("div.search-noresult", {
          enterAnimation: Animation.show
        }, "No results for " + this.searched) : void 0),
        this.feeds.length > 0 ? h("div.FeedList." + this.getClass(), {
          classes: {
            loading: this.loading || this.waiting
          }
        }, [this.feeds.slice(0, +this.limit + 1 || 9e9).map(this.renderFeed)]) : this.renderWelcome()
      ]
    ]);
  }

  onSiteInfo(site_info) {
    var ref, ref1, ref2;
    if (((ref = site_info.event) != null ? ref[0] : void 0) === "file_done" && ((ref1 = site_info.event) != null ? ref1[1].endsWith(".json") : void 0) && !((ref2 = site_info.event) != null ? ref2[1].endsWith("content.json") : void 0)) {
      if (!this.searching) {
        this.need_update = true;
      }
      this.queryNotificationAlerts();
    }
  }
}

Object.assign(FeedList.prototype, LogMixin);
window.FeedList = FeedList;

})();
