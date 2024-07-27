"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const command = new discord_js_1.SlashCommandBuilder()
    .setName('tts')
    .setDescription('Text to speech')
    .setDescriptionLocalizations({
    'en-US': 'Text to speech',
    'es-419': 'Texto a voz',
    'es-ES': 'Texto a voz',
    'pt-BR': 'Texto para fala',
})
    .addStringOption(option => option.setName('text')
    .setNameLocalizations({
    'en-US': 'text',
    'es-419': 'texto',
    'es-ES': 'texto',
    'pt-BR': 'texto',
})
    .setDescription('Text to speak')
    .setDescriptionLocalizations({
    'en-US': 'Text to speak',
    'es-419': 'Texto a hablar',
    'es-ES': 'Texto a hablar',
    'pt-BR': 'Texto para falar',
})
    .setRequired(true))
    .addStringOption(option => option.setName('language')
    .setNameLocalizations({
    'en-US': 'language',
    'es-419': 'idioma',
    'es-ES': 'idioma',
    'pt-BR': 'idioma',
})
    .setDescription('Language')
    .setDescriptionLocalizations({
    'en-US': 'Language',
    'es-419': 'Idioma',
    'es-ES': 'Idioma',
    'pt-BR': 'Idioma',
})
    .setRequired(false)
    .addChoices([
    {
        name: 'English',
        value: 'en-US'
    },
    {
        name: 'Español',
        value: 'es-US'
    },
    {
        name: 'Português',
        value: 'pt-BR'
    }
]));
const languageMap = {
    'en-US': 'en-US',
    'es-US': 'es-419',
    'pt-BR': 'pt-BR',
};
const Command = {
    slashCommand: command,
    async execute(interaction, bot) {
        try {
            if (!(interaction.member instanceof discord_js_1.GuildMember) || !bot.memberInVoiceChannel(interaction.member, true)) {
                return interaction.reply({
                    content: 'We need to be in the same voice channel for this command to work.',
                    ephemeral: true,
                });
            }
            const text = interaction.options.getString('text');
            if (!text) {
                return interaction.reply({
                    content: 'Text is required',
                    ephemeral: true,
                });
            }
            const language = interaction.options.getString('language') || languageMap[interaction.locale] || 'en-US';
            await interaction.deferReply();
            const play = await bot.tts(interaction.member, text, language);
            if (!play) {
                return interaction.followUp({
                    content: 'Error playing audio',
                });
            }
            return interaction.followUp({ content: text });
        }
        catch (error) {
            return interaction.followUp({
                content: 'There was an error trying to execute that command: ' + error.message || '',
            });
        }
    },
};
exports.default = Command;
