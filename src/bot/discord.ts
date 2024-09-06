import { Channel, Client, ClientEvents, ClientPresence, Collection, ColorResolvable, EmbedBuilder, Events, GatewayIntentBits, Guild, GuildBan, GuildMember, Message, MessageCreateOptions, MessagePayload, PartialGroupDMChannel, PartialGuildMember, PartialMessage, Partials, PresenceData, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes, TextChannel } from 'discord.js';

import { GuildQueue, Player, PlayerInitOptions, QueryType, useQueue } from 'discord-player';

import ModerationClient from '@joliegg/moderation';
import { ModerationCategory } from '@joliegg/moderation/dist/types';
import { isURL } from '../utils';
import { tts } from '../utils/tts'
import Logger from '../lib/logger';
import { DiscordCommand } from '../lib/DiscordCommand';
import { AttachmentExtractor } from '@discord-player/extractor';


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
}

export type Listener =  (this: DiscordBot, ...args: any[]) => any;

export type LogType = 'message' | 'member';

type NonPartialGroupDMChannel<Structure extends { channel: Channel }> = Structure & {
  channel: Exclude<Structure['channel'], PartialGroupDMChannel>;
};

export interface DiscordBotEvents extends ClientEvents {
  moderation: [embed: EmbedBuilder, moderation: ModerationCategory[], message: Message<boolean> | PartialMessage];
  log: [type: LogType ,message: string | MessagePayload | MessageCreateOptions];
  mute: [member: GuildMember];
  unmute: [member: GuildMember];
}

export interface DeployResult {
  length: number;
}

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const FIVE_SECONDS = 5 * 1000;

class DiscordBot  {
  protected configuration: DiscordConfiguration;
  protected moderationClient: ModerationClient;
  protected logger: Logger;

  protected _commands: Collection<string, DiscordCommand> = new Collection();

  protected listeners = new Map<keyof DiscordBotEvents, Listener[]>();

  protected _extras: Record<string, any> = {};

  protected _client: Client;
  protected _player?: Player;

  static async deploy(configuration: DiscordConfiguration, commands: Collection<string, DiscordCommand>): Promise<{ global: DeployResult; guild: DeployResult }> {
    const guildCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
    const globalCommands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

    commands.forEach((command) => {
      if ('slashCommand' in command && 'execute' in command && command.disabled !== true) {
        if (command.type === 'guild' || !command.type) {
          guildCommands.push(command.slashCommand.toJSON());
        } else {
          globalCommands.push(command.slashCommand.toJSON());
        }
      }
    });

    const rest = new REST().setToken(configuration.token);

		// The put method is used to fully refresh all commands in the guild with the current set
		const guild = await rest.put(Routes.applicationGuildCommands(configuration.clientId, configuration.guildId),{ 
      body: guildCommands 
    });

		// The put method is used to fully refresh all commands in the guild with the current set
		const global = await rest.put(Routes.applicationCommands(configuration.clientId), { 
      body: globalCommands, 
    });
    
    return {
      global: global as DeployResult,
      guild: guild as DeployResult,
    };
  }

  static async undeploy(configuration: DiscordConfiguration): Promise<void> {
    const rest = new REST().setToken(configuration.token);

    await rest.put(Routes.applicationGuildCommands(configuration.clientId, configuration.guildId), { body: [] });
    await rest.put(Routes.applicationCommands(configuration.clientId), { body: [] });
  }

  constructor(configuration: DiscordConfiguration, moderationClient: ModerationClient, logger: Logger) {
    this.configuration = configuration;
    this.moderationClient = moderationClient;
    this.logger = logger;

    this._client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildEmojisAndStickers,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
      ],
    });

    if (this.configuration.player) {
      this._player = new Player(this._client, this.configuration.player);
      this._player.extractors.register(AttachmentExtractor, {});
    }

    // Message Events
    this._client.on(Events.MessageCreate, this._onMessage.bind(this));
    this._client.on(Events.MessageUpdate, this._onMessageUpdate.bind(this));
    this._client.on(Events.MessageDelete, this._onMessageDelete.bind(this));

    // Member Events
    this._client.on(Events.GuildMemberAdd, this._onMemberAdd.bind(this));
    this._client.on(Events.GuildMemberUpdate, this._onMemberUpdate.bind(this));
    this._client.on(Events.GuildMemberRemove, this._onMemberRemove.bind(this));

    // Ban Events
    this._client.on(Events.GuildBanAdd, this._onMemberBan.bind(this));
    this._client.on(Events.GuildBanRemove, this._onMemberUnban.bind(this));

    // Interaction Events
    this._client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const command: DiscordCommand | undefined = this._commands.get(interaction.commandName);

        if (!command) {
          this.logger.error(`No command matching ${interaction.commandName} was found.`);
          return this.trigger(Events.InteractionCreate, interaction);
        }

        try {
          await command.execute(interaction, this);
        } catch (error) {
          await this.trigger(Events.Error, error as Error);

          const message = { 
            content: 'There was an error while executing this command.', 
            ephemeral: true,
          };

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(message);
          } else {
            await interaction.reply(message);
          }
        }
      } else if (interaction.isAutocomplete()) {
        const command: DiscordCommand | undefined = this._commands.get(interaction.commandName);

        if (!command) {
          this.logger.error(`No command matching ${interaction.commandName} was found.`);
          return this.trigger(Events.InteractionCreate, interaction);
        }

        if (!command.autocomplete) {
          this.logger.error(`Command ${interaction.commandName} does not have an autocomplete method.`);
          return this.trigger(Events.InteractionCreate, interaction);
        }

        try {
          await command.autocomplete(interaction, this);
        } catch (error) {
          await this.trigger(Events.Error, error as Error);
        }
      }

      return this.trigger(Events.InteractionCreate, interaction);
    });

    this._client.on(Events.Debug, (info) => {
      this.logger.debug(info);
      return this.trigger(Events.Debug, info);
    });

    this._client.on(Events.Error, (error) => {
      this.logger.error(error);
      return this.trigger(Events.Error, error);
    });
    
    this._client.on(Events.ClientReady, (client) => {
      this.trigger('ready', client);
    });

  }

  client(): Client {
    return this._client;
  }

  player(): Player | undefined {
    return this._player;
  }

  guild(): Guild | null {
    return this._client.guilds.cache.get(this.configuration.guildId) || null;
  }

  command(name: string, command?: DiscordCommand): DiscordCommand | undefined {
    if (command) {
      this._commands.set(name, command);
    }

    return this._commands.get(name);
  }

  removeCommand(name: string): boolean {
    return this._commands.delete(name);
  }

  me(): GuildMember | null {
    const guild = this.guild();

    return guild?.members.me || null;
  }

  memberInVoiceChannel(member: GuildMember, same: boolean = false): boolean {
    if (member.voice.channel === null) {
      return false;
    }

    if (same) {
      const me = this.me();

      return !me?.voice.channelId ||  member.voice.channelId === me?.voice.channelId;
    }

    return true;
  }

  queue(): GuildQueue | null {
    return useQueue(this.configuration.guildId);
  } 

  async tts(member: GuildMember, message: string, languageCode: string): Promise<boolean> {
    if (!this.configuration.tts?.directory || !this._player) {
      throw new Error('TTS is not configured');
    }

    if (!this.memberInVoiceChannel(member, true)) {
      throw new Error('Not in the same voice channel');
    }

    const audioFile = await tts(message, languageCode, this.configuration.tts.directory);

    if (!audioFile) {
      throw new Error('Error generating TTS');
    }
  
    const queue = this.queue();

    const { track } = await this._player.play(member.voice.channel!, audioFile, {
      searchEngine: QueryType.FILE,
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

  setPresence(presence: PresenceData): ClientPresence | undefined {
    return this._client.user?.setPresence(presence);
  }

  presence(): ClientPresence | undefined {
    return this._client.user?.presence;
  }

  extra(name: string, value?: any): any {
    if (value) {
      this._extras[name] = value;
    }

    return this._extras[name];
  }

  private async _onMessage(message: NonPartialGroupDMChannel<Message<boolean>>): Promise<void> {
    // Ignore messages from bots
    if (message.author.bot) return;

    if (!this._client.application?.owner) {
      await this._client.application?.fetch();
    }

    await this.moderateMessage(message);

    return this.trigger(Events.MessageCreate, message);
  }

  private async _onMessageUpdate(oldMessage: Message<boolean> | PartialMessage, newMessage: Message<boolean> | PartialMessage): Promise<void> {
    if (oldMessage.author && !newMessage.author) {
      newMessage.author = oldMessage.author;
    }

    // Ignore messages from bots
    if (newMessage.author?.bot) return;


    if (!this._client.application?.owner) {
      await this._client.application?.fetch();
    }

    if (oldMessage.content !== newMessage.content) {
      try {
        const embeds: EmbedBuilder[] = [];
  
        if (oldMessage.content || newMessage.content || oldMessage.stickers.size > 0) {
          const embed = new EmbedBuilder()
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
            const embed = new EmbedBuilder()
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
          await this.log('message', { embeds })
        }
      } catch (error) {
        this.logger.error(error);
      }

      await this.moderateMessage(newMessage);
    }

    return this.trigger(Events.MessageUpdate, oldMessage, newMessage);
  }

  messageEmbed(title: string, color: ColorResolvable, message: NonPartialGroupDMChannel<Message<boolean>> | PartialMessage): EmbedBuilder[] {
    const embeds: EmbedBuilder[] = [];

    if (message.content || message.stickers.size > 0) {
      const embed = new EmbedBuilder()
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
        const embed = new EmbedBuilder()
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
    
  private async _onMessageDelete(message: NonPartialGroupDMChannel<Message<boolean> | PartialMessage>): Promise<void> {
    try {
      const embeds: EmbedBuilder[] = [];

      if (message.content || message.stickers.size > 0) {
        const embed = new EmbedBuilder()
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
          const embed = new EmbedBuilder()
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
        await this.log('message', { embeds })
      }
    } catch (error) {
      this.logger.error(error);
    }

    return this.trigger(Events.MessageDelete, message);
  }

  memberEmbed(member: GuildMember | PartialGuildMember): EmbedBuilder {
    const embed = new EmbedBuilder()
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

  private async _onMemberAdd(member: GuildMember): Promise<void> {
    if (this.configuration.logsChannel) {
      const embed = this.memberEmbed(member)
        .setTitle('Member Joined');

      await this.log('member', { embeds: [embed] });
    }
    
    return this.trigger(Events.GuildMemberAdd, member);
  }

  private async _onMemberUpdate(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<void> { 
    if (this.configuration.muteRole) {
      const hadMuteRole = oldMember.roles.cache.has(this.configuration.muteRole);
      const hasMuteRole = newMember.roles.cache.has(this.configuration.muteRole);

      if (hadMuteRole && !hasMuteRole) {
        await this.trigger('unmute', newMember);
      } else if (!hadMuteRole && hasMuteRole) {
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
        } else {
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

    return this.trigger(Events.GuildMemberUpdate, oldMember, newMember);
  }

  private async _onMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
    if (this.configuration.logsChannel) {
      const embed = this.memberEmbed(member as GuildMember)
        .setColor(0x212121)
        .setTitle('Member Left');

      await this.log('member', { embeds: [embed] });
    }
    return this.trigger(Events.GuildMemberRemove, member);
  }

  private async _onMemberBan(ban: GuildBan): Promise<void> {
    return this.trigger(Events.GuildBanAdd, ban);
  }

  private async _onMemberUnban(ban: GuildBan): Promise<void> {
    return this.trigger(Events.GuildBanRemove, ban);
  }

  on<Event extends keyof DiscordBotEvents>(event: Event, listener: (...args: DiscordBotEvents[Event]) => void): this {
    const listeners = this.listeners.get(event) || [];

    listeners.push(listener);
    this.listeners.set(event, listeners);

    return this;
  }

  async trigger<Event extends keyof DiscordBotEvents>(event: Event, ...args: DiscordBotEvents[Event]): Promise<any> {
    const listeners = this.listeners.get(event);

    if (Array.isArray(listeners)) {
      return Promise.all(listeners.map(listener => listener.call(this, ...args)));
    }

    return Promise.resolve();
  }

  async moderateMessage(message: Message<boolean> | PartialMessage): Promise<void> {
    if (typeof message.content === 'string' && message.content !== '') {
      // Normalize the message
      const lowerCase = message.content.toLowerCase().replace(/discord\s*\.\s*gg/g, 'discord.gg');
  
      try {
        let possibleLinks = lowerCase.split(' ')
          .filter(w => isURL(w.trim()));
  
        let content = message.content;
  
        for (const link of possibleLinks) {
          content = content.replace(link, '');

          // Check for markdown links
          if (link.indexOf('[') === 0 && link.lastIndexOf(')') === (link.length - 1)) {
            // eslint-disable-next-line prefer-const
            let [textPart, urlPart] = link.substring(1, link.length - 1).split('](');

            possibleLinks = possibleLinks.filter(l => l !== link);

            // Also check the text part just in case
            if (isURL(textPart)) {
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
                  } catch (error) {
                    this.logger.error(error);
                  }
                }

                // Always delete the message
                promises.push(message.delete());

                await Promise.allSettled(promises);
              } else if (moderation.some(m => m.category === 'URL_SHORTENER')) {
                const promises = [];

                if (member && timeOutGiven < FIVE_SECONDS) {
                  try {
                    // It's likely that this fails if the member has higher permissions than the bot
                    promises.push(member.timeout(FIVE_SECONDS, 'Suspicious Activity: Shortened URL'));
                  } catch (error) {
                    this.logger.error(error);
                  }
                }

                promises.push(message.delete());

                if (member) {
                  promises.push(this.dm(member.user.id, `Your message in <#${message.channelId}> was deleted because it contained a shortened URL.`));
                }
                await Promise.allSettled(promises);
              } else {
                await message.react('🚫');
              }

              // Report the moderation
              await this.moderationReport('Link Moderation', moderation, message);
            } else {
              await message.react('✅');
            }
          } catch (error) {
            this.logger.error(error);
          }
        }

        const { source, moderation } = await this.moderationClient.moderateText(content, 50);
  
        if (moderation.length > 0) {
          await this.moderationReport('Text Moderation', moderation, message);
        }
      } catch (error) {
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
          } catch (error) {
            this.logger.error(error);
          }
        } else if (attachment.contentType.indexOf('audio') > -1) {
          try {
            const languages = this.configuration.languages || ['en-US'];
            for (const language of languages) {
              const { source, moderation } = await this.moderationClient.moderateAudio(attachment.url, language, 50);
  
              if (moderation.length === 0) {
                continue;
              }

              message.content = source
    
              await this.moderationReport('Audio Moderation', moderation, message);
            }
          } catch (error) {
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
          } catch (error) {
            this.logger.error(error);
          }
        }
      }
    }
  }

  async message(channeld: string, message: string | MessagePayload | MessageCreateOptions): Promise<Message<boolean>> {
    const channel = await this._client.channels.fetch(channeld);

    if (channel === null) {
      throw new Error(`Channel with ID "${channeld}" could not be found.`);
    }

    return (channel as TextChannel).send(message);
  }

  async connect(): Promise<void> {
    this._client.login(this.configuration.token);
  }

  async dm(userId: string, message: string | MessagePayload | MessageCreateOptions): Promise<Message<boolean>> {
    return this._client.users.send(userId, message);
  }

  async moderationReport(title: string, moderation: ModerationCategory[], message: Message<boolean> | PartialMessage, attachment: string | null = null): Promise<void> {
    const embed = new EmbedBuilder()
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

  async log(type: LogType, message: string | MessagePayload | MessageCreateOptions) {
    if (this.configuration.logsChannel && (type === 'message' || type === 'member')) {
      await this.message(this.configuration.logsChannel, message);
    }

    return this.trigger('log', type, message);
  }
}

export default DiscordBot;
