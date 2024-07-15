import { Client, ClientEvents, EmbedBuilder, Message, MessageCreateOptions, MessagePayload, PartialMessage } from 'discord.js';
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
export type Listener = (this: DiscordBot, ...args: any[]) => any;
export type LogType = 'message' | 'user';
export interface BotEvents extends ClientEvents {
    moderation: [embed: EmbedBuilder, moderation: ModerationCategory[], message: Message<boolean> | PartialMessage];
    log: [type: LogType, message: string | MessagePayload | MessageCreateOptions];
}
declare class DiscordBot {
    protected configuration: Record<string, any>;
    protected moderationClient: ModerationClient;
    protected logger: Logger;
    protected listeners: Map<keyof BotEvents, Listener[]>;
    protected _client: Client;
    constructor(configuration: DiscordConfiguration, moderationClient: ModerationClient, logger: Logger);
    client(): Client;
    private _onMessage;
    private _onMessageUpdate;
    private _messageToEmbed;
    private _onMessageDelete;
    on<Event extends keyof BotEvents>(event: Event, listener: (...args: BotEvents[Event]) => void): this;
    trigger<Event extends keyof BotEvents>(event: Event, ...args: BotEvents[Event]): Promise<any>;
    moderateMessage(message: Message<boolean> | PartialMessage): Promise<void>;
    message(channeld: string, message: string | MessagePayload | MessageCreateOptions): Promise<Message<boolean>>;
    connect(): Promise<void>;
    dm(userId: string, message: string | MessagePayload | MessageCreateOptions): Promise<Message<boolean>>;
    moderationReport(title: string, moderation: ModerationCategory[], message: Message<boolean> | PartialMessage, attachment?: string | null): Promise<void>;
    log(type: LogType, message: string | MessagePayload | MessageCreateOptions): Promise<any>;
}
export default DiscordBot;
