FROM pingwin02/node-ffmpeg-build

WORKDIR /app

COPY package.json ./

ENV NODE_ENV=production NODE_NO_WARNINGS=1

RUN npm install

COPY . .

RUN npm --version

ENTRYPOINT [ "sh", "-c", "npm run deploy && exec npm start" ]