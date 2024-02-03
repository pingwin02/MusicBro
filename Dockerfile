FROM node:18

WORKDIR /app

COPY . .

RUN apt update && apt install -y ffmpeg && npm install

ENTRYPOINT [ "npm", "start" ]