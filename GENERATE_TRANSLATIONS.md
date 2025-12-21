# 🌍 Generate Translations - Quick Start Guide

## What You Need

1. An OpenAI API key (with GPT-4 access)
2. Node.js installed (already have ✓)

## Step 1: Set Up Your API Key

Create a `.env` file in the project root:

```bash
echo "OPENAI_API_KEY=your-api-key-here" > .env
```

Replace `your-api-key-here` with your actual OpenAI API key.

## Step 2: Run the Translation Generator

Simply run:

```bash
npm run generate-translations
```

Or directly:

```bash
node generate-translations.js
```

## What It Does

The script will:
- ✅ Find all 100 placeholder phrases in each language file
- ✅ Generate high-quality translations using GPT-4
- ✅ Create phonetic pronunciation guides
- ✅ Update all 10 language JSON files automatically
- ✅ Show progress and summary

## Expected Output

```
🌍 TRANSLATION GENERATOR
========================

This script will generate translations for all placeholder entries
using OpenAI GPT-4.

📝 Processing Mandarin Chinese (zh)...
   Found 100 phrases to translate
   [1/100] table_for_two... ✓
   [2/100] table_for_four... ✓
   ...
   ✓ Translated: 100, Failed: 0

📝 Processing Spanish (es)...
   ...

==================================================
📊 SUMMARY
==================================================
Total phrases translated: 1000
Total failures: 0

✓ Translation generation complete!
```

## Cost Estimate

- Approximately $30-60 USD total
- Uses GPT-4 for high-quality translations
- Processes 1000 translations (100 phrases × 10 languages)

## After Running

All language files will be updated with proper translations:
- `src/assets/i18n/zh.json` ✓
- `src/assets/i18n/es.json` ✓
- `src/assets/i18n/fr.json` ✓
- `src/assets/i18n/de.json` ✓
- `src/assets/i18n/ja.json` ✓
- `src/assets/i18n/it.json` ✓
- `src/assets/i18n/pt.json` ✓
- `src/assets/i18n/uk.json` ✓
- `src/assets/i18n/ru.json` ✓
- `src/assets/i18n/pl.json` ✓

## Troubleshooting

### "OPENAI_API_KEY not found"
Make sure your `.env` file exists and contains your API key.

### "Rate limit exceeded"  
The script has built-in delays. If you still hit limits, wait a few minutes and run again.

### Want to stop and resume later?
Just press Ctrl+C. The script is safe to run multiple times - it won't re-translate phrases that are already done.

## Alternative: Manual Translation

If you don't want to use AI translation, you can manually edit the JSON files in `src/assets/i18n/` and replace the placeholder entries.

---

**Ready?** Just run: `npm run generate-translations`
