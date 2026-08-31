FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts --no-audit --no-fund

COPY . .

ARG VITE_IZAKHONO_CORE_URL
ARG VITE_IZAKHONO_PROJECT=allegro_vibez
ARG VITE_IZAKHONO_PUBLIC_KEY
ENV VITE_IZAKHONO_CORE_URL=$VITE_IZAKHONO_CORE_URL
ENV VITE_IZAKHONO_PROJECT=$VITE_IZAKHONO_PROJECT
ENV VITE_IZAKHONO_PUBLIC_KEY=$VITE_IZAKHONO_PUBLIC_KEY

RUN npm run verify:all

FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
