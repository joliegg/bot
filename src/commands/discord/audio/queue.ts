import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import { DiscordCommand } from "../../../lib/DiscordCommand";
import DiscordBot from "../../../bot/discord";


const command = new SlashCommandBuilder()
	.setName('queue')
  .setNameLocalizations({
    'en-US': 'queue',
    'es-419': 'lista',
    'es-ES': 'lista',
    'pt-BR': 'lista',
  })
	.setDescription('Show the queue')
  .setDescriptionLocalizations({
    'en-US': 'Show the queue',
    'es-419': 'Lista de reproducción',
    'es-ES': 'Lista de reproducción',
    'pt-BR': 'Lista de reprodução',
  });

const queueTitle: Record<string, string> = { 
  'en-US': 'Queue',
  'es-419': 'Lista de reproducción',
  'es-ES': 'Lista de reproducción',
  'pt-BR': 'Lista de reprodução',
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

    const tracks = queue.tracks.toArray();

    let list = '';
    const embeds = [];

    const current = queue.currentTrack;

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const item = `* **#${i}** - ${track.title}\n`;
      const attempt = list + item;
      
      if (attempt.length >= 4096) {
        embeds.push({
          color: 0x0099ff,
          title: current !== null ? `**${current.title}**` : queueTitle[interaction.locale] || queueTitle['en-US'],
          description: list,
        });
        list = '';
      } else {
        list = attempt;
      }
    }

   if (list !== '') {
    embeds.push({
      color: 0x0099ff,
      title: current !== null ? `**${current.title}**` : queueTitle[interaction.locale] || queueTitle['en-US'],
      description: list,
    });
   }

   if (embeds.length > 0) {
    return interaction.reply({ embeds });
   }

   if (current !== null) {
    return interaction.reply({ content: `**${current.title}**` });
   }

   return interaction.reply({ content:  'No audio is being played.', ephemeral: true });
  },
};

export default Command;
