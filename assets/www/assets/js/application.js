// JSLint settings:
/*global alert, console, Handlebars, jQuery, Zepto*/

//
// Module pattern:
// http://yuiblog.com/blog/2007/06/12/module-pattern
//
var APP = (function(window, document, undefined) {
  // Empty vars. Assigned after DOM is ready.
  var list, loading, logo, markup, page_picker, template;

  // Private variables used as "constants".
  var $ = typeof Zepto === 'function' ? Zepto : jQuery;
  var cache = window.localStorage ? window.localStorage : {};
  var base = 'http://api.dribbble.com/shots/popular?per_page=30&page=';
  var search = window.location.search;
  var number = search ? search.split('?page=')[1] : 1;
  var one_hour = 3600000;

  // Expose contents of APP.
  return {
    // APP.go
    go: function() {
      var i, j = this.init;

      for (i in j) {
        // Run everything in APP.init
        j.hasOwnProperty(i) && j[i]();
      }
    },
    // APP.init
    init: {
      // APP.init.assign_dom_vars
      assign_dom_vars: function() {
        // Assigned when DOM is ready.
        logo = $('#logo')[0];
        page_picker = $('#page_picker');
        list = $('#list');
        loading = $('#loading');
        markup = $('#_template-list-item').html().replace(/\s\s+/g, '');
        template = Handlebars.compile(markup);
      },
      // APP.init.set_page_number
      set_page_number: function() {
        logo.href = './index.html?page=' + number;
        page_picker.val(number);
        APP.util.load_api_page(number);
      },
      // APP.init.page_picker
      page_picker: function() {
        page_picker.change(function() {
          logo.href = './index.html?page=' + this.value;
          APP.util.load_api_page(this.value);
        });
      }
    },
    // APP.util
    util: {
      // APP.util.load_api_page
      load_api_page: function(page) {
        var url_key = base + page;
        var time_key = 'time_' + page;
        var time_now = Date.now();

        list.html('');
        loading.show();

        if (cache[url_key] && time_now - cache[time_key] < one_hour) {
          loading.hide();
          list.html(cache[url_key]);
        }
        else {
          $.ajax({
            url: url_key,
            type: 'get',
            async: false,
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
              cache[time_key] = time_now;
              cache[url_key] = template(data);
              list.html(cache[url_key]);
            }
          });
        }
      }
    }
  };
// Alias window, document.
})(this, this.document);

//
// Automatically calls all functions in APP.init
//
(typeof Zepto === 'function' ? Zepto : jQuery)(this.document).ready(function() {
  APP.go();
});