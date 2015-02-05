/*
  JS Module Pattern:

  http://j.mp/module-pattern
*/
var APP = (function(window, undefined) {
  'use strict';

  //===============================
  // Local aliases to global scope.
  //===============================

  var $ =
    typeof window.Zepto === 'function' ?
    window.Zepto :
    window.jQuery;

  var document = window.document;
  var Handlebars = window.Handlebars;

  //========================================
  // Fire things off, once the DOM is ready.
  //========================================

  $(document).ready(function() {
    APP.go();
  });

  //==============================================
  // Empty vars. Some assigned after DOM is ready.
  //==============================================

  var body;
  var error;
  var error_link;
  var error_timer;
  var for_keyboard;
  var for_touch;
  var hash;
  var list;
  var loading;
  var logo;
  var markup;
  var tip;
  var number;
  var page_picker;
  var template;

  //==============
  // Shared scope.
  //==============

  var cache = window.localStorage ? window.localStorage : {};
  var base = 'http://api.dribbble.com/shots/popular?per_page=30&page=';
  var slug = '#/page/';
  var one_hour = 3600000;
  var ten_seconds = 10000;
  var is_touch_device = !!('ontouchstart' in window);

  // Expose contents of APP.
  return {
    // APP.go
    go: function() {
      var i;
      var x = APP.init;

      // Run everything in APP.init
      for (i in x) {
        if (x.hasOwnProperty(i)) {
          x[i]();
        }
      }
    },
    // APP.init
    init: {
      // APP.init.assign_dom_vars
      assign_dom_vars: function() {
        body = $(document.body);

        page_picker = $('#page-picker');
        list = $('#list');

        loading = $('#loading');
        error = $('#error');

        markup = $('#_template-list-item').html().replace(/\s\s+/g, '');
        template = Handlebars.compile(markup);

        tip = $('#tip');
        for_keyboard = tip.find('.for-keyboard');
        for_touch = tip.find('.for-touch');
      },
      // APP.init.nav_shortcuts
      nav_shortcuts: function() {
        // Events.
        var swipeLeft = 'swipeLeft.app_init_nav_shortcuts';
        var swipeRight = 'swipeRight.app_init_nav_shortcuts';
        var keydown = 'keydown.app_init_nav_shortcuts';

        // Show relevant instructions.
        if (is_touch_device) {
          for_touch.show();
        }
        else {
          for_keyboard.show();
        }

        // Logic to determine prev/next
        // page, or go to beginning/end.
        function change_page(goto) {
          window.clearTimeout(error_timer);
          body.addClass('hide_tip');

          // Previous or next?
          if (goto === 'prev') {
            number--;
          }
          else {
            number++;
          }

          // Circular navigation.
          if (number > 25) {
            number = 1;
          }
          else if (number < 1) {
            number = 25;
          }

          APP.util.change_hash();
        }

        // Watch for swipes.
        body.off(swipeLeft).on(swipeLeft, function(e) {
          e.preventDefault();

          var is_hidden = loading[0].style.display === 'none';

          if (is_hidden) {
            change_page('next');
          }
        });

        body.off(swipeRight).on(swipeRight, function(e) {
          e.preventDefault();

          var is_hidden = loading[0].style.display === 'none';

          if (is_hidden) {
            change_page('prev');
          }
        });

        // Watch for "J" or "K" pressed.
        body.off(keydown).on(keydown, function(e) {
          var key = e.keyCode;
          var is_hidden = loading[0].style.display === 'none';
          var prev = is_hidden && key === 74;
          var next = is_hidden && key === 75;

          if (prev) {
            e.preventDefault();
            change_page('prev');
          }
          else if (next) {
            e.preventDefault();
            change_page('next');
          }
        });
      },
      // APP.init.watch_hash_change
      watch_hash_change: function() {
        var event = 'hashchange.app_init_watch_hash_change';

        $(window).off(event).on(event, function() {
          APP.init.set_the_page();
        });
      },
      // APP.init.set_the_page
      set_the_page: function() {
        hash = window.location.hash;
        number = hash.split(slug)[1] || 1;

        if (hash.match(slug) && 0 < number && number < 26) {
          APP.util.load_from_api();
          page_picker.val(number);
        }
        else {
          number = 1;
          APP.util.change_hash();
        }
      },
      // APP.init.refresh_links
      refresh_links: function() {
        var event = 'click.app_init_refresh_links';

        body.off(event).on(event, '#logo, #error a', function(e) {
          e.preventDefault();

          // Force whole page to be reloaded.
          // But allow it to load from cache,
          // by passing in 'false' parameter.
          window.location.reload(false);
        });
      },
      // APP.init.page_picker
      page_picker: function() {
        var event = 'change.app_init_page_picker';

        page_picker.off(event).on(event, function() {
          number = this.value;
          APP.util.change_hash();
        });
      },
      // APP.init.external_links
      external_links: function() {
        var event = 'click.app_init_external_links';

        var str = [
          'a[href^="http://"]',
          'a[href^="https://"]'
        ].join(',');

        body.off(event).on(event, str, function() {
          var el = $(this);
          el.attr('target', '_blank');
        });
      }
    },
    // APP.util
    util: {
      // APP.util.change_hash
      change_hash: function() {
        window.location.hash = slug + number;
      },
      // APP.util.load_from_api
      load_from_api: function() {
        var url_key = base + number;
        var time_key = 'time_' + number;
        var time_now = Date.now();

        var valid_cache =
          cache[url_key] &&
          time_now - cache[time_key] < one_hour;

        list.html('');
        error.hide();
        loading.show();

        if (valid_cache) {
          loading.hide();
          list.html(cache[url_key]);
        }
        else {
          $.ajax({
            url: url_key,
            type: 'get',
            async: true,
            cache: true,
            callback: 'process_json',
            contentType: 'application/json',
            dataType: 'jsonp',
            success: function(data) {
              /*
                If need be, sanitize Twitter usernames.
                Since we prefix all usernames with "@",
                we want to get just the username itself.

                Examples:
                - "http://twitter.com/#!/nathansmith"
                - "@nathansmith"

                Would be changed to:
                - "nathansmith"
              */

              data.shots.forEach(function(shot) {
                var twitter_url;
                var username = shot.player.twitter_screen_name;

                if (username) {
                  if (username.match(/\//)) {
                    twitter_url = username.split('/');
                    username = twitter_url[twitter_url.length - 1];
                  }

                  shot.player.twitter_screen_name = username.replace(/\@/g, '');
                }
              });

              loading.hide();
              error.hide();
              cache[time_key] = time_now;
              cache[url_key] = template(data);
              list.html(cache[url_key]);
            }
          });

          // Poor man's error callback, because
          // there's no error condition for JSONP.
          error_timer = window.setTimeout(function() {
            var is_visible = loading[0].style.display === 'block';

            if (is_visible) {
              loading.hide();
              error.show();
            }
          }, ten_seconds);
        }
      }
    }
  };

// END: closure.
})(this);