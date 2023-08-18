FROM node:18-alpine

# Creating app directory
WORKDIR /usr/src/app

# Copying with * to include both package.json and package-lock.json
COPY package*.json ./

RUN npm ci

COPY src ./src
COPY tsconfig.release.json ./
COPY tsconfig.json ./

RUN npm run build:release

CMD [ "node", "build/src/main.js" ]