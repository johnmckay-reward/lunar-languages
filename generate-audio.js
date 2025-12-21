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
const ENABLE_AI_REPAIR = true;

const PRICE_PER_1K_CHARS = 0.030;

// 🗣️ SMART VOICE MAPPING
const VOICE_MAP = {
  de: 'onyx',    en: 'echo',    es: 'alloy',   fr: 'nova',    it: 'shimmer',
  ja: 'alloy',   pl: 'alloy',   pt: 'fable',   ru: 'onyx',    uk: 'nova',
  zh: 'shimmer', default: 'echo'
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stats = { success: 0, failed: 0, repaired: 0 };

// --- HELPER FUNCTIONS ---

function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[¡¿]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"?]/g, "")
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

function calculateSimilarity(original, transcribed) {
  const normOriginal = normalizeText(original);
  const normTranscribed = normalizeText(transcribed);

  const standardScore = getScore(normOriginal, normTranscribed);
  if (standardScore >= SIMILARITY_THRESHOLD) return standardScore;

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
      const regex = new RegExp(
        `("${targetKey}"\\s*:\\s*\\{[^}]*?"${field}"\\s*:\\s*")([^"]*)(")`,
        's'
      );
      return content.replace(regex, `$1${newValue}$3`);
    };

    let updatedContent = replaceInKeyBlock(fileContent, key, 'text', newText);
    updatedContent = replaceInKeyBlock(updatedContent, key, 'phonetic', newPhonetic);

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

// 🤖 AI REPAIR LOGIC (Strict Mode)
async function repairPhraseWithAI(item, currentText, langCode) {
  console.log(`      🤖 Asking AI to rephrase "${currentText}"...`);
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a linguistic expert helper for a TTS (Text-to-Speech) system.

          Context: A phrase in language '${langCode}' failed verification (the AI voice wasn't understood by the AI listener).

          Goal: Suggest an alternative phrasing *IN THE SAME LANGUAGE (${langCode})* that is clearer, more formal, or phonetically distinct, while keeping the exact same meaning.

          STRICT RULES:
          1. The "text" field MUST be in '${langCode}'. Do NOT use English (unless '${langCode}' is 'en').
          2. Do not change the meaning.
          3. Provide a new phonetic guide.

          Return JSON: { "text": "New Phrase (in ${langCode})", "phonetic": "Phon-ET-ic" }`
        },
        { role: "user", content: `The failing phrase is: "${currentText}". Fix it.` }
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
    });
    return { score: calculateSimilarity(originalText, transcription.text), transcribedText: transcription.text };
  } catch (error) {
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
    if (attempt === 1) console.log(`   🎤 Generating...`);
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: voice,
      input: item.text
    });
    await fs.promises.writeFile(item.outputPath, Buffer.from(await mp3.arrayBuffer()));

    // 2. Verify
    process.stdout.write(`   👂 Verifying... `);
    const { score, transcribedText } = await verifyAudio(item.outputPath, item.text, item.langCode);

    if (score < SIMILARITY_THRESHOLD) {
      console.log(`⚠️  Mismatch (${score.toFixed(0)}%)`);
      console.log(`      Exp: "${item.text}"`);
      console.log(`      Got: "${transcribedText}"`);

      // A. Standard Retry
      if (attempt <= RETRY_LIMIT) {
        console.log(`      🔄 Retrying (Attempt ${attempt + 1}/${RETRY_LIMIT + 1})...`);
        return generateAudio(item, attempt + 1);
      }

      // B. AI Repair (TRANSACTION SAFE)
      else if (ENABLE_AI_REPAIR) {
        console.log(`   🛑 All retries failed.`);

        const correction = await repairPhraseWithAI(item, item.text, item.langCode);

        if (correction && correction.text) {
          console.log(`      ✨ AI Suggestion: "${correction.text}"`);
          console.log(`      🧪 Testing suggestion before saving...`);

          // --- TEST RUN START ---
          try {
            // 1. Generate Audio for Suggestion
            const testMp3 = await openai.audio.speech.create({
              model: "tts-1-hd", voice: voice, input: correction.text
            });
            await fs.promises.writeFile(item.outputPath, Buffer.from(await testMp3.arrayBuffer()));

            // 2. Verify Suggestion
            const testResult = await verifyAudio(item.outputPath, correction.text, item.langCode);

            // 3. DECISION MOMENT
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
        // C. Ultimate Failure
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
  } catch (err) { return []; }
}

async function processQueue(queue) {
  if (queue.length === 0) { console.log("No items."); return; }

  const totalChars = queue.reduce((sum, item) => sum + item.text.length, 0);
  console.log(`\n💰 ESTIMATE: ${queue.length} items (~$${((totalChars/1000)*PRICE_PER_1K_CHARS).toFixed(4)})`);

  const { proceed } = await inquirer.prompt([{ type: 'confirm', name: 'proceed', message: 'Start?', default: true }]);
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
  if (allFiles.length === 0) return console.log("No files found.");

  const { mode } = await inquirer.prompt([{
    type: 'list', name: 'mode', message: 'Task:',
    choices: [ { name: '🔍 Analyze Coverage', value: 'analyze' }, { name: '🎤 Generate Audio', value: 'standard' } ]
  }]);

  let queue = [];

  if (mode === 'analyze') {
    for (const file of allFiles) {
      const missing = getTranslationEntries(file).filter(i => !fs.existsSync(i.outputPath));
      if (missing.length) {
        console.log(`❌ ${path.basename(file, '.json').toUpperCase()}: ${missing.length} missing.`);
        queue.push(...missing);
      } else {
        console.log(`✅ ${path.basename(file, '.json').toUpperCase()}: Complete.`);
      }
    }
    if (queue.length > 0) {
      const { fix } = await inquirer.prompt([{ type: 'confirm', name: 'fix', message: 'Generate missing?', default: true }]);
      if (fix) await processQueue(queue);
    }
  } else {
    const { selectionType } = await inquirer.prompt([{
      type: 'list', name: 'selectionType', message: 'Scope:',
      choices: [{name: 'All Languages', value: 'all'}, {name: 'Select Languages', value: 'select'}]
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
        choices: [{name: 'All Items', value: 'all'}, {name: 'Pick Items', value: 'pick'}]
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
