"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const discord_player_1 = require("discord-player");
const utils_1 = require("../utils");
const tts_1 = require("../utils/tts");
const extractor_1 = require("@discord-player/extractor");
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const FIVE_SECONDS = 5 * 1000;
class DiscordBot {
    configuration;
    moderationClient;
    logger;
    _commands = new discord_js_1.Collection();
    listeners = new Map();
    _extras = {};
    _client;
    _player;
    static async deploy(configuration, commands) {
        const guildCommands = [];
        const globalCommands = [];
        commands.forEach((command) => {
            if ('slashCommand' in command && 'execute' in command && command.disabled !== true) {
                if (command.type === 'guild' || !command.type) {
                    guildCommands.push(command.slashCommand.toJSON());
                }
                else {
                    globalCommands.push(command.slashCommand.toJSON());
                }
            }
        });
        const rest = new discord_js_1.REST().setToken(configuration.token);
        // The put method is used to fully refresh all commands in the guild with the current set
        const guild = await rest.put(discord_js_1.Routes.applicationGuildCommands(configuration.clientId, configuration.guildId), {
            body: guildCommands
        });
        // The put method is used to fully refresh all commands in the guild with the current set
        const global = await rest.put(discord_js_1.Routes.applicationCommands(configuration.clientId), {
            body: globalCommands,
        });
        return {
            global: global,
            guild: guild,
        };
    }
    static async undeploy(configuration) {
        const rest = new discord_js_1.REST().setToken(configuration.token);
        await rest.put(discord_js_1.Routes.applicationGuildCommands(configuration.clientId, configuration.guildId), { body: [] });
        await rest.put(discord_js_1.Routes.applicationCommands(configuration.clientId), { body: [] });
    }
    constructor(configuration, moderationClient, logger) {
        this.configuration = configuration;
        this.moderationClient = moderationClient;
        this.logger = logger;
        this._client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMembers,
                discord_js_1.GatewayIntentBits.GuildPresences,
                discord_js_1.GatewayIntentBits.GuildVoiceStates,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
                discord_js_1.GatewayIntentBits.DirectMessages,
                discord_js_1.GatewayIntentBits.GuildEmojisAndStickers,
            ],
            partials: [
                discord_js_1.Partials.Message,
                discord_js_1.Partials.Channel,
                discord_js_1.Partials.Reaction,
            ],
        });
        if (this.configuration.player) {
            this._player = new discord_player_1.Player(this._client, this.configuration.player);
            this._player.extractors.register(extractor_1.AttachmentExtractor, {});
        }
        // Message Events
        this._client.on(discord_js_1.Events.MessageCreate, this._onMessage.bind(this));
        this._client.on(discord_js_1.Events.MessageUpdate, this._onMessageUpdate.bind(this));
        this._client.on(discord_js_1.Events.MessageDelete, this._onMessageDelete.bind(this));
        // Member Events
        this._client.on(discord_js_1.Events.GuildMemberAdd, this._onMemberAdd.bind(this));
        this._client.on(discord_js_1.Events.GuildMemberUpdate, this._onMemberUpdate.bind(this));
        this._client.on(discord_js_1.Events.GuildMemberRemove, this._onMemberRemove.bind(this));
        // Ban Events
        this._client.on(discord_js_1.Events.GuildBanAdd, this._onMemberBan.bind(this));
        this._client.on(discord_js_1.Events.GuildBanRemove, this._onMemberUnban.bind(this));
        // Interaction Events
        this._client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
            if (interaction.isChatInputCommand()) {
                const command = this._commands.get(interaction.commandName);
                if (!command) {
                    this.logger.error(`No command matching ${interaction.commandName} was found.`);
                    return this.trigger(discord_js_1.Events.InteractionCreate, interaction);
                }
                try {
                    await command.execute(interaction, this);
                }
                catch (error) {
                    await this.trigger(discord_js_1.Events.Error, error);
                    const message = {
                        content: 'There was an error while executing this command.',
                        ephemeral: true,
                    };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(message);
                    }
                    else {
                        await interaction.reply(message);
                    }
                }
            }
            else if (interaction.isAutocomplete()) {
                const command = this._commands.get(interaction.commandName);
                if (!command) {
                    this.logger.error(`No command matching ${interaction.commandName} was found.`);
                    return this.trigger(discord_js_1.Events.InteractionCreate, interaction);
                }
                if (!command.autocomplete) {
                    this.logger.error(`Command ${interaction.commandName} does not have an autocomplete method.`);
                    return this.trigger(discord_js_1.Events.InteractionCreate, interaction);
                }
                try {
                    await command.autocomplete(interaction, this);
                }
                catch (error) {
                    await this.trigger(discord_js_1.Events.Error, error);
                }
            }
            return this.trigger(discord_js_1.Events.InteractionCreate, interaction);
        });
        this._client.on(discord_js_1.Events.Debug, (info) => {
            this.logger.debug(info);
            return this.trigger(discord_js_1.Events.Debug, info);
        });
        this._client.on(discord_js_1.Events.Error, (error) => {
            this.logger.error(error);
            return this.trigger(discord_js_1.Events.Error, error);
        });
        this._client.on(discord_js_1.Events.ClientReady, (client) => {
            this.trigger('ready', client);
        });
    }
    client() {
        return this._client;
    }
    player() {
        return this._player;
    }
    guild() {
        return this._client.guilds.cache.get(this.configuration.guildId) || null;
    }
    command(name, command) {
        if (command) {
            this._commands.set(name, command);
        }
        return this._commands.get(name);
    }
    removeCommand(name) {
        return this._commands.delete(name);
    }
    me() {
        const guild = this.guild();
        return guild?.members.me || null;
    }
    memberInVoiceChannel(member, same = false) {
        if (member.voice.channel === null) {
            return false;
        }
        if (same) {
            const me = this.me();
            return !me?.voice.channelId || member.voice.channelId === me?.voice.channelId;
        }
        return true;
    }
    queue() {
        return (0, discord_player_1.useQueue)(this.configuration.guildId);
    }
    async tts(member, message, languageCode) {
        if (!this.configuration.tts?.directory || !this._player) {
            throw new Error('TTS is not configured');
        }
        if (!this.memberInVoiceChannel(member, true)) {
            throw new Error('Not in the same voice channel');
        }
        const audioFile = await (0, tts_1.tts)(message, languageCode, this.configuration.tts.directory);
        if (!audioFile) {
            throw new Error('Error generating TTS');
        }
        const queue = this.queue();
        const { track } = await this._player.play(member.voice.channel, audioFile, {
            searchEngine: discord_player_1.QueryType.FILE,
            nodeOptions: {
                metadata: message,
                leaveOnEndCooldown: 300000,
                selfDeaf: true,
                volume: 100,
            }
        });
        if (queue) {
            queue.node.jump(track);
        }
        return Promise.resolve(true);
    }
    setPresence(presence) {
        return this._client.user?.setPresence(presence);
    }
    presence() {
        return this._client.user?.presence;
    }
    extra(name, value) {
        if (value) {
            this._extras[name] = value;
        }
        return this._extras[name];
    }
    async _onMessage(message) {
        // Ignore messages from bots
        if (message.author.bot)
            return;
        if (!this._client.application?.owner) {
            await this._client.application?.fetch();
        }
        await this.moderateMessage(message);
        return this.trigger(discord_js_1.Events.MessageCreate, message);
    }
    async _onMessageUpdate(oldMessage, newMessage) {
        if (oldMessage.author && !newMessage.author) {
            newMessage.author = oldMessage.author;
        }
        // Ignore messages from bots
        if (newMessage.author?.bot)
            return;
        if (!this._client.application?.owner) {
            await this._client.application?.fetch();
        }
        if (oldMessage.content !== newMessage.content) {
            try {
                const embeds = [];
                if (oldMessage.content || newMessage.content || oldMessage.stickers.size > 0) {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0xff9500)
                        .setTitle('Message Updated')
                        .setURL(newMessage.url)
                        .setAuthor({
                        name: newMessage.author?.username || '',
                        iconURL: newMessage.author?.displayAvatarURL() || '',
                    })
                        .setDescription(newMessage.content || '')
                        .addFields([
                        {
                            name: 'Previous Content',
                            value: oldMessage.content || '[No Content]',
                            inline: false,
                        },
                        {
                            name: 'Channel',
                            value: `<#${oldMessage.channelId}>`,
                            inline: true,
                        }
                    ])
                        .setTimestamp(newMessage.editedAt || new Date());
                    if (oldMessage.stickers.size > 0) {
                        const sticker = oldMessage.stickers.first();
                        if (sticker) {
                            embed.setImage(sticker.url);
                        }
                    }
                    embeds.push(embed);
                }
                if (oldMessage.attachments) {
                    for (const attachment of oldMessage.attachments.values()) {
                        const embed = new discord_js_1.EmbedBuilder()
                            .setColor(0xff9500)
                            .setTitle('Message Updated')
                            .setURL(newMessage.url)
                            .setAuthor({
                            name: newMessage.author?.username || '',
                            iconURL: newMessage.author?.displayAvatarURL() || '',
                        })
                            .setDescription(newMessage.content || '')
                            .addFields([
                            {
                                name: 'Channel',
                                value: `<#${oldMessage.channelId}>`,
                                inline: true,
                            },
                            {
                                name: 'Content Type',
                                value: attachment.contentType || 'Unknown',
                                inline: true,
                            },
                            {
                                name: 'URL',
                                value: attachment.url,
                                inline: false,
                            }
                        ])
                            .setTimestamp(newMessage.editedAt || new Date());
                        if (attachment.contentType && attachment.contentType.indexOf('image') === 0) {
                            embed.setImage(attachment.url);
                        }
                        embeds.push(embed);
                    }
                }
                if (embeds.length > 0) {
                    await this.log('message', { embeds });
                }
            }
            catch (error) {
                this.logger.error(error);
            }
            await this.moderateMessage(newMessage);
        }
        return this.trigger(discord_js_1.Events.MessageUpdate, oldMessage, newMessage);
    }
    messageEmbed(title, color, message) {
        const embeds = [];
        if (message.content || message.stickers.size > 0) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setURL(message.url)
                .setAuthor({
                name: message.author?.username || '',
                iconURL: message.author?.displayAvatarURL() || '',
            })
                .setDescription(message.content || '')
                .addFields([
                {
                    name: 'Channel',
                    value: `<#${message.channelId}>`,
                    inline: true,
                }
            ])
                .setTimestamp(message.editedAt || new Date());
            if (message.stickers.size > 0) {
                const sticker = message.stickers.first();
                if (sticker) {
                    embed.setImage(sticker.url);
                }
            }
            embeds.push(embed);
        }
        if (message.attachments) {
            for (const attachment of message.attachments.values()) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(color)
                    .setTitle(title)
                    .setURL(message.url)
                    .setAuthor({
                    name: message.author?.username || '',
                    iconURL: message.author?.displayAvatarURL() || '',
                })
                    .setDescription(message.content || '')
                    .addFields([
                    {
                        name: 'Channel',
                        value: `<#${message.channelId}>`,
                        inline: true,
                    },
                    {
                        name: 'Content Type',
                        value: attachment.contentType || 'Unknown',
                        inline: true,
                    },
                    {
                        name: 'URL',
                        value: attachment.url,
                        inline: false,
                    }
                ])
                    .setTimestamp(message.editedAt || new Date());
                if (attachment.contentType && attachment.contentType.indexOf('image') === 0) {
                    embed.setImage(attachment.url);
                }
                embeds.push(embed);
            }
        }
        return embeds;
    }
    async _onMessageDelete(message) {
        try {
            const embeds = [];
            if (message.content || message.stickers.size > 0) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0xFF3A2D)
                    .setTitle('Message Deleted')
                    .setURL(message.url)
                    .setAuthor({
                    name: message.author?.username || '',
                    iconURL: message.author?.displayAvatarURL() || '',
                })
                    .setDescription(message.content || '')
                    .addFields([
                    {
                        name: 'Channel',
                        value: `<#${message.channelId}>`,
                        inline: true,
                    }
                ])
                    .setTimestamp(message.editedAt || new Date());
                if (message.stickers.size > 0) {
                    const sticker = message.stickers.first();
                    if (sticker) {
                        embed.setImage(sticker.url);
                    }
                }
                embeds.push(embed);
            }
            if (message.attachments) {
                for (const attachment of message.attachments.values()) {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0xFF3A2D)
                        .setTitle('Message Deleted')
                        .setURL(message.url)
                        .setAuthor({
                        name: message.author?.username || '',
                        iconURL: message.author?.displayAvatarURL() || '',
                    })
                        .setDescription(message.content || '')
                        .addFields([
                        {
                            name: 'Channel',
                            value: `<#${message.channelId}>`,
                            inline: true,
                        },
                        {
                            name: 'Content Type',
                            value: attachment.contentType || 'Unknown',
                            inline: true,
                        },
                        {
                            name: 'URL',
                            value: attachment.url,
                            inline: false,
                        }
                    ])
                        .setTimestamp(message.editedAt || new Date());
                    if (attachment.contentType && attachment.contentType.indexOf('image') === 0) {
                        embed.setImage(attachment.url);
                    }
                    embeds.push(embed);
                }
            }
            if (embeds.length > 0) {
                await this.log('message', { embeds });
            }
        }
        catch (error) {
            this.logger.error(error);
        }
        return this.trigger(discord_js_1.Events.MessageDelete, message);
    }
    memberEmbed(member) {
        const embed = new discord_js_1.EmbedBuilder()
            .setThumbnail(member.user.displayAvatarURL())
            .setColor(0x3f51b5)
            .setAuthor({
            name: member.user.username,
            iconURL: member.user.displayAvatarURL(),
        })
            .addFields([
            {
                name: 'Username',
                value: member.user.username,
                inline: true,
            },
            {
                name: 'Nickname',
                value: member.nickname || member.user.username,
                inline: true,
            },
            {
                name: 'Joined',
                value: member.joinedAt?.toLocaleDateString() || new Date().toLocaleDateString(),
                inline: true,
            },
            {
                name: 'Created',
                value: member.user.createdAt.toLocaleDateString(),
                inline: true,
            },
            {
                name: 'Roles',
                value: member.roles.cache.map(r => r.name).join(', '),
                inline: true,
            },
        ])
            .setFooter({
            text: `ID: ${member.id}`,
        });
        return embed;
    }
    async _onMemberAdd(member) {
        if (this.configuration.logsChannel) {
            const embed = this.memberEmbed(member)
                .setTitle('Member Joined');
            await this.log('member', { embeds: [embed] });
        }
        return this.trigger(discord_js_1.Events.GuildMemberAdd, member);
    }
    async _onMemberUpdate(oldMember, newMember) {
        if (this.configuration.muteRole) {
            const hadMuteRole = oldMember.roles.cache.has(this.configuration.muteRole);
            const hasMuteRole = newMember.roles.cache.has(this.configuration.muteRole);
            if (hadMuteRole && !hasMuteRole) {
                await this.trigger('unmute', newMember);
            }
            else if (!hadMuteRole && hasMuteRole) {
                await this.trigger('mute', newMember);
            }
        }
        if (this.configuration.logsChannel) {
            // Check for nickname changes
            if (oldMember.nickname !== newMember.nickname) {
                const embed = this.memberEmbed(newMember).setColor(0xe65100);
                if (newMember.nickname === null) {
                    embed.setTitle('Nickname Removed')
                        .setDescription(`Previous Nickname: **${oldMember.nickname}**`);
                }
                else {
                    embed.setTitle('Nickname Changed')
                        .setDescription(`Previous Nickname: **${oldMember.nickname}**`);
                }
                await this.log('member', { embeds: [embed] });
            }
            // Check for username changes
            if (oldMember.user.username !== newMember.user.username) {
                const embed = this.memberEmbed(newMember)
                    .setTitle('Username Changed')
                    .setColor(0xe65100)
                    .setDescription(`Previous Username: **${oldMember.user.username}**`);
                await this.log('member', { embeds: [embed] });
            }
            // Check for avatar changes
            if (oldMember.user.displayAvatarURL() !== newMember.user.displayAvatarURL()) {
                const embed = this.memberEmbed(newMember)
                    .setTitle('Avatar Changed')
                    .setColor(0xe65100)
                    .setImage(oldMember.user.displayAvatarURL());
                await this.log('member', { embeds: [embed] });
            }
        }
        return this.trigger(discord_js_1.Events.GuildMemberUpdate, oldMember, newMember);
    }
    async _onMemberRemove(member) {
        if (this.configuration.logsChannel) {
            const embed = this.memberEmbed(member)
                .setColor(0x212121)
                .setTitle('Member Left');
            await this.log('member', { embeds: [embed] });
        }
        return this.trigger(discord_js_1.Events.GuildMemberRemove, member);
    }
    async _onMemberBan(ban) {
        return this.trigger(discord_js_1.Events.GuildBanAdd, ban);
    }
    async _onMemberUnban(ban) {
        return this.trigger(discord_js_1.Events.GuildBanRemove, ban);
    }
    on(event, listener) {
        const listeners = this.listeners.get(event) || [];
        listeners.push(listener);
        this.listeners.set(event, listeners);
        return this;
    }
    async trigger(event, ...args) {
        const listeners = this.listeners.get(event);
        if (Array.isArray(listeners)) {
            return Promise.all(listeners.map(listener => listener.call(this, ...args)));
        }
        return Promise.resolve();
    }
    async moderateMessage(message) {
        if (typeof message.content === 'string' && message.content !== '') {
            // Normalize the message
            const lowerCase = message.content.toLowerCase().replace(/discord\s*\.\s*gg/g, 'discord.gg');
            try {
                let possibleLinks = lowerCase.split(' ')
                    .filter(w => (0, utils_1.isURL)(w.trim()));
                let content = message.content;
                for (const link of possibleLinks) {
                    content = content.replace(link, '');
                    // Check for markdown links
                    if (link.indexOf('[') === 0 && link.lastIndexOf(')') === (link.length - 1)) {
                        // eslint-disable-next-line prefer-const
                        let [textPart, urlPart] = link.substring(1, link.length - 1).split('](');
                        possibleLinks = possibleLinks.filter(l => l !== link);
                        // Also check the text part just in case
                        if ((0, utils_1.isURL)(textPart)) {
                            possibleLinks.push(textPart);
                        }
                        possibleLinks.push(urlPart);
                    }
                }
                let timeOutGiven = 0;
                for (const link of possibleLinks) {
                    if (link.indexOf('https://tenor.com/view/') === 0) {
                        // This is just a GIF on Discord
                        continue;
                    }
                    try {
                        const { source, moderation } = await this.moderationClient.moderateLink(link);
                        if (moderation.length > 0) {
                            const member = message.member;
                            if (moderation.some(m => m.category === 'BLACK_LIST' || m.category === 'CUSTOM_BLACK_LIST')) {
                                const promises = [];
                                // Only timeout if we haven't already given one of same length
                                if (member && timeOutGiven < DAY_MILLISECONDS) {
                                    try {
                                        // It's likely that this fails if the member has higher permissions than the bot
                                        promises.push(member.timeout(DAY_MILLISECONDS, 'Suspicious Activity: Blacklisted Link'));
                                        timeOutGiven = DAY_MILLISECONDS;
                                        if (this.configuration.muteRole) {
                                            promises.push(member.roles.add(this.configuration.muteRole));
                                        }
                                    }
                                    catch (error) {
                                        this.logger.error(error);
                                    }
                                }
                                // Always delete the message
                                promises.push(message.delete());
                                await Promise.allSettled(promises);
                            }
                            else if (moderation.some(m => m.category === 'URL_SHORTENER')) {
                                const promises = [];
                                if (member && timeOutGiven < FIVE_SECONDS) {
                                    try {
                                        // It's likely that this fails if the member has higher permissions than the bot
                                        promises.push(member.timeout(FIVE_SECONDS, 'Suspicious Activity: Shortened URL'));
                                    }
                                    catch (error) {
                                        this.logger.error(error);
                                    }
                                }
                                promises.push(message.delete());
                                if (member) {
                                    promises.push(this.dm(member.user.id, `Your message in <#${message.channelId}> was deleted because it contained a shortened URL.`));
                                }
                                await Promise.allSettled(promises);
                            }
                            else {
                                await message.react('🚫');
                            }
                            // Report the moderation
                            await this.moderationReport('Link Moderation', moderation, message);
                        }
                        else {
                            await message.react('✅');
                        }
                    }
                    catch (error) {
                        this.logger.error(error);
                    }
                }
                const { source, moderation } = await this.moderationClient.moderateText(content, 50);
                if (moderation.length > 0) {
                    await this.moderationReport('Text Moderation', moderation, message);
                }
            }
            catch (error) {
                this.logger.error(error);
            }
        }
        // Moderate Images
        if (message.attachments) {
            for (const attachment of message.attachments.values()) {
                if (attachment.contentType === null) {
                    continue;
                }
                if (attachment.contentType.indexOf('image') > -1) {
                    try {
                        const { source, moderation } = await this.moderationClient.moderateImage(attachment.url);
                        if (moderation.length === 0) {
                            continue;
                        }
                        await this.moderationReport('Image Moderation', moderation, message, attachment.url);
                    }
                    catch (error) {
                        this.logger.error(error);
                    }
                }
                else if (attachment.contentType.indexOf('audio') > -1) {
                    try {
                        const languages = this.configuration.languages || ['en-US'];
                        for (const language of languages) {
                            const { source, moderation } = await this.moderationClient.moderateAudio(attachment.url, language, 50);
                            if (moderation.length === 0) {
                                continue;
                            }
                            message.content = source;
                            await this.moderationReport('Audio Moderation', moderation, message);
                        }
                    }
                    catch (error) {
                        this.logger.error(error);
                    }
                }
            }
        }
        if (message.embeds) {
            for (const embed of message.embeds) {
                if (embed.image) {
                    try {
                        const { source, moderation } = await this.moderationClient.moderateImage(embed.image.url);
                        if (moderation.length === 0) {
                            continue;
                        }
                        await this.moderationReport('Image Moderation', moderation, message, embed.image.url);
                    }
                    catch (error) {
                        this.logger.error(error);
                    }
                }
            }
        }
    }
    async message(channeld, message) {
        const channel = await this._client.channels.fetch(channeld);
        if (channel === null) {
            throw new Error(`Channel with ID "${channeld}" could not be found.`);
        }
        return channel.send(message);
    }
    async connect() {
        this._client.login(this.configuration.token);
    }
    async dm(userId, message) {
        return this._client.users.send(userId, message);
    }
    async moderationReport(title, moderation, message, attachment = null) {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xdbddde)
            .setTitle(title)
            .setURL(message.url)
            .setAuthor({
            name: message.author?.username || 'Unknown User',
            iconURL: message.author?.displayAvatarURL(),
        })
            .setDescription(message.content)
            .addFields(moderation.map(c => ({
            name: c.category,
            value: `${c.confidence.toFixed(2)}%`,
            inline: true,
        })));
        if (attachment !== null) {
            embed.setImage(attachment);
        }
        return this.trigger('moderation', embed, moderation, message);
    }
    async log(type, message) {
        if (this.configuration.logsChannel && (type === 'message' || type === 'member')) {
            await this.message(this.configuration.logsChannel, message);
        }
        return this.trigger('log', type, message);
    }
    replaceRowButton(message, oldButtonId, newButton) {
        const rows = message.components;
        const updated = rows.map(row => {
            if (row.components.some(component => component.customId === oldButtonId)) {
                const updatedComponents = row.components.map(component => component.customId === oldButtonId ? newButton : component);
                return new discord_js_1.ActionRowBuilder().addComponents(updatedComponents.map(c => c));
            }
            return row;
        });
        return updated;
    }
}
exports.default = DiscordBot;
