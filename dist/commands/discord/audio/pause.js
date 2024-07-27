"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const command = new discord_js_1.SlashCommandBuilder()
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
const pausedMessage = {
    'en-US': 'Audio paused',
    'es-419': 'Audio en pausa',
    'es-ES': 'Audio en pausa',
    'pt-BR': 'Áudio pausado',
};
const Command = {
    slashCommand: command,
    async execute(interaction, bot) {
        if (!(interaction.member instanceof discord_js_1.GuildMember) || !bot.memberInVoiceChannel(interaction.member, true)) {
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
exports.default = Command;
