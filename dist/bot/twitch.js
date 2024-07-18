"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tmi_js_1 = __importDefault(require("tmi.js"));
const utils_1 = require("../utils");
class TwitchBot {
    configuration;
    moderationClient;
    logger;
    listeners = new Map();
    _client;
    constructor(configuration, moderationClient, logger) {
        this.configuration = configuration;
        this.moderationClient = moderationClient;
        this.logger = logger;
        this._client = new tmi_js_1.default.Client(this.configuration);
        this._client.on('message', this._onMessage.bind(this));
    }
    async _onMessage(channel, userstate, message, self) {
        // Ignore messages from the bot
        if (self)
            return;
        await this.moderateMessage(message, channel, userstate);
        return this.trigger('message', channel, userstate, message, self);
    }
    async moderateMessage(message, channel, userState) {
        if (message.trim() == '') {
            return;
        }
        // Normalize the message
        const lowerCase = message.toLowerCase().replace(/discord\s*\.\s*gg/g, 'discord.gg').replace(/twitch\s*\.\s*tv/g, 'twitch.tv');
        try {
            const possibleLinks = lowerCase.split(' ')
                .filter(w => (0, utils_1.isURL)(w.trim()));
            let content = message;
            for (const link of possibleLinks) {
                content = content.replace(link, '');
            }
            const { source, moderation } = await this.moderationClient.moderateText(content, 50);
            if (moderation.length > 0) {
                await this.moderationReport('Text Moderation', moderation, message, channel, userState);
            }
            for (const link of possibleLinks) {
                try {
                    const { source, moderation } = await this.moderationClient.moderateLink(link);
                    if (moderation.length > 0) {
                        if (moderation.some(m => m.category === 'BLACK_LIST' || m.category === 'CUSTOM_BLACK_LIST')) {
                            // TODO: We want to timeout the user for a certain amount of time
                        }
                        await this.moderationReport('Link Moderation', moderation, message, channel, userState);
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
    async moderationReport(title, moderation, message, channel, userState) {
        return this.trigger('moderation', title, moderation, message, channel, userState);
    }
    client() {
        return this._client;
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
    connect() {
        return this._client.connect();
    }
    message(channel, message) {
        return this._client.say(channel, message);
    }
    dm(username, message) {
        return this._client.whisper(username, message);
    }
}
exports.default = TwitchBot;
