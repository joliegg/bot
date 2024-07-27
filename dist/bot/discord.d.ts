import { Client, ClientEvents, ClientPresence, Collection, EmbedBuilder, Guild, GuildMember, Message, MessageCreateOptions, MessagePayload, PartialGuildMember, PartialMessage, PresenceData } from 'discord.js';
import { GuildQueue, Player, PlayerInitOptions } from 'discord-player';
import ModerationClient from '@joliegg/moderation';
import { ModerationCategory } from '@joliegg/moderation/dist/types';
import Logger from '../lib/logger';
import { DiscordCommand } from '../lib/DiscordCommand';
export interface DiscordConfiguration {
    token: string;
    clientId: string;
    guildId: string;
    publickey: string;
    logsChannel?: string;
    moderationChannel?: string;
    languages?: string[];
    muteRole?: string;
    player?: PlayerInitOptions;
    tts?: {
        directory: string;
    };
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
export interface DeployResult {
    length: number;
}
declare class DiscordBot {
    protected configuration: DiscordConfiguration;
    protected moderationClient: ModerationClient;
    protected logger: Logger;
    protected _commands: Collection<string, DiscordCommand>;
    protected listeners: Map<keyof DiscordBotEvents, Listener[]>;
    protected _client: Client;
    protected _player?: Player;
    static deploy(configuration: DiscordConfiguration, commands: Collection<string, DiscordCommand>): Promise<{
        global: DeployResult;
        guild: DeployResult;
    }>;
    static undeploy(configuration: DiscordConfiguration): Promise<void>;
    constructor(configuration: DiscordConfiguration, moderationClient: ModerationClient, logger: Logger);
    client(): Client;
    player(): Player | undefined;
    guild(): Guild | null;
    command(name: string, command?: DiscordCommand): DiscordCommand | undefined;
    removeCommand(name: string): boolean;
    me(): GuildMember | null;
    memberInVoiceChannel(member: GuildMember, same?: boolean): boolean;
    queue(): GuildQueue | null;
    tts(member: GuildMember, message: string, languageCode: string): Promise<boolean>;
    setPresence(presence: PresenceData): ClientPresence | undefined;
    presence(): ClientPresence | undefined;
    private _onMessage;
    private _onMessageUpdate;
    private _messageToEmbed;
    private _onMessageDelete;
    memberEmbed(member: GuildMember | PartialGuildMember): EmbedBuilder;
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
