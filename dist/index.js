"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitchBot = exports.DiscordCommands = exports.DiscordBot = void 0;
var discord_1 = require("./bot/discord");
Object.defineProperty(exports, "DiscordBot", { enumerable: true, get: function () { return __importDefault(discord_1).default; } });
var discord_2 = require("./commands/discord");
Object.defineProperty(exports, "DiscordCommands", { enumerable: true, get: function () { return __importDefault(discord_2).default; } });
var twitch_1 = require("./bot/twitch");
Object.defineProperty(exports, "TwitchBot", { enumerable: true, get: function () { return __importDefault(twitch_1).default; } });
