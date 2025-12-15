// PreConfig.js - Modified CSP to allow MCP connections
(function() {
    // Override CSP to allow connections to any address (for MCP Server)
    var meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://storage.googleapis.com https://apis.google.com https://docs.google.com https://code.jquery.com blob:; " +
        "connect-src * ws: wss:; " +  // Allow all connections for MCP
        "img-src * data: blob:; " +
        "media-src * data:; " +
        "font-src * about: data:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "frame-src 'self' https://*.google.com;";

    // Insert at the beginning of head
    var firstChild = document.head.firstChild;
    if (firstChild) {
        document.head.insertBefore(meta, firstChild);
    } else {
        document.head.appendChild(meta);
    }
})();
