FROM jgraph/drawio:latest

COPY --chmod=644 plugins/ /usr/local/tomcat/webapps/draw/plugins/
COPY --chmod=644 PostConfig.js /usr/local/tomcat/webapps/draw/js/PostConfig.js
COPY --chmod=644 PreConfig.js /usr/local/tomcat/webapps/draw/js/PreConfig.js

EXPOSE 8080
