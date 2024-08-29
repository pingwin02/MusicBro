FROM node:18

WORKDIR /app

RUN apt update && apt install -y ffmpeg

COPY . .

ENV NODE_ENV=production

RUN npm install && npm run deploy

ENTRYPOINT [ "npm", "start" ]
