import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { DiscordCommand } from '../../../lib/DiscordCommand';
import DiscordBot from '../../../bot/discord';

const command = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Check the bot\'s ping')
  .setDescriptionLocalizations({
    'en-US': 'Check the bot\'s ping',
    'es-419': 'Verificar el ping del bot',
    'es-ES': 'Verificar el ping del bot',
    'pt-BR': 'Verificar o ping do bot',
  });


const Command: DiscordCommand = {
  slashCommand: command,
  async execute(interaction: ChatInputCommandInteraction, bot: DiscordBot) {
    const ping = bot.client().ws.ping;

    await interaction.reply({ content: `Pong! ${ping}ms`, ephemeral: true });
  },
};

export default Command;
