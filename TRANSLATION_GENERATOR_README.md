# Translation Generator Script

This script automatically generates high-quality translations for all placeholder phrases across all supported languages using OpenAI's GPT-4.

## Prerequisites

1. **Node.js** and **npm** installed
2. **OpenAI API Key** with GPT-4 access
3. All dependencies installed: `npm install`

## Setup

1. Create a `.env` file in the project root if you don't have one:
   ```bash
   touch .env
   ```

2. Add your OpenAI API key to the `.env` file:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

3. Make sure you have GPT-4 API access (required for high-quality translations)

## Usage

Run the translation generator:

```bash
node generate-translations.js
```

The script will:
1. Scan all language files for placeholder translations (entries with `[LANG TODO: ...]`)
2. Generate proper translations with phonetic guides for each language
3. Save the updated translations back to the JSON files
4. Display a summary of translated vs. failed entries

## What It Does

For each placeholder phrase, the script:
- Sends the English phrase to GPT-4
- Requests a natural, conversational translation appropriate for travelers
- Gets a phonetic pronunciation guide suitable for English speakers
- Uses existing translations as context to maintain consistency
- Updates the language JSON file with the new translation

## Cost Estimation

- Uses GPT-4 for high-quality translations
- Approximate cost: $0.03-0.06 per phrase (varies by language complexity)
- Total cost for 100 phrases × 10 languages ≈ $30-60

## Supported Languages

The script generates translations for:
- 🇨🇳 Mandarin Chinese (zh) - with Pinyin
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇯🇵 Japanese (ja) - with Romaji
- 🇮🇹 Italian (it)
- 🇵🇹 Portuguese (pt)
- 🇺🇦 Ukrainian (uk)
- 🇷🇺 Russian (ru)
- 🇵🇱 Polish (pl)

## Output Format

Each translation includes:
- `text`: The translated phrase in the target language
- `phonetic`: A pronunciation guide for English speakers

Example:
```json
{
  "text": "Una mesa para dos, por favor.",
  "phonetic": "OO-nah MEH-sah PAH-rah dohs, por fah-VOR."
}
```

## Error Handling

If translations fail:
1. Check your internet connection
2. Verify your OpenAI API key is valid and has credits
3. Ensure you have GPT-4 API access
4. Re-run the script (it will skip already-translated phrases)

## Manual Review

After running the script, it's recommended to:
1. Review the generated translations for accuracy
2. Have native speakers verify critical phrases
3. Test the phonetic guides with actual users

## Alternative: Manual Translation

If you prefer not to use AI translation or don't have an OpenAI API key, you can:
1. Manually edit the language JSON files in `src/assets/i18n/`
2. Replace placeholder entries with proper translations
3. Ensure all entries have both `text` and `phonetic` fields

## Files Modified

The script modifies these files:
- `src/assets/i18n/zh.json`
- `src/assets/i18n/es.json`
- `src/assets/i18n/fr.json`
- `src/assets/i18n/de.json`
- `src/assets/i18n/ja.json`
- `src/assets/i18n/it.json`
- `src/assets/i18n/pt.json`
- `src/assets/i18n/uk.json`
- `src/assets/i18n/ru.json`
- `src/assets/i18n/pl.json`

## Troubleshooting

### "OPENAI_API_KEY not found"
- Make sure you have a `.env` file in the project root
- Check that the file contains `OPENAI_API_KEY=your-key`

### "Rate limit exceeded"
- The script includes a 500ms delay between requests
- If you still hit limits, you can increase the delay in the code

### "All phrases already translated"
- This means all placeholders have been replaced
- The script won't re-translate existing valid translations

## Notes

- The script uses GPT-4 (not GPT-3.5) for better translation quality
- Temperature is set to 0.3 for more consistent translations
- Existing good translations are used as context for consistency
- The script is idempotent - safe to run multiple times
