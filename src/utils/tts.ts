
import fs from 'fs';
import util from 'util';

import { TextToSpeechClient  } from '@google-cloud/text-to-speech';
import { google } from '@google-cloud/text-to-speech/build/protos/protos';

const client = new TextToSpeechClient();

const VOICES: Record<string, string> = {
  'es-US': 'es-US-Neural2-A',
  'pt-BR': 'pt-BR-Neural2-C',
  'en-US': 'en-US-Neural2-F',
};

export const tts = async (text: string, languageCode: string, directory: string): Promise<string | null> => {

  const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
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
    const writeFile = util.promisify(fs.writeFile);

    const fileName = `${directory}/tts_${Date.now()}.mp3`;

    await writeFile(fileName, response.audioContent, 'binary');
    
    return fileName
  }

  return null;
};
