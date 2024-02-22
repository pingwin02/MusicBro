FROM node:18

WORKDIR /app

RUN apt update && apt install -y ffmpeg

COPY . .

RUN npm install

ENTRYPOINT [ "npm", "start" ]