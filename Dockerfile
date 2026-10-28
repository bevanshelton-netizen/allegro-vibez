FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js /usr/share/nginx/html/app.js
COPY healthz /usr/share/nginx/html/healthz
COPY robots.txt /usr/share/nginx/html/robots.txt
COPY sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY 404.html /usr/share/nginx/html/404.html
COPY site.webmanifest /usr/share/nginx/html/site.webmanifest
COPY public/creator-os /usr/share/nginx/html/creator-os
EXPOSE 8080
RUN sed -i 's/listen       80;/listen       8080;/' /etc/nginx/conf.d/default.conf \
 && sed -i '/server_name/a\    location = /creator-studio { rewrite ^ /creator-studio/ permanent; }\n    location ^~ /creator-studio/ { rewrite ^/creator-studio/(.*)$ /creator-os/$1 last; }' /etc/nginx/conf.d/default.conf \
 && sed -i '/server_name/a\    error_page 404 /404.html;' /etc/nginx/conf.d/default.conf
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
CMD ["nginx","-g","daemon off;"]
