FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY server.js ./
COPY favicon.ico favicon-96x96.png favicon.svg site.webmanifest \
     apple-touch-icon.png web-app-manifest-192x192.png web-app-manifest-512x512.png ./
EXPOSE 8080
CMD ["node", "server.js"]
