# MusicBot

<p align="center">
  <img src="website/bot_logo.png" width="150" height="150">
</p>

MusicBot is a music bot for Discord, built using discord.js and discord-player.

## Requirements

- "@discord-player/extractor"
- "@discordjs/opus"
- "discord-player"
- "discord.js"
- "dotenv"
- "ffmpeg-static"
- "ytdl-core"

## Commands

MusicBot provides the following 12 commands:

1. `info` - Displays information about the bot's ping.
2. `leave` - Makes the bot leave the voice channel.
3. `loop` - Controls the looping of the currently playing track.
4. `nowplaying` - Displays the currently playing track.
5. `pause` - Pauses or resumes the playback.
6. `play` - Searches for a song or songs based on a link or search query and starts playing.
7. `queue` - Displays the current song queue.
8. `resume` - Resumes playback after being paused.
9. `shuffle` - Shuffles the song queue.
10. `skip` - Skips the currently playing song.
11. `skipto` - Skips to a specified song in the queue.
12. `volume` - Adjusts the volume of the playback.

Additionally, MusicBot provides the ability to clear leftover messages from the bot in the channel using the `!!clear` command.

## Logging

MusicBot logs events in 2 different files:

1. `log.log` - Logs all events.
2. `debug.log` - Logs only debug events from the `discord-player` package. (Disabled by default)

## Setup

1. Clone this repository to your local machine.
2. Install the required dependencies using the following command:

```
npm install
```

3. Create a `.env` file in the project's root directory and add the following environment variables:

```
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_bot_client_id
```

Replace `your_discord_bot_token` with your actual Discord bot token and `your_discord_bot_client_id` with your actual Discord bot client ID.

4. Register your bot's slash commands using the following command:

```
npm run deploy
```

5. Run the bot using the following command:

```
npm start
```

I personally recommend using `nodemon` to run the bot, as it will automatically restart the bot when you make changes to the code. To use `nodemon`, run the following command:

```
nodemon
```

The bot should now be online and ready to use in your Discord server.

## Known Issues

- When in queue is NSFW or premium video, bot will crash, because of
  extractor error `ERR_NO_RESULT: Could not extract stream for this track`.
- Spotify and SoundCloud links are not supported.

## License

MusicBot is released under the [MIT License](LICENSE.txt).

## Credits

MusicBot was created by pingwin02.
