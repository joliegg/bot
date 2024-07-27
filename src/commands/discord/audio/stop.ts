import { GuildMember, ChatInputCommandInteraction, SlashCommandBuilder, ActivityType } from "discord.js";

import { DiscordCommand } from "../../../lib/DiscordCommand";
import DiscordBot from "../../../bot/discord";

const command = new SlashCommandBuilder()
	.setName('stop')
  .setNameLocalizations({
    'en-US': 'stop',
    'es-419': 'parar',
		'es-ES': 'parar',
		'pt-BR': 'parar',
	})
	.setDescription('Stop audio')
  .setDescriptionLocalizations({
    'en-US': 'Stop audio',
    'es-419': 'Detener audio',
    'es-ES': 'Detener audio',
    'pt-BR': 'Parar áudio',
  });

const stoppedMessage: Record<string, string> = {
  'en-US': 'Audio stopped',
  'es-419': 'Audio detenido',
  'es-ES': 'Audio detenido',
  'pt-BR': 'Áudio parado',
};

const Command: DiscordCommand = {
  slashCommand: command,
  async execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    if (!(interaction.member instanceof GuildMember) || !bot.memberInVoiceChannel(interaction.member, true)) {
      return interaction.reply({
        content: 'We need to be in the same voice channel for this command to work.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const queue = bot.queue();

    if (!queue) {
      return interaction.followUp({ content: 'No audio is being played.', ephemeral: true });
    }

    queue.delete();

    const presence = bot.presence();

    if (presence && presence.activities.some(a => a.type === ActivityType.Listening)) {
      bot.setPresence({ activities: [] });
    }

    return interaction.followUp({ content: stoppedMessage[interaction.locale] || stoppedMessage['en-US'] });
  },
};

export default Command;
