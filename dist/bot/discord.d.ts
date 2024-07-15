import { Client, ClientEvents, EmbedBuilder, GuildMember, Message, MessageCreateOptions, MessagePayload, PartialMessage } from 'discord.js';
import ModerationClient from '@joliegg/moderation';
import { ModerationCategory } from '@joliegg/moderation/dist/types';
import Logger from '../lib/logger';
export interface DiscordConfiguration {
    token: string;
    clientId: string;
    guildId: string;
    publickey: string;
    logsChannel?: string;
    moderationChannel?: string;
    languages?: string[];
    muteRole?: string;
}
export type DiscordPermissions = {
    images: boolean;
    commands: boolean;
    links: boolean;
    attachments: boolean;
    gifs: boolean;
    stickers: boolean;
    emotes: boolean;
    messages: boolean;
    mentions: boolean;
    voice: boolean;
};
export type Listener = (this: DiscordBot, ...args: any[]) => any;
export type LogType = 'message' | 'member';
export interface DiscordBotEvents extends ClientEvents {
    moderation: [embed: EmbedBuilder, moderation: ModerationCategory[], message: Message<boolean> | PartialMessage];
    log: [type: LogType, message: string | MessagePayload | MessageCreateOptions];
    mute: [member: GuildMember];
    unmute: [member: GuildMember];
}
declare class DiscordBot {
    protected configuration: DiscordConfiguration;
    protected moderationClient: ModerationClient;
    protected logger: Logger;
    protected listeners: Map<keyof DiscordBotEvents, Listener[]>;
    protected _client: Client;
    constructor(configuration: DiscordConfiguration, moderationClient: ModerationClient, logger: Logger);
    client(): Client;
    private _onMessage;
    private _onMessageUpdate;
    private _messageToEmbed;
    private _onMessageDelete;
    private _onMemberAdd;
    private _onMemberUpdate;
    private _onMemberRemove;
    private _onMemberBan;
    private _onMemberUnban;
    on<Event extends keyof DiscordBotEvents>(event: Event, listener: (...args: DiscordBotEvents[Event]) => void): this;
    trigger<Event extends keyof DiscordBotEvents>(event: Event, ...args: DiscordBotEvents[Event]): Promise<any>;
    moderateMessage(message: Message<boolean> | PartialMessage): Promise<void>;
    message(channeld: string, message: string | MessagePayload | MessageCreateOptions): Promise<Message<boolean>>;
    connect(): Promise<void>;
    dm(userId: string, message: string | MessagePayload | MessageCreateOptions): Promise<Message<boolean>>;
    moderationReport(title: string, moderation: ModerationCategory[], message: Message<boolean> | PartialMessage, attachment?: string | null): Promise<void>;
    log(type: LogType, message: string | MessagePayload | MessageCreateOptions): Promise<any>;
}
export default DiscordBot;
