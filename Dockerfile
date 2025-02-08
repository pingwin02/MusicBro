FROM node:slim

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg make gcc g++

COPY . .

ENV NODE_ENV=production

RUN npm install && npm run deploy

ENTRYPOINT [ "npm", "start" ]
