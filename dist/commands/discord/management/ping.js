"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const command = new discord_js_1.SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s ping')
    .setDescriptionLocalizations({
    'en-US': 'Check the bot\'s ping',
    'es-419': 'Verificar el ping del bot',
    'es-ES': 'Verificar el ping del bot',
    'pt-BR': 'Verificar o ping do bot',
});
const Command = {
    slashCommand: command,
    async execute(interaction, bot) {
        const ping = bot.client().ws.ping;
        await interaction.reply({ content: `Pong! ${ping}ms`, ephemeral: true });
    },
};
exports.default = Command;
