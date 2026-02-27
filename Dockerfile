FROM node:22-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install

FROM base AS build
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=nextjs:nextjs /app ./
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
