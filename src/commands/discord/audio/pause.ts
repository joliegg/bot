import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import { DiscordCommand } from "../../../lib/DiscordCommand";
import DiscordBot from "../../../bot/discord";

const command = new SlashCommandBuilder()
	.setName('pause')
  .setNameLocalizations({
    'en-US': 'pause',
    'es-419': 'pausar',
		'es-ES': 'pausar',
		'pt-BR': 'pausar',
	})
	.setDescription('Pause audio')
  .setDescriptionLocalizations({
    'en-US': 'Pause audio',
    'es-419': 'Pausar audio',
    'es-ES': 'Pausar audio',
    'pt-BR': 'Pausar áudio',
  });

const pausedMessage: Record<string, string> = {
  'en-US': 'Audio paused',
  'es-419': 'Audio en pausa',
  'es-ES': 'Audio en pausa',
  'pt-BR': 'Áudio pausado',
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

    queue.node.setPaused(!queue.node.isPaused());

    return interaction.followUp({ content: pausedMessage[interaction.locale] || pausedMessage['en-US'] });
  },
};

export default Command;
