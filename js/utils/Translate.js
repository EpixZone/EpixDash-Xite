(function() {

  var translations = {};
  var current_language = "en";

  window.loadLanguage = function(lang) {
    if (!lang || lang === "en" || lang === "english") {
      // English is the default, no translation file needed - but switching
      // BACK to English must clear the previously loaded dictionary.
      current_language = "en";
      if (!isEmpty(translations)) {
        translations = {};
        if (window.Page && Page.projector) {
          Page.projector.scheduleRender();
        }
      }
      return;
    }
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
