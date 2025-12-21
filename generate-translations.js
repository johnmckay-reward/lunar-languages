#!/usr/bin/env node
/**
 * TRANSLATION GENERATOR SCRIPT
 * 
 * This script automatically generates high-quality translations for all new phrases
 * across all supported languages using OpenAI's GPT-4.
 * 
 * Usage:
 *   node generate-translations.js
 * 
 * Requirements:
 *   - OPENAI_API_KEY in .env file
 *   - Node.js and npm packages installed
 * 
 * This script will:
 *   1. Read the English phrases from en.json
 *   2. Identify phrases that need translation (placeholder entries)
 *   3. Generate translations with phonetics for each language
 *   4. Update all language JSON files
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// --- CONFIGURATION ---
const I18N_DIR = path.join(__dirname, 'src/assets/i18n');

const SUPPORTED_LANGUAGES = {
  'zh': { name: 'Mandarin Chinese', phoneticSystem: 'Pinyin' },
  'es': { name: 'Spanish', phoneticSystem: 'IPA-like approximation' },
  'fr': { name: 'French', phoneticSystem: 'IPA-like approximation' },
  'de': { name: 'German', phoneticSystem: 'IPA-like approximation' },
  'ja': { name: 'Japanese', phoneticSystem: 'Romaji' },
  'it': { name: 'Italian', phoneticSystem: 'IPA-like approximation' },
  'pt': { name: 'Portuguese', phoneticSystem: 'IPA-like approximation' },
  'uk': { name: 'Ukrainian', phoneticSystem: 'Romanization' },
  'ru': { name: 'Russian', phoneticSystem: 'Romanization' },
  'pl': { name: 'Polish', phoneticSystem: 'IPA-like approximation' }
};

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY not found in environment variables');
  console.error('   Please create a .env file with your OpenAI API key:');
  console.error('   OPENAI_API_KEY=your-key-here');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- HELPER FUNCTIONS ---

function loadJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function isPlaceholder(entry) {
  // Check if this is a placeholder translation (contains "TODO" or starts with bracket)
  return entry.text && (entry.text.includes('TODO') || entry.text.startsWith('['));
}

async function translatePhrase(englishText, targetLang, langInfo, existingTranslations = []) {
  const { name, phoneticSystem } = langInfo;
  
  // Build context from existing translations to maintain consistency
  let contextExamples = '';
  if (existingTranslations.length > 0) {
    contextExamples = '\n\nFor consistency, here are some existing translations in this language:\n';
    existingTranslations.slice(0, 3).forEach(ex => {
      contextExamples += `English: "${ex.en}"\n${name}: "${ex.text}"\nPhonetic: "${ex.phonetic}"\n\n`;
    });
  }

  const prompt = `You are a professional translator specializing in ${name} for travel phrasebooks.

Translate the following English phrase into ${name} and provide a phonetic pronunciation guide using ${phoneticSystem}.

English phrase: "${englishText}"

Requirements:
1. Provide a natural, conversational translation suitable for travelers
2. The translation should be polite and appropriate for speaking to strangers
3. Provide a phonetic guide that helps English speakers pronounce it correctly
4. The phonetic guide should use ${phoneticSystem}
5. Keep the phonetic guide practical and readable for English speakers${contextExamples}

Respond in JSON format:
{
  "text": "the translated phrase in ${name}",
  "phonetic": "the phonetic pronunciation guide"
}

JSON response:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert translator and linguist specializing in ${name}. You provide accurate, natural translations with helpful phonetic guides for English speakers.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 500
    });

    const content = response.choices[0].message.content;
    
    // Extract JSON from the response (handle markdown code blocks if present)
    let jsonStr = content.trim();
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }
    
    const translation = JSON.parse(jsonStr);
    
    return {
      text: translation.text,
      phonetic: translation.phonetic
    };
  } catch (error) {
    console.error(`   ❌ Error translating to ${name}:`, error.message);
    return null;
  }
}

async function generateTranslationsForLanguage(langCode, langInfo) {
  console.log(`\n📝 Processing ${langInfo.name} (${langCode})...`);
  
  const enPath = path.join(I18N_DIR, 'en.json');
  const langPath = path.join(I18N_DIR, `${langCode}.json`);
  
  const enData = loadJSON(enPath);
  const langData = loadJSON(langPath);
  
  // Get all combination keys from English
  const allKeys = Object.keys(enData.combinations);
  
  // Find keys that need translation (are placeholders)
  const keysToTranslate = allKeys.filter(key => {
    const entry = langData.combinations[key];
    return entry && isPlaceholder(entry);
  });
  
  if (keysToTranslate.length === 0) {
    console.log(`   ✓ All phrases already translated!`);
    return { translated: 0, skipped: 0 };
  }
  
  console.log(`   Found ${keysToTranslate.length} phrases to translate`);
  
  // Collect some existing good translations for context
  const existingGoodTranslations = [];
  for (const key of allKeys) {
    const entry = langData.combinations[key];
    if (entry && !isPlaceholder(entry)) {
      existingGoodTranslations.push({
        en: enData.combinations[key].text,
        text: entry.text,
        phonetic: entry.phonetic
      });
    }
  }
  
  let translated = 0;
  let failed = 0;
  
  // Translate each phrase
  for (let i = 0; i < keysToTranslate.length; i++) {
    const key = keysToTranslate[i];
    const englishText = enData.combinations[key].text;
    
    process.stdout.write(`   [${i + 1}/${keysToTranslate.length}] ${key}... `);
    
    const translation = await translatePhrase(
      englishText,
      langCode,
      langInfo,
      existingGoodTranslations
    );
    
    if (translation) {
      langData.combinations[key] = translation;
      translated++;
      console.log(`✓`);
    } else {
      failed++;
      console.log(`✗ FAILED`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save updated language file
  saveJSON(langPath, langData);
  
  console.log(`   ✓ Translated: ${translated}, Failed: ${failed}`);
  
  return { translated, failed };
}

async function main() {
  console.log('🌍 TRANSLATION GENERATOR');
  console.log('========================\n');
  console.log('This script will generate translations for all placeholder entries');
  console.log('using OpenAI GPT-4.\n');
  
  const stats = {
    totalTranslated: 0,
    totalFailed: 0
  };
  
  // Process each language
  for (const [langCode, langInfo] of Object.entries(SUPPORTED_LANGUAGES)) {
    const result = await generateTranslationsForLanguage(langCode, langInfo);
    stats.totalTranslated += result.translated;
    stats.totalFailed += result.failed;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total phrases translated: ${stats.totalTranslated}`);
  console.log(`Total failures: ${stats.totalFailed}`);
  console.log('\n✓ Translation generation complete!');
  
  if (stats.totalFailed > 0) {
    console.log('\n⚠️  Some translations failed. You may want to:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify your OpenAI API key has sufficient credits');
    console.log('   3. Re-run this script to retry failed translations');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
