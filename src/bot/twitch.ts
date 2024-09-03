import ModerationClient from '@joliegg/moderation';
import tmi, { AnonSubGiftUpgradeUserstate, AnonSubGiftUserstate, AnonSubMysteryGiftUserstate, BanUserstate, ChatUserstate, Client, DeleteUserstate, EmoteObj, Events, MsgID, PrimeUpgradeUserstate, RoomState, SubGiftUpgradeUserstate, SubGiftUserstate, SubMethods, SubMysteryGiftUserstate, SubUserstate, TimeoutUserstate } from 'tmi.js';
import Logger from '../lib/logger';
import { isURL } from '../utils';
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

export type Listener =  (this: TwitchBot, ...args: any[]) => any;

// We need to keep these up to date with the events that tmi.js provides
export interface TwitchBotEvents {
  action: [channel: string, userstate: ChatUserstate, message: string, self: boolean];
    anongiftpaidupgrade: [channel: string, username: string, userstate: AnonSubGiftUpgradeUserstate];
    anonsubmysterygift: [
        channel: string,
        numbOfSubs: number,
        methods: SubMethods,
        userstate: AnonSubMysteryGiftUserstate,
    ];
    anonsubgift: [
        channel: string,
        streakMonths: number,
        recipient: string,
        methods: SubMethods,
        userstate: AnonSubGiftUserstate,
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
    raw_message: [messageCloned: { [property: string]: any }, message: { [property: string]: any }];
    reconnect: [];
    // additional string literals for autocomplete
    redeem: [
        channel: string,
        username: string,
        rewardType: "highlighted-message" | "skip-subs-mode-message" | string,
        tags: ChatUserstate,
    ];
    resub: [
        channel: string,
        username: string,
        months: number,
        message: string,
        userstate: SubUserstate,
        methods: SubMethods,
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
        userstate: SubGiftUserstate,
    ];
    submysterygift: [
        channel: string,
        username: string,
        numbOfSubs: number,
        methods: SubMethods,
        userstate: SubMysteryGiftUserstate,
    ];
    subscribers: [channel: string, enabled: boolean];
    subscription: [
        channel: string,
        username: string,
        methods: SubMethods,
        message: string,
        userstate: SubUserstate,
    ];
    timeout: [channel: string, username: string, reason: string, duration: number, userstate: TimeoutUserstate];
    unhost: [channel: string, viewers: number];
    unmod: [channel: string, username: string];
    vips: [channel: string, vips: string[]];
    whisper: [from: string, userstate: ChatUserstate, message: string, self: boolean];

    // Custom events
    moderation: [title: string, moderation: ModerationCategory[], message: string, channel: string, userState: ChatUserstate];
}

class TwitchBot {
  protected configuration: TwitchConfiguration;
  protected moderationClient: ModerationClient;
  protected logger: Logger;

  protected listeners = new Map<keyof TwitchBotEvents, Listener[]>();

  protected _client: Client;
 

  constructor(configuration: TwitchConfiguration, moderationClient: ModerationClient, logger: Logger) {
    this.configuration = configuration;
    this.moderationClient = moderationClient;
    this.logger = logger;

    this._client = new tmi.Client(this.configuration);

    this._client.on('message', this._onMessage.bind(this));
  }

  async _onMessage (channel: string, userstate: ChatUserstate, message: string, self: boolean) {
    // Ignore messages from the bot
    if (self) return;

    await this.moderateMessage(message, channel, userstate);

    return this.trigger('message', channel, userstate, message, self);
  }

  async moderateMessage(message: string, channel: string, userState: ChatUserstate): Promise<void> {
    if (message.trim() == '') {
      return;
    }

    // Normalize the message
    const lowerCase = message.toLowerCase().replace(/discord\s*\.\s*gg/g, 'discord.gg').replace(/twitch\s*\.\s*tv/g, 'twitch.tv');

    try {
      let possibleLinks = lowerCase.split(' ')
        .filter(w => isURL(w.trim()));

      let content = message;

      for (const link of possibleLinks) {
        content = content.replace(link, '');

        // Check for markdown links
        if (link.indexOf('[') === 0 && link.lastIndexOf(')') === (link.length - 1)) {
          const [textPart, urlPart] = link.substring(1, link.length - 1).split('](');

          possibleLinks = possibleLinks.filter(l => l !== link);

          if (isURL(textPart)) {
            possibleLinks.push(textPart);
          }

          possibleLinks.push(urlPart);
        }
      }

      const { source, moderation } = await this.moderationClient.moderateText(content, 50);

      if (moderation.length > 0) {
        await this.moderationReport('Text Moderation', moderation, message, channel, userState);
      }

      for (const link of possibleLinks) {
        try {
          const { source, moderation } = await this.moderationClient.moderateLink(link);

          if (moderation.length > 0) {
            if (moderation.some(m => m.category === 'BLACK_LIST' || m.category === 'CUSTOM_BLACK_LIST' || m.category === 'URL_SHORTENER') ) {
              // TODO: We want to timeout the user for a certain amount of time
            }

            await this.moderationReport('Link Moderation', moderation, message, channel, userState);
          }
        } catch (error) {
          this.logger.error(error);
        }
      }
    } catch (error) {
      this.logger.error(error);
    }
  } 

  async moderationReport(title: string, moderation: ModerationCategory[], message: string, channel: string, userState: ChatUserstate): Promise<void> {
    return this.trigger('moderation', title, moderation, message, channel, userState);
  }

  client (): Client {
    return this._client;
  }

  on<Event extends keyof TwitchBotEvents>(event: Event, listener: (...args: TwitchBotEvents[Event]) => Promise<any>): this {
    const listeners = this.listeners.get(event) || [];

    listeners.push(listener);
    this.listeners.set(event, listeners);

    return this;
  }

  async trigger<Event extends keyof TwitchBotEvents>(event: Event, ...args: TwitchBotEvents[Event]): Promise<any> {
    const listeners = this.listeners.get(event);

    if (Array.isArray(listeners)) {
      return Promise.all(listeners.map(listener => listener.call(this, ...args)));
    }

    return Promise.resolve();
  }

  connect () {
    return this._client.connect();
  }

  message (channel: string, message: string) {
    return this._client.say(channel, message);
  }

  dm (username: string, message: string) {
    return this._client.whisper(username, message);
  }
}

export default TwitchBot;
