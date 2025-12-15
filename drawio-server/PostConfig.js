// PostConfig.js - Auto-load MCP plugin after Draw.io initializes
// This runs after the app is loaded

(function() {
    // Wait for Draw.io to be ready, then load our plugin
    var checkReady = setInterval(function() {
        if (typeof Draw !== 'undefined' && Draw.loadPlugin) {
            clearInterval(checkReady);
            // Load the MCP executor plugin
            try {
                var script = document.createElement('script');
                script.src = 'plugins/mcp-executor.js';
                document.head.appendChild(script);
                console.log('[MCP] Loading mcp-executor.js');
            } catch (e) {
                console.error('[MCP] Failed to load plugin:', e);
            }
        }
    }, 100);
})();
