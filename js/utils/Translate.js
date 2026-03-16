(function() {

  var translations = {};
  var current_language = "en";

  window.loadLanguage = function(lang) {
    if (lang === current_language && !isEmpty(translations)) {
      return;
    }
    current_language = lang;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "languages/" + lang + ".json", true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          translations = JSON.parse(xhr.responseText);
        } catch (e) {
          console.error("Failed to parse language file:", e);
          translations = {};
        }
        if (window.Page && Page.projector) {
          Page.projector.scheduleRender();
        }
      }
    };
    xhr.onerror = function() {
      console.error("Failed to load language file");
      translations = {};
    };
    xhr.send();
  };

  window._ = function(s) {
    if (translations && translations[s]) {
      return translations[s];
    }
    return s;
  };

})();
