[![Hippocratic License HL3-CL](https://img.shields.io/static/v1?label=Hippocratic%20License&message=HL3-CL&labelColor=5e2751&color=bc8c3d)](https://firstdonoharm.dev/version/3/0/cl.html)

# Jolie Bot

A proof of concept basis for a multi-service bot with built-in moderation and some other utilities to help you develop a custom bot faster.

## About Built-In Moderation

Bot moderation relies on [@joliegg/moderation](https://github.com/joliegg/moderation). 

It will automatically give a **24 hour timeout** to any user who posts a well-known malicious URL.

URL Shorteners are also forbidden as they are commonly used in many online scams. As posting one could be just
a well intended mistake, timeout for those is only **5 seconds** (enough to prevent some bots from posting more). 

Text, images (including GIFs) and audios will also be moderated but do not take any action other than reporting it to the designated moderation channel.

## Discord Setup

### Environment Variables

The following env variables are required for the bot to function. You can get all these when creating a new App in the [Discord Developers Dashboard](https://discord.com/developers)

```bash
DISCORD_TOKEN
DISCORD_PUBLIC_KEY
DISCORD_CLIENT_ID
DISCORD_GUILD_ID
```

The following are **optional** and will enable more features of the bot. Also mind, these features come with an extra cost at each of the platforms used.

```bash
# Used for image moderation
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# Used for text moderation, audio moderation and TTS
GOOGLE_APPLICATION_CREDENTIALS
GOOGLE_API_KEY
```

### Sample

This is a very simple sample to get started:

```ts
import dotenv from 'dotenv';

dotenv.config();

import { default as ModerationClient } from '@joliegg/moderation';
import { Client, Embed, EmbedBuilder, Events, Message, MessageCreateOptions, MessagePayload, PartialMessage } from 'discord.js';

import { DiscordBot, DiscordCommand, DiscordCommands } from '@joliegg/bot';
import { ModerationCategory } from '@joliegg/moderation/dist/types';

const moderationClient = new ModerationClient({
  aws: {
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    },
  },
  google: {
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    apiKey: process.env.GOOGLE_API_KEY
  },
  banList: ['badword'],
  urlBlackList: [
    'discord.gg', // Ban discord invitations (commonly spam source)
  ],
});

const configuration = {
  token: process.env.DISCORD_TOKEN!!,
  publickey: process.env.DISCORD_PUBLIC_KEY!!,
  clientId: process.env.DISCORD_CLIENT_ID!!,
  guildId: process.env.DISCORD_GUILD_ID!!,
  languages: ['en-US', 'es-US'],

  logsChannel: process.env.DISCORD_LOGS_CHANNEL_ID, // Optional. 

  player: {}, // Saved for discord-player configuration

  tts: {
    directory: __dirname // The place to store the audio files generated
  }
};

(async () => {
  // Setup our bot with the configuration and moderation client we defined above.
  // Last argument allows for custom loggers.
  const bot = new DiscordBot(configuration, moderationClient, console);

  bot.on('moderation', function(this: DiscordBot, embed: EmbedBuilder, moderation: ModerationCategory[], message: Message<boolean> | PartialMessage) {
    // Send all moderation messages to a channel
    this.message(process.env.DISCORD_MODERATION_CHANNEL_ID!!, { embeds: [embed] });
  });

  bot.on('ready', function(this: DiscordBot, client: Client) {
    console.log(`Ready! Logged in as ${client.user?.tag}`);
  });

  bot.on('log', (type: string, message: string | MessagePayload | MessageCreateOptions) => {
    // If you did not provide a logsChannel ID in the configuration, you can still do
    // things with it here like sending it to the mods.
    console.log(`[${type}]`, message);
  });

  bot.on(Events.MessageCreate, async function(this: DiscordBot, message: Message<boolean>) {
    if (message.author.bot) return;

    // Read texts outloud in the voice channel
    if (message.content.indexOf('\'') === 0 && message.member) {
      await bot.tts(message.member, message.content.substring(1), 'en-US');
    }
  });

  DiscordCommands.forEach((command, name) => {
    bot.command(name, command);
  });

  await bot.connect();
})();
```

## Twitch Setup

Twitch uses normal accounts for bots so you'll have to create an account for your bot. It also requires an application to be created which you can do in the [Twitch Developers Console](https://dev.twitch.tv/console).

You will need to use that account and app to authenticate via OAuth and get an access token. How you handle that is entirely up to you.

### Environment Variables

The same env variables apply to twitch when it comes to moderation. 

### Sample

```ts
// Since tokens expire, we need to re-authenticate the bot when that happens.
const setupTwitch = async (accessToken: string) => {
  const bot = new TwitchBot({
    options: { debug: true },
    identity: {
      username: 'your_bot_username', // From the account you created
      password: accessToken // OAuth access token
    },
    channels: ['SomeChannel'] // A list of channels (by name) to which you want the bot to connect
  }, moderationClient, console);

  // What to do when a moderation event is detected
  bot.on('moderation', async (title: string, moderation: ModerationCategory[], message: string, channel: string, userState: ChatUserState) => {

  });

  bot.on('message', async (target: string, context: ChatUserState, msg: string, self: boolean) => {
    const user = context['display-name'];
    const isCommand = msg.startsWith('!');

    const isMod = context.mod === true;
    const isSubscriber = context.subscriber === true;
    const isVip = context.vip === true;

    // Do something with messages
  });

  bot.connect();
};

// We call this every time the token expires.
setupTwitch(accessToken);
```
