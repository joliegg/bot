"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const utils_1 = require("../utils");
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
class DiscordBot {
    configuration;
    moderationClient;
    logger;
    listeners = new Map();
    _client;
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
        this._client.on(discord_js_1.Events.ClientReady, (client) => {
            this.trigger('ready', client);
        });
    }
    client() {
        return this._client;
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
    _messageToEmbed(title, color, message) {
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
    async _onMemberAdd(member) {
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
                if (newMember.nickname === null) {
                    await this.log('member', `**${newMember.user.tag} Nickname Removed**\nPrevious Nickname: **${oldMember.nickname}**`);
                }
                else {
                    await this.log('member', `**${newMember.user.tag} Nickname Changed**\nPervious Nickname: **${oldMember.nickname}**\nNew Nickname: **${newMember.nickname}**`);
                }
            }
            // Check for username changes
            if (oldMember.user.username !== newMember.user.username) {
                await this.log('member', `**${newMember.user.tag} Username Changed**\nPrevious Username: **${oldMember.user.username}**\nNew Username: **${newMember.user.username}**`);
            }
            // Check for avatar changes
            if (oldMember.user.displayAvatarURL() !== newMember.user.displayAvatarURL()) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(0x7289DA)
                    .setTitle(`**${newMember.user.tag} Avatar Changed**`)
                    .setAuthor({
                    name: newMember.user.username,
                    iconURL: newMember.user.displayAvatarURL(),
                })
                    .setThumbnail(oldMember.user.displayAvatarURL())
                    .setImage(newMember.user.displayAvatarURL());
                await this.log('member', { embeds: [embed] });
            }
        }
        return this.trigger(discord_js_1.Events.GuildMemberUpdate, oldMember, newMember);
    }
    async _onMemberRemove(member) {
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
                const possibleLinks = lowerCase.split(' ')
                    .filter(w => (0, utils_1.isURL)(w.trim()));
                let content = message.content;
                for (const link of possibleLinks) {
                    content = content.replace(link, '');
                }
                const { source, moderation } = await this.moderationClient.moderateText(content, 50);
                if (moderation.length > 0) {
                    await this.moderationReport('Text Moderation', moderation, message);
                }
                for (const link of possibleLinks) {
                    if (link.indexOf('https://tenor.com/view/') === 0) {
                        // This is just a GIF on Discord
                        continue;
                    }
                    try {
                        const { source, moderation } = await this.moderationClient.moderateLink(link);
                        if (moderation.length > 0) {
                            if (moderation.some(m => m.category === 'BLACK_LIST' || m.category === 'CUSTOM_BLACK_LIST')) {
                                await message.delete();
                                if (this.configuration.muteRole) {
                                    const member = message.member;
                                    if (member) {
                                        await member.roles.add(this.configuration.muteRole);
                                        await member.timeout(DAY_MILLISECONDS, 'Suspicious Activity: Blacklisted Link');
                                    }
                                }
                            }
                            else {
                                await message.react('🚫');
                            }
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
}
exports.default = DiscordBot;
