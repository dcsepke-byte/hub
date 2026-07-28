(function(){
  'use strict';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/service-worker.js')
        .then(function(reg) { console.log('SW registered', reg.scope); })
        .catch(function(err) { console.error('SW failed', err); });
    });
  }
})();
