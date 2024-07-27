"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const ping_1 = __importDefault(require("./management/ping"));
const pause_1 = __importDefault(require("./audio/pause"));
const queue_1 = __importDefault(require("./audio/queue"));
const skip_1 = __importDefault(require("./audio/skip"));
const stop_1 = __importDefault(require("./audio/stop"));
const tts_1 = __importDefault(require("./audio/tts"));
const discordCommands = [
    // Management Module with Utility Commands
    ping_1.default,
    // Audio Module Setup for TTS on Voice Channels
    pause_1.default,
    queue_1.default,
    skip_1.default,
    stop_1.default,
    tts_1.default,
];
const commands = new discord_js_1.Collection();
discordCommands.forEach(command => {
    commands.set(command.slashCommand.name, command);
});
exports.default = commands;
