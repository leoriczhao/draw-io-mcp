FROM jgraph/drawio:latest

# Copy plugin with correct permissions
COPY --chmod=644 plugins/ /usr/local/tomcat/webapps/draw/plugins/

# Copy PreConfig.js to override CSP (allow MCP connections)
COPY --chmod=644 PreConfig.js /usr/local/tomcat/webapps/draw/js/PreConfig.js

# Copy PostConfig.js to auto-load plugin
COPY --chmod=644 PostConfig.js /usr/local/tomcat/webapps/draw/js/PostConfig.js

EXPOSE 8080
