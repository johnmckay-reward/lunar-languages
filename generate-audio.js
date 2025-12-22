require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const levenshtein = require('fast-levenshtein');
const inquirer = require('inquirer').default;
const { pinyin } = require('pinyin-pro'); // 🆕 REQUIRED: npm install pinyin-pro

// --- CONFIGURATION ---
const I18N_DIR = path.join(__dirname, 'src/assets/i18n');
const AUDIO_DIR = path.join(__dirname, 'src/assets/audio');

const RETRY_LIMIT = 2;
const SIMILARITY_THRESHOLD = 80; // ⬆️ Bumped slightly for higher quality
const ENABLE_AI_REPAIR = true;

const PRICE_PER_1K_CHARS = 0.030; // approx model pricing

// 🗣️ SMART VOICE MAPPING
const VOICE_MAP = {
  de: 'onyx',    en: 'echo',    es: 'alloy',   fr: 'nova',    it: 'shimmer',
  ja: 'alloy',   pl: 'alloy',   pt: 'fable',   ru: 'onyx',    uk: 'nova',
  zh: 'shimmer', ko: 'nova',    default: 'echo'
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stats = { success: 0, failed: 0, repaired: 0 };

// --- HELPER FUNCTIONS ---

function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase()
    // 🆕 Universal Punctuation Strip: Includes CJK (Chinese/Japanese) & Standard Symbols
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"?\u3000-\u303F\uFF00-\uFFEF\u2000-\u206F]/g, "")
    // Remove diacritics (accents) for looser comparison in Latin langs
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getScore(str1, str2) {
  if (str1 === str2) return 100;
  const distance = levenshtein.get(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return (1 - distance / maxLength) * 100;
}

/**
 * 🧠 Intelligent Similarity Calculator
 * Adapts comparison logic based on the language to avoid false negatives.
 */
function calculateSimilarity(original, transcribed, langCode = 'en') {

  // 1. 🇨🇳 CHINESE SPECIALIST (Phonetic Comparison)
  // Ignores character differences (Traditional vs Simplified) and focuses on sound (Pinyin).
  if (langCode === 'zh') {
    try {
      const origPinyin = pinyin(original, { toneType: 'none', nonZh: 'consecutive' }).replace(/\s+/g, '');
      const transPinyin = pinyin(transcribed, { toneType: 'none', nonZh: 'consecutive' }).replace(/\s+/g, '');
      return getScore(origPinyin, transPinyin);
    } catch (e) {
      console.warn('      ⚠️ Pinyin conversion failed, falling back to standard text match.');
    }
  }

  const normOriginal = normalizeText(original);
  const normTranscribed = normalizeText(transcribed);

  // 2. 📄 Standard Text Comparison (Latin/Cyrillic)
  const standardScore = getScore(normOriginal, normTranscribed);
  if (standardScore >= SIMILARITY_THRESHOLD) return standardScore;

  // 3. 🍱 Squash Comparison (Japanese/Thai/Korean)
  // Removes ALL spaces. Essential for languages where spaces are optional or non-existent.
  const squashOriginal = normOriginal.replace(/\s+/g, '');
  const squashTranscribed = normTranscribed.replace(/\s+/g, '');
  const squashScore = getScore(squashOriginal, squashTranscribed);

  return Math.max(standardScore, squashScore);
}

// 🩹 SURGICAL UPDATE (Regex-based)
function updateSourceFile(fileName, section, key, newText, newPhonetic) {
  const filePath = path.join(I18N_DIR, fileName);
  try {
    let fileContent = fs.readFileSync(filePath, 'utf8');

    const replaceInKeyBlock = (content, targetKey, field, newValue) => {
      // Regex looks for "key": { ... "field": "OLD_VALUE" ... }
      // Handles potential newlines/spaces between keys
      const regex = new RegExp(
        `("${targetKey}"\\s*:\\s*\\{[^}]*?"${field}"\\s*:\\s*")([^"]*)(")`,
        's'
      );
      return content.replace(regex, `$1${newValue}$3`);
    };

    let updatedContent = replaceInKeyBlock(fileContent, key, 'text', newText);

    // Only update phonetic if provided
    if (newPhonetic) {
      updatedContent = replaceInKeyBlock(updatedContent, key, 'phonetic', newPhonetic);
    }

    if (fileContent !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`      💾 Source JSON updated: ${fileName}`);
      return true;
    } else {
      console.warn(`      ⚠️  Could not locate key "${key}" to update.`);
      return false;
    }
  } catch (err) {
    console.error(`      ❌ Failed to update JSON: ${err.message}`);
    return false;
  }
}

// 🤖 AI REPAIR LOGIC
async function repairPhraseWithAI(item, currentText, failedTranscription, langCode) {
  console.log(`      🤖 AI Doctor analyzing failure...`);
  console.log(`         Expected: "${currentText}"`);
  console.log(`         Heard:    "${failedTranscription}"`);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a linguistic engineer fixing TTS (Text-to-Speech) failures.

          CONTEXT:
          We generated audio for a phrase in '${langCode}', but the verification AI misheard it.

          COMMON CAUSES:
          - Homophones (words that sound the same but are written differently).
          - Ambiguous pronunciation in short words.
          - Numbers/Dates (TTS might say "twenty-two" vs "22").

          YOUR GOAL:
          Rewrite the phrase in '${langCode}' so it is phonetically distinct and unambiguous.
          1. Keep the EXACT meaning.
          2. Use synonyms if the current word is causing phonetic confusion.
          3. Add punctuation to force pauses if it helps clarity.

          Return JSON: { "text": "New Robust Phrase", "phonetic": "Optional Phonetic Guide" }`
        },
        {
          role: "user",
          content: `Original Text: "${currentText}"
          What AI Heard: "${failedTranscription}"

          Fix this.`
        }
      ]
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error(`      ❌ AI Repair failed: ${error.message}`);
    return null;
  }
}

async function verifyAudio(filePath, originalText, langCode) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: langCode,
      // prompt: originalText // Optional: Guiding Whisper with original text sometimes improves accuracy too much (false positives), so we leave it off for strict checking.
    });

    const cleanTranscribed = transcription.text || "";

    // 🆕 Passing langCode to allow language-specific logic
    const score = calculateSimilarity(originalText, cleanTranscribed, langCode);

    return { score, transcribedText: cleanTranscribed };
  } catch (error) {
    console.error(`      Verify Error: ${error.message}`);
    return { score: 0, transcribedText: "" };
  }
}

async function generateAudio(item, attempt = 1) {
  const voice = VOICE_MAP[item.langCode] || VOICE_MAP.default;

  try {
    const dir = path.dirname(item.outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (attempt === 1) console.log(`\n🔹 [${item.langCode.toUpperCase()}] ${item.id} (Voice: ${voice})`);

    // 1. Generate
    if (attempt === 1) process.stdout.write(`   🎤 Generating... `);
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: voice,
      input: item.text
    });
    await fs.promises.writeFile(item.outputPath, Buffer.from(await mp3.arrayBuffer()));

    // 2. Verify
    const { score, transcribedText } = await verifyAudio(item.outputPath, item.text, item.langCode);

    if (score < SIMILARITY_THRESHOLD) {
      console.log(`⚠️  Mismatch (${score.toFixed(0)}%)`);

      // A. Standard Retry
      if (attempt <= RETRY_LIMIT) {
        console.log(`      🔄 Retrying (Attempt ${attempt + 1}/${RETRY_LIMIT + 1})...`);
        return generateAudio(item, attempt + 1);
      }

      // B. AI Repair
      else if (ENABLE_AI_REPAIR) {
        console.log(`   🛑 All retries failed.`);

        const correction = await repairPhraseWithAI(item, item.text, transcribedText, item.langCode);

        if (correction && correction.text) {
          console.log(`      ✨ AI Suggestion: "${correction.text}"`);
          console.log(`      🧪 Testing suggestion...`);

          // --- TEST RUN START ---
          try {
            const testMp3 = await openai.audio.speech.create({
              model: "tts-1-hd", voice: voice, input: correction.text
            });
            await fs.promises.writeFile(item.outputPath, Buffer.from(await testMp3.arrayBuffer()));

            const testResult = await verifyAudio(item.outputPath, correction.text, item.langCode);

            if (testResult.score >= SIMILARITY_THRESHOLD) {
              console.log(`      ✅ Suggestion Verified (${testResult.score.toFixed(0)}%)! Committing changes...`);

              const section = item.id.split('.')[0];
              const key = item.id.split('.')[1];
              updateSourceFile(item.fileName, section, key, correction.text, correction.phonetic);

              stats.repaired++;
            } else {
              console.warn(`      ❌ Suggestion also failed verification (${testResult.score.toFixed(0)}%).`);
              console.warn(`         Reverting: JSON NOT updated. File deleted.`);
              await fs.promises.unlink(item.outputPath);
              stats.failed++;
            }
          } catch (testErr) {
            console.error(`      ❌ Error during test run: ${testErr.message}`);
            stats.failed++;
          }
          // --- TEST RUN END ---

        } else {
            console.error(`      ❌ FAILED: No AI suggestion available. Deleting file.`);
            try { await fs.promises.unlink(item.outputPath); } catch (e) {}
            stats.failed++;
        }
      } else {
        console.error(`      ❌ FAILED: Deleting file.`);
        try { await fs.promises.unlink(item.outputPath); } catch (e) {}
        stats.failed++;
      }
    } else {
      console.log(`✅ Verified`);
      stats.success++;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    stats.failed++;
  }
}

// --- QUEUE & MENU LOGIC ---

function getTranslationEntries(filename) {
  const filePath = path.join(I18N_DIR, filename);
  const langCode = path.basename(filename, '.json');
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const items = [];

    const extract = (sectionName, sectionData) => {
      if (!sectionData) return;
      for (const [key, data] of Object.entries(sectionData)) {
        if (data && typeof data === 'object' && data.text) {
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

    // Customize based on JSON structure
    if(content.essentials) extract('essentials', content.essentials);
    if(content.combinations) extract('combinations', content.combinations);

    return items;
  } catch (err) { return []; }
}

async function processQueue(queue) {
  if (queue.length === 0) { console.log("No items."); return; }

  const totalChars = queue.reduce((sum, item) => sum + item.text.length, 0);
  console.log(`\n💰 ESTIMATE: ${queue.length} items (~$${((totalChars/1000)*PRICE_PER_1K_CHARS).toFixed(4)})`);

  const { proceed } = await inquirer.prompt([{ type: 'confirm', name: 'proceed', message: 'Start generation?', default: true }]);
  if (!proceed) return;

  const startTime = Date.now();
  for (const item of queue) await generateAudio(item);

  console.log(`\n════════════════ SUMMARY ════════════════`);
  console.log(` ✅ Success:  ${stats.success}`);
  console.log(` 🛠️  Repaired: ${stats.repaired}`);
  console.log(` ❌ Failed:   ${stats.failed}`);
  console.log(` ⏱️  Time:     ${((Date.now() - startTime)/1000).toFixed(1)}s`);
  console.log(`═════════════════════════════════════════\n`);
}

async function main() {
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const allFiles = fs.readdirSync(I18N_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

  if (allFiles.length === 0) return console.log("No translation files found in src/assets/i18n.");

  const { mode } = await inquirer.prompt([{
    type: 'list', name: 'mode', message: 'Select Task:',
    choices: [
      { name: '🔍 Analyze Coverage (Find missing files)', value: 'analyze' },
      { name: '🎤 Generate Audio (Select specific)', value: 'standard' }
    ]
  }]);

  let queue = [];

  if (mode === 'analyze') {
    for (const file of allFiles) {
      const entries = getTranslationEntries(file);
      const missing = entries.filter(i => !fs.existsSync(i.outputPath));

      if (missing.length) {
        console.log(`❌ ${path.basename(file, '.json').toUpperCase()}: ${missing.length} missing audio files.`);
        queue.push(...missing);
      } else {
        console.log(`✅ ${path.basename(file, '.json').toUpperCase()}: 100% Coverage.`);
      }
    }

    if (queue.length > 0) {
      const { fix } = await inquirer.prompt([{ type: 'confirm', name: 'fix', message: `Generate ${queue.length} missing files now?`, default: true }]);
      if (fix) await processQueue(queue);
    }
  } else {
    const { selectionType } = await inquirer.prompt([{
      type: 'list', name: 'selectionType', message: 'Scope:',
      choices: [{name: 'All Languages', value: 'all'}, {name: 'Select Specific Languages', value: 'select'}]
    }]);

    let selectedFiles = allFiles;
    if (selectionType === 'select') {
      const { sel } = await inquirer.prompt([{
        type: 'checkbox', name: 'sel', message: 'Pick languages:',
        choices: allFiles.map(f => ({name: path.basename(f, '.json').toUpperCase(), value: f}))
      }]);
      selectedFiles = sel;
    }

    for (const file of selectedFiles) {
      const items = getTranslationEntries(file);
      const { scope } = await inquirer.prompt([{
        type: 'list', name: 'scope', message: `For ${path.basename(file, '.json').toUpperCase()}:`,
        choices: [{name: 'All Items', value: 'all'}, {name: 'Pick Specific Items', value: 'pick'}]
      }]);

      if (scope === 'all') queue.push(...items);
      else {
        const { picked } = await inquirer.prompt([{
          type: 'checkbox', name: 'picked', message: 'Select items:',
          choices: items.map(i => ({name: i.id, value: i}))
        }]);
        queue.push(...picked);
      }
    }
    await processQueue(queue);
  }
}

main();
