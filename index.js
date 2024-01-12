const { serviceClients, Session } = require('@yandex-cloud/nodejs-sdk');
const {
  UtteranceSynthesisRequest
} = require('@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/ai/tts/v3/tts');
const fs = require('fs');

const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);


let voice = 'marina';
let emotion = 'friendly';

const authToken = '';
// const folderId = getEnv('YC_FOLDER_ID');
let session;
let client;

function initClient() {
    session = new Session({ iamToken: authToken });
    client = session.client(serviceClients.SynthesizerClient);
}

async function makeRequest(id, text, destination) {
  initClient();
  const request = UtteranceSynthesisRequest.fromPartial({
    text,
    hints: [
      {
        voice: voice,
      },
      {
        role: 'friendly'
      }
    ],
    outputAudioSpec: {
      containerAudio: 'WAV',
    }
  })
  const response = await client.utteranceSynthesis(request);

  let data;
  for await (const value of response) {
    console.log(value);
    data = value.audioChunk.data;
  }
  await writeFileAsync(`${destination}/${id}.mp3`, data);
  console.log(`Saved response as ${destination}/${id}.mp3`);
}

async function processItems(jsonFileName, destinationFolder) {
    try {
      const jsonData = await readFileAsync(jsonFileName, 'utf8');
      const parsed = JSON.parse(jsonData);
      const items = parsed.messages.map((item) => item.message);
      items.push(...parsed.decisions.map((item) => item.text));
  
      voice = parsed.voice || 'jane';
      emotion = parsed.emotion || 'good';
      console.log(voice, emotion, items);
  
      const delay = 1000 / 20; // 20 requests per second
      let currentIndex = 0;
  
      const makeRequestWithDelay = async () => {
        if (currentIndex < items.length) {
          await makeRequest(
            currentIndex,
            items[currentIndex],
            destinationFolder
          );
          currentIndex++;
          setTimeout(makeRequestWithDelay, delay);
        }
      };
  
      makeRequestWithDelay();
    } catch (error) {
      console.error('Error reading JSON file:', error.message);
    }
  }
  
  const jsonFileName = process.argv[2];
  const destinationFolder = process.argv[3];
  if (!jsonFileName || !destinationFolder) {
    console.error(
      'Please provide a JSON file name and destination folder as arguments.'
    );
  } else {
    initClient();
    processItems(jsonFileName, destinationFolder);
  }
  