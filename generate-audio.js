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
const SIMILARITY_THRESHOLD = 80;

// OpenAI Pricing (Approximate for TTS-1-HD)
const PRICE_PER_1K_CHARS = 0.030;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- STATE TRACKING ---
const stats = {
  success: 0,
  failed: 0,
  skipped: 0,
  totalCost: 0
};

// --- HELPER FUNCTIONS ---

function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[¡¿]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"?]/g, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
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

function getTranslationEntries(filename) {
  const filePath = path.join(I18N_DIR, filename);
  const langCode = path.basename(filename, '.json');

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const items = [];
    const extract = (sectionName, sectionData) => {
      if (!sectionData) return;
      for (const [key, data] of Object.entries(sectionData)) {
        if (data.text) {
          items.push({
            id: `${sectionName}.${key}`,
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
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return [];
  }
}

async function verifyAudio(filePath, originalText, langCode) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: langCode,
    });
    return { score: calculateSimilarity(originalText, transcription.text), transcribedText: transcription.text };
  } catch (error) {
    return { score: 0, transcribedText: "" };
  }
}

async function generateAudio(item, voice, attempt = 1) {
  try {
    const dir = path.dirname(item.outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    console.log(`\n🔹 [${item.langCode.toUpperCase()}] ${item.id}`);
    console.log(`   🎤 Generating...`);

    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: voice,
      input: item.text
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(item.outputPath, buffer);

    console.log(`   👂 Verifying...`);
    const { score, transcribedText } = await verifyAudio(item.outputPath, item.text, item.langCode);

    if (score < SIMILARITY_THRESHOLD) {
      console.warn(`   ⚠️ Mismatch (${score.toFixed(0)}%): Expected "${item.text}" vs Heard "${transcribedText}"`);

      if (attempt <= RETRY_LIMIT) {
        console.log(`   🔄 Retrying (Attempt ${attempt + 1}/${RETRY_LIMIT + 1})...`);
        return generateAudio(item, voice, attempt + 1);
      } else {
        console.error(`   ❌ FAILED: Deleting invalid file.`);
        try { await fs.promises.unlink(item.outputPath); } catch (e) {}
        stats.failed++;
      }
    } else {
      console.log(`   ✅ Verified (${score.toFixed(0)}%)`);
      stats.success++;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    stats.failed++;
  }
}

// --- LOGIC FLOWS ---

async function processQueue(queue) {
  if (queue.length === 0) {
    console.log("No items to process.");
    return;
  }

  // 1. Calculate Est Cost
  const totalChars = queue.reduce((sum, item) => sum + item.text.length, 0);
  const estCost = (totalChars / 1000) * PRICE_PER_1K_CHARS;

  console.log(`\n💰 ESTIMATE:`);
  console.log(`   Items: ${queue.length}`);
  console.log(`   Chars: ${totalChars}`);
  console.log(`   Cost:  ~$${estCost.toFixed(4)} (TTS-HD only)`);

  // 2. Select Voice
  const { voice } = await inquirer.prompt([{
    type: 'list',
    name: 'voice',
    message: 'Select a voice:',
    choices: ['echo', 'alloy', 'fable', 'onyx', 'nova', 'shimmer'],
    default: 'echo'
  }]);

  // 3. Confirm
  const { proceed } = await inquirer.prompt([{
    type: 'confirm', name: 'proceed', message: 'Ready to start?', default: true
  }]);

  if (!proceed) return;

  console.log("\n🚀 Starting generation...");
  const startTime = Date.now();

  for (const item of queue) {
    await generateAudio(item, voice);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // 4. Summary Report
  console.log(`\n════════════════════════════════════════`);
  console.log(` 🎉 OPERATION COMPLETE (${duration}s)`);
  console.log(`════════════════════════════════════════`);
  console.log(` ✅ Success: ${stats.success}`);
  console.log(` ❌ Failed:  ${stats.failed}`);
  console.log(`════════════════════════════════════════\n`);
}

async function analyzeMissing(filesToProcess) {
  console.log(`\n🔍 Analyzing audio coverage...\n`);
  let itemsToGenerate = [];

  for (const file of filesToProcess) {
    const items = getTranslationEntries(file);
    const missingItems = items.filter(item => !fs.existsSync(item.outputPath));

    if (missingItems.length > 0) {
      const langName = path.basename(file, '.json').toUpperCase();
      console.log(`❌ ${langName}: ${missingItems.length} missing files.`);
      missingItems.forEach(m => console.log(`      - ${m.id}`));
      console.log('');
      itemsToGenerate = itemsToGenerate.concat(missingItems);
    } else {
      console.log(`✅ ${path.basename(file, '.json').toUpperCase()}: All audio present.`);
    }
  }

  if (itemsToGenerate.length > 0) {
    const { fix } = await inquirer.prompt([{
      type: 'confirm', name: 'fix', message: `Generate ${itemsToGenerate.length} missing files now?`, default: true
    }]);
    if (fix) await processQueue(itemsToGenerate);
  } else {
    console.log("\n✨ Everything looks perfect!");
  }
}

async function processStandard(filesToProcess) {
  const finalQueue = [];

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
        message: `Select items for ${langName}:`,
        choices: allItems.map(item => ({
          name: `${item.id} ("${item.text.substring(0, 30)}...")`,
          value: item
        })),
        pageSize: 15,
        validate: ans => ans.length > 0 ? true : 'Pick at least one item.'
      }]);
      finalQueue.push(...selectedItems);
    }
  }

  await processQueue(finalQueue);
}

// --- MAIN MENU ---

async function main() {
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const allFiles = fs.readdirSync(I18N_DIR)
    .filter(file => path.extname(file) === '.json' && file !== 'en.json');

  if (allFiles.length === 0) { console.log("❌ No translation files found."); return; }

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

  // 3. Execute
  if (mode === 'analyze') {
    await analyzeMissing(filesToProcess);
  } else {
    await processStandard(filesToProcess);
  }
}

main();
