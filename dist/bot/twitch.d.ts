import ModerationClient from '@joliegg/moderation';
import { AnonSubGiftUpgradeUserstate, AnonSubGiftUserstate, AnonSubMysteryGiftUserstate, BanUserstate, ChatUserstate, Client, DeleteUserstate, EmoteObj, MsgID, PrimeUpgradeUserstate, RoomState, SubGiftUpgradeUserstate, SubGiftUserstate, SubMethods, SubMysteryGiftUserstate, SubUserstate, TimeoutUserstate } from 'tmi.js';
import Logger from '../lib/logger';
import { ModerationCategory } from '@joliegg/moderation/dist/types';
export interface TwitchConfiguration {
    options: {
        debug: boolean;
    };
    identity: {
        username: string;
        password: string;
    };
    channels: string[];
}
export type Listener = (this: TwitchBot, ...args: any[]) => any;
export interface TwitchBotEvents {
    action: [channel: string, userstate: ChatUserstate, message: string, self: boolean];
    anongiftpaidupgrade: [channel: string, username: string, userstate: AnonSubGiftUpgradeUserstate];
    anonsubmysterygift: [
        channel: string,
        numbOfSubs: number,
        methods: SubMethods,
        userstate: AnonSubMysteryGiftUserstate
    ];
    anonsubgift: [
        channel: string,
        streakMonths: number,
        recipient: string,
        methods: SubMethods,
        userstate: AnonSubGiftUserstate
    ];
    automod: [channel: string, msgID: "msg_rejected" | "msg_rejected_mandatory", message: string];
    ban: [channel: string, username: string, reason: string, userstate: BanUserstate];
    chat: [channel: string, userstate: ChatUserstate, message: string, self: boolean];
    cheer: [channel: string, userstate: ChatUserstate, message: string];
    clearchat: [channel: string];
    connected: [address: string, port: number];
    connecting: [address: string, port: number];
    disconnected: [reason: string];
    emoteonly: [channel: string, enabled: boolean];
    emotesets: [sets: string, obj: EmoteObj];
    followersonly: [channel: string, enabled: boolean, length: number];
    giftpaidupgrade: [channel: string, username: string, sender: string, userstate: SubGiftUpgradeUserstate];
    hosted: [channel: string, username: string, viewers: number, autohost: boolean];
    hosting: [channel: string, target: string, viewers: number];
    join: [channel: string, username: string, self: boolean];
    logon: [];
    message: [channel: string, userstate: ChatUserstate, message: string, self: boolean];
    messagedeleted: [channel: string, username: string, deletedMessage: string, userstate: DeleteUserstate];
    mod: [channel: string, username: string];
    mods: [channel: string, mods: string[]];
    notice: [channel: string, msgid: MsgID, message: string];
    part: [channel: string, username: string, self: boolean];
    ping: [];
    pong: [latency: number];
    primepaidupgrade: [channel: string, username: string, methods: SubMethods, userstate: PrimeUpgradeUserstate];
    r9kbeta: [channel: string, enabled: boolean];
    raided: [channel: string, username: string, viewers: number];
    raw_message: [messageCloned: {
        [property: string]: any;
    }, message: {
        [property: string]: any;
    }];
    reconnect: [];
    redeem: [
        channel: string,
        username: string,
        rewardType: "highlighted-message" | "skip-subs-mode-message" | string,
        tags: ChatUserstate
    ];
    resub: [
        channel: string,
        username: string,
        months: number,
        message: string,
        userstate: SubUserstate,
        methods: SubMethods
    ];
    roomstate: [channel: string, state: RoomState];
    serverchange: [channel: string];
    slowmode: [channel: string, enabled: boolean, length: number];
    subgift: [
        channel: string,
        username: string,
        streakMonths: number,
        recipient: string,
        methods: SubMethods,
        userstate: SubGiftUserstate
    ];
    submysterygift: [
        channel: string,
        username: string,
        numbOfSubs: number,
        methods: SubMethods,
        userstate: SubMysteryGiftUserstate
    ];
    subscribers: [channel: string, enabled: boolean];
    subscription: [
        channel: string,
        username: string,
        methods: SubMethods,
        message: string,
        userstate: SubUserstate
    ];
    timeout: [channel: string, username: string, reason: string, duration: number, userstate: TimeoutUserstate];
    unhost: [channel: string, viewers: number];
    unmod: [channel: string, username: string];
    vips: [channel: string, vips: string[]];
    whisper: [from: string, userstate: ChatUserstate, message: string, self: boolean];
    moderation: [title: string, moderation: ModerationCategory[], message: string, channel: string, userState: ChatUserstate];
}
declare class TwitchBot {
    protected configuration: TwitchConfiguration;
    protected moderationClient: ModerationClient;
    protected logger: Logger;
    protected listeners: Map<keyof TwitchBotEvents, Listener[]>;
    protected _client: Client;
    constructor(configuration: TwitchConfiguration, moderationClient: ModerationClient, logger: Logger);
    _onMessage(channel: string, userstate: ChatUserstate, message: string, self: boolean): Promise<void>;
    moderateMessage(message: string, channel: string, userState: ChatUserstate): Promise<void>;
    moderationReport(title: string, moderation: ModerationCategory[], message: string, channel: string, userState: ChatUserstate): Promise<void>;
    client(): Client;
    on<Event extends keyof TwitchBotEvents>(event: Event, listener: (...args: TwitchBotEvents[Event]) => Promise<any>): this;
    trigger<Event extends keyof TwitchBotEvents>(event: Event, ...args: TwitchBotEvents[Event]): Promise<any>;
    connect(): Promise<[string, number]>;
    message(channel: string, message: string): Promise<[string]>;
    dm(username: string, message: string): Promise<[string, string]>;
}
export default TwitchBot;
