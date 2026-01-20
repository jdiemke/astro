FROM node:lts-alpine AS runtime
WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

ENV HOST=0.0.0.0
ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/Angular-SSR-PoC/server/server.mjs"]

