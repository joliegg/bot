"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tts = void 0;
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const text_to_speech_1 = require("@google-cloud/text-to-speech");
const client = new text_to_speech_1.TextToSpeechClient();
const VOICES = {
    'es-US': 'es-US-Neural2-A',
    'pt-BR': 'pt-BR-Neural2-C',
    'en-US': 'en-US-Neural2-F',
};
const tts = async (text, languageCode, directory) => {
    const request = {
        input: { text },
        voice: {
            languageCode: languageCode,
            name: VOICES[languageCode],
        },
        audioConfig: { audioEncoding: 'MP3' },
    };
    const [response] = await client.synthesizeSpeech(request);
    if (response.audioContent) {
        // Write the binary audio content to a local file
        const writeFile = util_1.default.promisify(fs_1.default.writeFile);
        const fileName = `${directory}/tts_${Date.now()}.mp3`;
        await writeFile(fileName, response.audioContent, 'binary');
        return fileName;
    }
    return null;
};
exports.tts = tts;
