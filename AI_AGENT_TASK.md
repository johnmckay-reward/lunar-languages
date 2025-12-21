# Task: Add 100 New "Combination" Phrases to All Language Files

### 🎯 Objective
We need to expand the vocabulary of the app by adding **100 new useful phrases** to the `combinations` section of our translation files. These phrases should focus on practical travel scenarios and daily interactions.

### 📂 Files to Modify
Please update the `src/assets/i18n/*.json` files for all supported languages:
- `en.json` (English - Base)
- `zh.json` (Mandarin)
- `es.json` (Spanish)
- `fr.json` (French)
- `de.json` (German)
- `ja.json` (Japanese)
- `it.json` (Italian)
- `pt.json` (Portuguese)
- `uk.json` (Ukrainian)
- `ru.json` (Russian)
- `pl.json` (Polish)

### 📝 Requirements

1.  **Section**: Add all new entries to the `"combinations"` object in the JSON files. **Do not** modify the `"essentials"` section.
2.  **Consistency**: The JSON keys (e.g., `hotel_check_in`, `order_water`) must be **identical** across all language files.
3.  **Format**: Each entry must follow this structure:
    ```json
    "key_name": {
      "text": "The translated phrase",
      "phonetic": "A rough phonetic pronunciation guide"
    }
    ```
    *(Note: For `en.json`, the `phonetic` field can be left empty).*
4.  **Content**: Generate 100 phrases covering these categories:
    -   **Dining**: Ordering specific foods, asking about ingredients, dietary restrictions.
    -   **Transport**: Buying tickets, asking for directions, bus/train inquiries.
    -   **Accommodation**: Check-in/out, asking for towels, reporting issues.
    -   **Shopping**: Asking for prices, sizes, trying things on.
    -   **Emergencies**: Pharmacy, doctor, police, lost items.
    -   **Social**: Basic small talk, asking where someone is from.
5.  **Audio**: **Ignore audio generation.** Do not worry about the `audio` field or generating files. This will be handled separately.

### 💡 Example

**In `en.json`:**
```json
"table_for_two": { "text": "A table for two, please.", "phonetic": "" }
```

**In `fr.json`:**
```json
"table_for_two": { "text": "Une table pour deux, s'il vous plaît.", "phonetic": "ewn tah-bluh poor duh, seel voo play" }
```

**In `es.json`:**
```json
"table_for_two": { "text": "Una mesa para dos, por favor.", "phonetic": "oo-nah meh-sah pah-rah dohs, por fah-vor" }
```
