// PreConfig.js - Override CSP to allow MCP WebSocket connections
(function() {
    var meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://storage.googleapis.com https://apis.google.com https://docs.google.com https://code.jquery.com blob:; " +
        "connect-src 'self' * ws: wss: http: https:; " +
        "img-src * data: blob:; " +
        "media-src * data:; " +
        "font-src * about: data:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "frame-src 'self' https://*.google.com; " +
        "worker-src 'self' blob:; " +
        "child-src 'self' blob:;";
    var firstChild = document.head.firstChild;
    if (firstChild) {
        document.head.insertBefore(meta, firstChild);
    } else {
        document.head.appendChild(meta);
    }
})();
