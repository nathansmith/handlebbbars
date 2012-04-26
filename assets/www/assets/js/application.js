// JSLint settings:
/*global $, alert, document, console, Handlebars, Zepto */

(function($, window, document, undefined) {
  var cache = {};
  var base = 'http://api.dribbble.com/shots/popular?per_page=30&page=';
  var markup = $('#_template-list-item').html();
  var template = Handlebars.compile(markup);
  var loading = $('#loading');
  var list = $('#list');

  function load_api_page(page) {
    var key = base + page;

    loading.show();
    list.html('');

    if (cache[key]) {
      loading.hide();
      list.html(cache[key]);
    }
    else {
      $.ajax({
        url: key,
        type: 'get',
        async: false,
        cache: true,
        callback: 'process_json',
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function(data) {
          // If need be, sanitize Twitter usernames.
          // Since we prefix all usernames with "@",
          // we want to get just the username itself.
          //
          // Examples:
          // - "http://twitter.com/#!/nathansmith"
          // - "@nathansmith"
          //
          // Would be changed to:
          // - "nathansmith"

          data.shots.forEach(function(shot) {
            var url_array;
            var username = shot.player.twitter_screen_name;

            if (username) {
              if (username.match(/\//)) {
                url_array = username.split('/');
                username = url_array[url_array.length - 1];
              }

              shot.player.twitter_screen_name = username.replace(/\@/g, '');
            }
          });

          loading.hide();
          cache[key] = template(data);
          list.html(cache[key]);
        }
      });
    }
  }

  $('#page_picker').change(function() {
    load_api_page(this.value);
  });

  $(document).ready(function() {
    load_api_page(1);
  });
})(Zepto, this, this.document);