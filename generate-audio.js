require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const levenshtein = require('fast-levenshtein'); // Comparison tool

// Initialize OpenAI using environment variable (SAFER)
const openai = new OpenAI({
  apiKey: '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',
});

const I18N_DIR = path.join(__dirname, 'src/assets/i18n');
const AUDIO_DIR = path.join(__dirname, 'src/assets/audio');
const RETRY_LIMIT = 2; // How many times to retry if verification fails

// Helper to normalize text (remove punctuation, lower case) for better comparison
function normalizeText(text) {
  return text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").trim();
}

// Calculate similarity percentage (0 to 100)
function calculateSimilarity(original, transcribed) {
  const normOriginal = normalizeText(original);
  const normTranscribed = normalizeText(transcribed);

  if (normOriginal === normTranscribed) return 100;

  const distance = levenshtein.get(normOriginal, normTranscribed);
  const maxLength = Math.max(normOriginal.length, normTranscribed.length);

  if (maxLength === 0) return 100; // Both empty

  return (1 - distance / maxLength) * 100;
}

async function verifyAudio(filePath, originalText, langCode) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: langCode, // Hints Whisper to listen for specific language
    });

    const score = calculateSimilarity(originalText, transcription.text);
    return { score, transcribedText: transcription.text };
  } catch (error) {
    console.error(`⚠️ Verification failed technically: ${error.message}`);
    return { score: 0, transcribedText: "" };
  }
}

async function generateAudio(text, outputFilePath, langCode, attempt = 1) {
  try {
    // 1. Generate Audio
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "echo",
      input: text
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(outputFilePath, buffer);

    // 2. Verify Audio (The "Clever" Part)
    console.log(`   ...verifying (${path.basename(outputFilePath)})`);
    const { score, transcribedText } = await verifyAudio(outputFilePath, text, langCode);

    // 3. Check Threshold (e.g., 85% match)
    if (score < 85) {
      console.warn(`   ⚠️ Mismatch detected (Score: ${score.toFixed(2)}%)`);
      console.warn(`      Original: "${text}"`);
      console.warn(`      Heard:    "${transcribedText}"`);

      if (attempt <= RETRY_LIMIT) {
        console.log(`   🔄 Retrying generation (Attempt ${attempt + 1}/${RETRY_LIMIT + 1})...`);
        return generateAudio(text, outputFilePath, langCode, attempt + 1);
      } else {
        console.error(`   ❌ FAILED after retries. Manual check required for: ${path.basename(outputFilePath)}`);
      }
    } else {
      console.log(`   ✅ Verified (Score: ${score.toFixed(0)}%): ${path.basename(outputFilePath)}`);
    }

  } catch (error) {
    console.error(`   ❌ Error generating/verifying ${outputFilePath}:`, error);
  }
}

async function processAll() {
  console.log("🚀 Starting Audio Generation with Round-Trip Verification...");

  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const files = fs.readdirSync(I18N_DIR);

  for (const file of files) {
    if (path.extname(file) !== '.json') continue;
    if (file === 'en.json') continue;

    const langCode = path.basename(file, '.json');
    const filePath = path.join(I18N_DIR, file);

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`\nProcessing language: ${langCode.toUpperCase()}`);

      const langAudioDir = path.join(AUDIO_DIR, langCode);
      if (!fs.existsSync(langAudioDir)) fs.mkdirSync(langAudioDir, { recursive: true });

      // Helper to process a section
      const processSection = async (sectionData) => {
        for (const [key, data] of Object.entries(sectionData)) {
          if (data.text) {
            const outputFilePath = path.join(langAudioDir, `${key}.mp3`);
            // Check if file exists to save costs? (Optional logic here)
            await generateAudio(data.text, outputFilePath, langCode);
          }
        }
      };

      if (content.essentials) await processSection(content.essentials);
      if (content.combinations) await processSection(content.combinations);

    } catch (err) {
      console.error(`Error processing file ${file}:`, err);
    }
  }

  console.log("\n🎉 All audio generation complete!");
}

processAll();
