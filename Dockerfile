FROM node:24-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY public ./public
COPY admin ./admin
RUN mkdir -p /data
ENV PORT=4317 DATA_DIR=/data
EXPOSE 4317
CMD ["node", "server.mjs"]
