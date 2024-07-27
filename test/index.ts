import dotenv from 'dotenv';

dotenv.config();

import { default as ModerationClient } from '@joliegg/moderation';
import { Client, Embed, EmbedBuilder, Events, Message, MessageCreateOptions, MessagePayload, PartialMessage } from 'discord.js';

import { DiscordBot, DiscordCommand, DiscordCommands } from './../dist';
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
    'discord.gg',
    'discord .gg',
  ],
});

const configuration = {
  token: process.env.DISCORD_TOKEN!!,
  publickey: process.env.DISCORD_PUBLIC_KEY!!,
  clientId: process.env.DISCORD_CLIENT_ID!!,
  guildId: process.env.DISCORD_GUILD_ID!!,
  languages: ['en-US', 'es-US'],
  logsChannel: process.env.DISCORD_LOGS_CHANNEL_ID,

  player: {},

  tts: {
    directory: __dirname
  }
};

(async () => {
  // const result = await DiscordBot.deploy(configuration, DiscordCommands);

  // console.log(result);

  const bot = new DiscordBot(configuration, moderationClient, console);

  bot.on('moderation', function(this: DiscordBot, embed: EmbedBuilder, moderation: ModerationCategory[], message: Message<boolean> | PartialMessage) {
    this.message(process.env.DISCORD_MODERATION_CHANNEL_ID || '', { embeds: [embed] });
  });

  bot.on('ready', function(this: DiscordBot, client: Client) {
    console.log(`Ready! Logged in as ${client.user?.tag}`);
  });

  bot.on('log', (type: string, message: string | MessagePayload | MessageCreateOptions) => {
    console.log(`[${type}] ${message}`);
  });

  bot.on(Events.MessageCreate, async function(this: DiscordBot, message: Message<boolean>) {
    if (message.author.bot) return;

    if (message.content.indexOf('\'') === 0 && message.member) {
      await bot.tts(message.member, message.content.substring(1), 'en-US');
    }
  });

  DiscordCommands.forEach((command, name) => {
    bot.command(name, command);
  });

  await bot.connect();
})();
