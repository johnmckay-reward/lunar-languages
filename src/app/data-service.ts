import { Injectable } from '@angular/core';

// --- INTERFACES ---

export interface Translation {
  text: string;      // The native script (e.g., "你好")
  phonetic: string;  // Pronunciation guide (e.g., "Nǐ hǎo")
  audio?: string;    // Path to audio file (optional for now)
}

export interface Phrase {
  id: string;
  type: 'essential' | 'starter' | 'noun';
  category?: string; // Only for Nouns (e.g., 'Transport', 'Food')
  english: string;   // Display label
  // Essentials have direct translations. Starters/Nouns rely on the Combination Map.
  translations?: {
    mandarin?: Translation;
    spanish?: Translation;
    // Add other languages here
  };
}

// The Master Dictionary for Sentence Building
export interface CombinationMap {
  [key: string]: {
    english: string;
    mandarin?: Translation;
    spanish?: Translation;
    // Add other languages here
  };
}

@Injectable({
  providedIn: 'root'
})
export class DataService {

  // ============================================================
  // 1. ESSENTIALS (Standalone phrases - Always available)
  // ============================================================
  private essentials: Phrase[] = [
    {
      id: 'hello', type: 'essential', english: 'Hello',
      translations: {
        mandarin: { text: '你好', phonetic: 'Nǐ hǎo' },
        spanish: { text: 'Hola', phonetic: 'OH-lah' }
      }
    },
    {
      id: 'thanks', type: 'essential', english: 'Thank you',
      translations: {
        mandarin: { text: '谢谢', phonetic: 'Xièxiè' },
        spanish: { text: 'Gracias', phonetic: 'GRAH-see-ahs' }
      }
    },
    {
      id: 'bathroom', type: 'essential', english: 'Where is the bathroom?',
      translations: {
        mandarin: { text: '洗手间在哪里？', phonetic: 'Xǐshǒujiān zài nǎlǐ?' },
        spanish: { text: '¿Dónde está el baño?', phonetic: 'DON-deh es-TA el BAN-yo' }
      }
    },
    {
      id: 'yes', type: 'essential', english: 'Yes',
      translations: {
        mandarin: { text: '是', phonetic: 'Shì' },
        spanish: { text: 'Sí', phonetic: 'See' }
      }
    },
    {
      id: 'no', type: 'essential', english: 'No',
      translations: {
        mandarin: { text: '不', phonetic: 'Bù' },
        spanish: { text: 'No', phonetic: 'Noh' }
      }
    },
    {
      id: 'sorry', type: 'essential', english: 'Excuse me / Sorry',
      translations: {
        mandarin: { text: '不好意思', phonetic: 'Bù hǎoyìsi' },
        spanish: { text: 'Perdón', phonetic: 'Pehr-DON' }
      }
    }
  ];

  // ============================================================
  // 2. STARTERS (The "Operators")
  // ============================================================
  private starters: Phrase[] = [
    { id: 'where', type: 'starter', english: 'Where is...?' },
    { id: 'like', type: 'starter', english: 'I would like...' },
    { id: 'have', type: 'starter', english: 'Do you have...?' },
    { id: 'cost', type: 'starter', english: 'How much is...?' },
    { id: 'allergic', type: 'starter', english: 'I am allergic to...' }
  ];

  // ============================================================
  // 3. NOUNS (The "Fillers")
  // ============================================================
  private nouns: Phrase[] = [
    // Transport
    { id: 'station', type: 'noun', category: 'Transport', english: 'The Station' },
    { id: 'airport', type: 'noun', category: 'Transport', english: 'The Airport' },
    { id: 'ticket', type: 'noun', category: 'Transport', english: 'A Ticket' },
    { id: 'taxi', type: 'noun', category: 'Transport', english: 'A Taxi' },
    { id: 'atm', type: 'noun', category: 'Transport', english: 'The ATM' },

    // Accommodation
    { id: 'wifi', type: 'noun', category: 'Accommodation', english: 'WiFi' },
    { id: 'key', type: 'noun', category: 'Accommodation', english: 'The Key' },
    { id: 'room', type: 'noun', category: 'Accommodation', english: 'A Room' },

    // Dining
    { id: 'water', type: 'noun', category: 'Dining', english: 'Water' },
    { id: 'coffee', type: 'noun', category: 'Dining', english: 'Coffee' },
    { id: 'menu', type: 'noun', category: 'Dining', english: 'The Menu' },
    { id: 'bill', type: 'noun', category: 'Dining', english: 'The Bill' },

    // Health / Safety
    { id: 'peanuts', type: 'noun', category: 'Health', english: 'Peanuts' },
    { id: 'doctor', type: 'noun', category: 'Health', english: 'A Doctor' },
    { id: 'pharmacy', type: 'noun', category: 'Health', english: 'Pharmacy' },

    // Tech
    { id: 'charger', type: 'noun', category: 'Tech', english: 'Charger' },
  ];

  // ============================================================
  // 4. COMBINATIONS (The Sentence Lookup Logic)
  // Format: "starterId_nounId"
  // ============================================================
  private combinations: CombinationMap = {
    // --- WHERE IS...? ---
    'where_station': {
      english: 'Where is the train station?',
      mandarin: { text: '火车站在哪里？', phonetic: 'Huǒchē zhàn zài nǎlǐ?' },
      spanish: { text: '¿Dónde está la estación de tren?', phonetic: '...' }
    },
    'where_airport': { english: 'Where is the airport?' },
    'where_ticket': { english: 'Where can I buy a ticket?' }, // Context adjusted
    'where_taxi': { english: 'Where is the taxi stand?' },
    'where_atm': { english: 'Where is the ATM?' },
    'where_pharmacy': { english: 'Where is the pharmacy?' },
    'where_doctor': { english: 'Where is a doctor?' },

    // --- I WOULD LIKE... ---
    'like_ticket': { english: 'I would like a ticket please.' },
    'like_taxi': { english: 'I would like a taxi please.' },
    'like_water': { english: 'I would like some water.' },
    'like_coffee': { english: 'I would like a coffee.' },
    'like_menu': { english: 'I would like the menu please.' },
    'like_bill': { english: 'I would like the bill please.' },

    // --- DO YOU HAVE...? ---
    'have_wifi': { english: 'Do you have WiFi?' },
    'have_room': { english: 'Do you have a room available?' },
    'have_charger': { english: 'Do you have a charger?' },
    'have_menu': { english: 'Do you have a menu in English?' }, // Context added

    // --- HOW MUCH IS...? ---
    'cost_ticket': { english: 'How much is a ticket?' },
    'cost_taxi': { english: 'How much is the taxi?' },
    'cost_room': { english: 'How much is the room?' },
    'cost_coffee': { english: 'How much is a coffee?' },

    // --- I AM ALLERGIC TO... ---
    'allergic_peanuts': {
      english: 'I am allergic to peanuts.',
      mandarin: { text: '我对花生过敏', phonetic: 'Wǒ duì huāshēng guòmǐn' }
    },
    // Add other allergies here if you add nouns for seafood, etc.
  };

  constructor() { }

  /**
   * Get Essentials (Power Phrases)
   */
  getEssentials() {
    return this.essentials;
  }

  /**
   * Get Sentence Starters
   */
  getStarters() {
    return this.starters;
  }

  /**
   * Get Nouns, optionally filtered by category
   */
  getNouns(category: string = 'All') {
    if (category === 'All') {
      return this.nouns;
    }
    return this.nouns.filter(n => n.category === category);
  }

  /**
   * Get unique categories for filter chips
   */
  getCategories() {
    const categories = new Set(this.nouns.map(n => n.category));
    return Array.from(categories).sort();
  }

  /**
   * CORE LOGIC: Get the full translated sentence
   * Returns the Combination object if it exists, or a fallback.
   */
  getSentence(starterId: string, nounId: string) {
    const key = `${starterId}_${nounId}`;
    const combo = this.combinations[key];

    if (combo) {
      return combo;
    } else {
      // Fallback if we haven't defined a combination yet
      // This helps you spot missing data during development
      return {
        english: `[MISSING: ${key}]`,
        mandarin: { text: '...', phonetic: '...' }
      };
    }
  }

  isValidCombination(starterId: string, nounId: string): boolean {
    const key = `${starterId}_${nounId}`;
    return this.combinations.hasOwnProperty(key);
  }
}
