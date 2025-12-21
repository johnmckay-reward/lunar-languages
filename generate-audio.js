require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const levenshtein = require('fast-levenshtein');
const inquirer = require('inquirer').default;

// --- CONFIGURATION ---
const I18N_DIR = path.join(__dirname, 'src/assets/i18n');
const AUDIO_DIR = path.join(__dirname, 'src/assets/audio');
const RETRY_LIMIT = 2;
const SIMILARITY_THRESHOLD = 85;

const openai = new OpenAI({
  apiKey: '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',
});

// --- HELPER FUNCTIONS ---

function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function calculateSimilarity(original, transcribed) {
  const normOriginal = normalizeText(original);
  const normTranscribed = normalizeText(transcribed);
  if (normOriginal === normTranscribed) return 100;
  const distance = levenshtein.get(normOriginal, normTranscribed);
  const maxLength = Math.max(normOriginal.length, normTranscribed.length);
  if (maxLength === 0) return 100;
  return (1 - distance / maxLength) * 100;
}

// Reads JSON and returns a flat array of all processable items
function getTranslationEntries(filename) {
  const filePath = path.join(I18N_DIR, filename);
  const langCode = path.basename(filename, '.json');
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const items = [];

  const extract = (sectionName, sectionData) => {
    if (!sectionData) return;
    for (const [key, data] of Object.entries(sectionData)) {
      if (data.text) {
        items.push({
          id: `${sectionName}.${key}`, // Unique ID for menu
          text: data.text,
          langCode: langCode,
          outputPath: path.join(AUDIO_DIR, langCode, `${key}.mp3`),
          fileName: filename
        });
      }
    }
  };

  extract('essentials', content.essentials);
  extract('combinations', content.combinations);
  return items;
}

async function verifyAudio(filePath, originalText, langCode) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: langCode,
    });
    const score = calculateSimilarity(originalText, transcription.text);
    return { score, transcribedText: transcription.text };
  } catch (error) {
    return { score: 0, transcribedText: "" };
  }
}

async function generateAudio(item, attempt = 1) {
  try {
    // Ensure directory exists
    const dir = path.dirname(item.outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    console.log(`   🎤 Generating: ${path.basename(item.outputPath)}...`);
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "echo",
      input: item.text
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(item.outputPath, buffer);

    console.log(`   👂 Verifying...`);
    const { score, transcribedText } = await verifyAudio(item.outputPath, item.text, item.langCode);

    if (score < SIMILARITY_THRESHOLD) {
      console.warn(`   ⚠️ Mismatch (${score.toFixed(0)}%): Expected "${item.text}" vs Heard "${transcribedText}"`);
      if (attempt <= RETRY_LIMIT) {
        console.log(`   🔄 Retrying (Attempt ${attempt + 1})...`);
        return generateAudio(item, attempt + 1);
      } else {
        console.error(`   ❌ FAILED: ${path.basename(item.outputPath)}`);
      }
    } else {
      console.log(`   ✅ Verified (${score.toFixed(0)}%)`);
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

// --- LOGIC FLOWS ---

async function analyzeMissing(filesToProcess) {
  console.log(`\n🔍 Analyzing audio coverage...\n`);

  let totalMissing = 0;
  let itemsToGenerate = [];

  for (const file of filesToProcess) {
    const items = getTranslationEntries(file);
    const missingItems = items.filter(item => !fs.existsSync(item.outputPath));

    if (missingItems.length > 0) {
      console.log(`❌ ${path.basename(file, '.json').toUpperCase()}: ${missingItems.length} missing files.`);
      itemsToGenerate = itemsToGenerate.concat(missingItems);
      totalMissing += missingItems.length;
    } else {
      console.log(`✅ ${path.basename(file, '.json').toUpperCase()}: All audio present.`);
    }
  }

  if (totalMissing === 0) {
    console.log("\n✨ Everything looks perfect! No missing audio files.");
    return;
  }

  const { fix } = await inquirer.prompt([{
    type: 'confirm', name: 'fix', message: `Found ${totalMissing} missing files. Generate them now?`, default: true
  }]);

  if (fix) {
    console.log("\n🚀 Starting generation...");
    for (const item of itemsToGenerate) {
      await generateAudio(item);
    }
    console.log("\n🎉 Done!");
  }
}

async function processStandard(filesToProcess) {
  const finalQueue = [];

  // Loop through each selected language file to build the queue
  for (const file of filesToProcess) {
    const langName = path.basename(file, '.json').toUpperCase();
    const allItems = getTranslationEntries(file);

    console.log(`\n📋 Configuring: ${langName}`);

    const { scope } = await inquirer.prompt([{
      type: 'list',
      name: 'scope',
      message: `For ${langName}, what do you want to generate?`,
      choices: [
        { name: `Process ALL (${allItems.length} items)`, value: 'all' },
        { name: 'Select SPECIFIC items...', value: 'specific' }
      ]
    }]);

    if (scope === 'all') {
      finalQueue.push(...allItems);
    } else {
      const { selectedItems } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'selectedItems',
        message: `Select items for ${langName} (Space to toggle):`,
        choices: allItems.map(item => ({
          name: `${item.id} ("${item.text.substring(0, 30)}...")`, // Show key + snippet
          value: item
        })),
        pageSize: 15,
        validate: ans => ans.length > 0 ? true : 'Pick at least one item.'
      }]);
      finalQueue.push(...selectedItems);
    }
  }

  // Execution Phase
  if (finalQueue.length > 0) {
    console.log(`\n🚀 Starting generation for ${finalQueue.length} items...`);
    for (const item of finalQueue) {
      console.log(`\n🔹 [${item.langCode.toUpperCase()}] Key: ${item.id}`);
      await generateAudio(item);
    }
    console.log("\n🎉 Queue complete!");
  } else {
    console.log("No items selected.");
  }
}

// --- MAIN MENU ---

async function main() {
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const allFiles = fs.readdirSync(I18N_DIR)
    .filter(file => path.extname(file) === '.json' && file !== 'en.json');

  if (allFiles.length === 0) { console.log("❌ No files found."); return; }

  // 1. Mode Selection
  const { mode } = await inquirer.prompt([{
    type: 'list',
    name: 'mode',
    message: 'What would you like to do?',
    choices: [
      { name: '🔍 Analyze & Fill Missing Files', value: 'analyze' },
      { name: '🎤 Generate Audio (Standard/Overwrite)', value: 'standard' },
    ]
  }]);

  // 2. Language Selection
  let filesToProcess = [];
  const { selectionType } = await inquirer.prompt([{
    type: 'list',
    name: 'selectionType',
    message: 'Which languages?',
    choices: [
      { name: 'All Languages', value: 'all' },
      { name: 'Select Specific Languages...', value: 'select' }
    ]
  }]);

  if (selectionType === 'all') {
    filesToProcess = allFiles;
  } else {
    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message: 'Select languages:',
      choices: allFiles.map(f => ({ name: path.basename(f, '.json').toUpperCase(), value: f })),
      validate: ans => ans.length > 0 ? true : 'Choose at least one.'
    }]);
    filesToProcess = selected;
  }

  // 3. Execute Logic
  if (mode === 'analyze') {
    await analyzeMissing(filesToProcess);
  } else {
    await processStandard(filesToProcess);
  }
}

main();
