"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const command = new discord_js_1.SlashCommandBuilder()
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
const skipMessage = {
    'en-US': 'Skipped!',
    'es-419': '¡Saltado!',
    'es-ES': '¡Saltado!',
    'pt-BR': 'Pulado!',
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
            return interaction.reply({ content: 'No audio is being played.', ephemeral: true });
        }
        queue.node.skip();
        return interaction.followUp({ content: skipMessage[interaction.locale] || skipMessage['en-US'] });
    },
};
exports.default = Command;
