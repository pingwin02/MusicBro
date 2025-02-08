FROM pingwin02/node-ffmpeg-build

COPY . .

ENV NODE_ENV=production YTDL_NO_UPDATE=1 NODE_NO_WARNINGS=1

RUN npm install && npm run deploy

ENTRYPOINT [ "npm", "start" ]
