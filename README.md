# MusicBro

<p align="center">
  <img src="img/bot_logo.png" width="150" height="150">
</p>

MusicBro is a music bot for Discord, built using discord.js and discord-player.

## Commands

MusicBro provides the following slash commands:

1. `info` - Displays information about the bot's ping.
2. `nowplaying` - Displays information about the currently playing song.
3. `play` - Searches for a song or songs based on a link or search query and starts playing.
4. `remove` - Removes a song from the queue.
5. `seek` - Seeks to a specified time in the current song.
6. `skipto` - Skips to a specified song in the queue.
7. `volume` - Adjusts the volume of the playback.

And also the following button commands:

1. `loopDisable` - Disables looping.
2. `loopQueue` - Loops the queue.
3. `loopTrack` - Loops the current song.
4. `next` - Changes page to the next page of the queue.
5. `pause` - Pauses the playback.
6. `previous` - Changes page to the previous page of the queue.
7. `refresh` - Refreshes the status message.
8. `resume` - Resumes the playback.
9. `shuffle` - Shuffles the queue.
10. `skip` - Skips the current song.
11. `stop` - Stops the playback and clears the queue.

Additionally, MusicBro provides the following prefix commands:

- `!!clear` - Deletes messages sent by the bot in the current channel.
- `!!avatar_update` - Updates the bot's avatar and banner.\*

\*These commands are only available to the bot's admin.

## Example status messages

<p align="center">
  <img src="img/status_message.png" width="500">
</p>
<p align="center">
  <img src="img/status_message_2.png" width="500">
</p>

## Logging

MusicBro logs events in 2 different files:

1. `log.log` - Logs all events.
2. `debug.log` - Logs only debug events from the `discord-player` package. (run `npm run debug` to enable)

## Setup

1. Clone this repository to your local machine.
2. Install the required dependencies using the following command:

```
npm install
```

3. Create a `.env` file in the project's root directory and add the following environment variables:

- `TOKEN`: Token of the bot.
- `CLIENT_ID`: Client ID of the bot.
- `ADMIN_ID`: ID of the admin.

  Optional:

  - `TOKEN_DEV`: Token of the bot for development purposes.
  - `CLIENT_ID_DEV`: Client ID of the bot for development purposes.

For example:

```
TOKEN=1234567890
CLIENT_ID=1234567890
```

4. Register your bot's slash commands using the following command:

```
npm run deploy
```

5. Run the bot using the following command:

```
npm start
```

I personally recommend using `nodemon` to run the bot, as it will automatically restart the bot when you make changes to the code.
To use `nodemon`, run the following command:

```
nodemon
```

The bot should now be online and ready to use in your Discord server.

For development purposes, you can run the bot using the command `npm run dev`.

## Known Issues

- Spotify and SoundCloud are not supported for now.
- When in queue is NSFW or premium video, bot might crash, because of
  extractor error: `ERR_NO_RESULT: Could not extract stream for this track`.

## License

MusicBro is released under the [MIT License](LICENSE).

## Credits

MusicBro was created by pingwin02.
