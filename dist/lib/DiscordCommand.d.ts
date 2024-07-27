import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import DiscordBot from "../bot/discord";
export interface DiscordCommand {
    slashCommand: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    textCommand?: string;
    execute: (interaction: any, bot: DiscordBot, ...params: any[]) => Promise<any>;
    autocomplete?: (interaction: any, bot: DiscordBot) => Promise<any>;
    type?: 'guild' | 'global';
    disabled?: boolean;
}
