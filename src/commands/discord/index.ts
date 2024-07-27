import { Collection } from 'discord.js';

import PingCommand from './management/ping';

import PauseCommand from './audio/pause';
import QueueCommand from './audio/queue';
import SkipCommand from './audio/skip';
import StopCommand from './audio/stop';
import TTSCommand from './audio/tts';

import { DiscordCommand } from '../../lib/DiscordCommand';

const discordCommands: DiscordCommand[] = [
  // Management Module with Utility Commands
  PingCommand,

  // Audio Module Setup for TTS on Voice Channels
  PauseCommand,
  QueueCommand,
  SkipCommand,
  StopCommand,
  TTSCommand,
];

const commands: Collection<string, DiscordCommand> = new Collection();

discordCommands.forEach(command => {
  commands.set(command.slashCommand.name, command);
});

export default commands;
