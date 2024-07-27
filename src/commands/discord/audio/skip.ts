import { GuildMember, SlashCommandBuilder } from 'discord.js';
import { DiscordCommand } from '../../../lib/DiscordCommand';
import DiscordBot from '../../../bot/discord';

const command = new SlashCommandBuilder()
	.setName('skip')
  .setNameLocalizations({
    'en-US': 'skip',
    'es-419': 'saltar',
    'es-ES': 'saltar',
    'pt-BR': 'pular',
  })
	.setDescription('Skip the current audio')
  .setDescriptionLocalizations({
    'en-US': 'Skip the current audio',
    'es-419': 'Saltar el audio actual',
    'es-ES': 'Saltar el audio actual',
    'pt-BR': 'Pular o áudio atual',
    });

const skipMessage: Record<string, string> = {
  'en-US': 'Skipped!',
  'es-419': '¡Saltado!',
  'es-ES': '¡Saltado!',
  'pt-BR': 'Pulado!',
};

const Command: DiscordCommand = {
  slashCommand: command,
  async execute(interaction, bot: DiscordBot) {
    if (!(interaction.member instanceof GuildMember) || !bot.memberInVoiceChannel(interaction.member, true)) {
      return interaction.reply({
        content: 'We need to be in the same voice channel for this command to work.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const queue = bot.queue();

    if (!queue) {
      return interaction.reply({ content:  'No audio is being played.', ephemeral: true });
    }

    queue.node.skip();

    return interaction.followUp({ content: skipMessage[interaction.locale] || skipMessage['en-US'] });
  },
};

export default Command;
