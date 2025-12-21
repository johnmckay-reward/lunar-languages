require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: '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',
});

const I18N_DIR = path.join(__dirname, 'src/assets/i18n');
const AUDIO_DIR = path.join(__dirname, 'src/assets/audio');

async function generateAudio(text, outputFilePath) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd", // High definition model for better quality
      voice: "echo", // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(outputFilePath, buffer);
    console.log(`✅ Generated: ${path.basename(outputFilePath)}`);
  } catch (error) {
    console.error(`❌ Error generating audio for ${outputFilePath}:`, error);
  }
}

async function processAll() {
  console.log("🚀 Starting Audio Generation...");

  // Ensure audio directory exists
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  // Read all files in i18n directory
  const files = fs.readdirSync(I18N_DIR);

  for (const file of files) {
    if (path.extname(file) !== '.json') continue;
    if (file === 'en.json') continue; // Skip English

    const langCode = path.basename(file, '.json');
    const filePath = path.join(I18N_DIR, file);

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      console.log(`\nProcessing language: ${langCode.toUpperCase()}`);

      // Create language specific audio directory
      const langAudioDir = path.join(AUDIO_DIR, langCode);
      if (!fs.existsSync(langAudioDir)) {
        fs.mkdirSync(langAudioDir, { recursive: true });
      }

      // Process essentials
      if (content.essentials) {
        for (const [key, data] of Object.entries(content.essentials)) {
          if (data.text) {
            const outputFilePath = path.join(langAudioDir, `${key}.mp3`);
            await generateAudio(data.text, outputFilePath);
          }
        }
      }

      // Process combinations
      if (content.combinations) {
        for (const [key, data] of Object.entries(content.combinations)) {
          if (data.text) {
            const outputFilePath = path.join(langAudioDir, `${key}.mp3`);
            await generateAudio(data.text, outputFilePath);
          }
        }
      }
    } catch (err) {
      console.error(`Error processing file ${file}:`, err);
    }
  }

  console.log("\n🎉 All audio generation complete!");
}

processAll();
