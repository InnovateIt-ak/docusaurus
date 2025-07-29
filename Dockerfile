FROM node:latest AS dev

WORKDIR /srv/app
RUN apt-get update && apt-get install -y graphviz

#ENTRYPOINT ["/bin/bash", "-c","tail -f /dev/null"]
ENTRYPOINT ["npm", "run","start"]

FROM node:latest AS prod_build
RUN apt-get update && apt-get install -y git
RUN apt-get update && apt-get install -y graphviz

WORKDIR /srv/app
COPY . .
RUN npm run build-likec4-react
RUN npm run clear && npm install && npm run build


FROM caddy:latest AS prod


COPY --from=prod_build /srv/app/build /usr/share/caddy
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
