import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import enData from '../assets/i18n/en.json';

// --- INTERFACES ---

export interface Translation {
  text: string;
  phonetic: string;
  audio?: string;
}

export interface ListenFor {
  text: string;
  phonetic: string;
  meaning: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  location: string;
  flag: string;
  phoneticGuide: string;
}

export interface Phrase {
  id: string;
  type: 'essential' | 'starter' | 'noun';
  category?: string;
  english: string;
  translation?: Translation;
  listenFor?: ListenFor[];
}

export interface CombinationMap {
  [key: string]: {
    english: string;
    translation?: Translation;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private readonly STORAGE_KEY = 'lunar_language';
  private currentTranslations: any = {};
  private languageLoaded = new BehaviorSubject<boolean>(false);
  private currentLanguage = new BehaviorSubject<LanguageInfo | null>(null);

  private supportedLanguages: LanguageInfo[] = [
    {
      code: 'zh',
      name: 'Mandarin',
      location: 'China',
      flag: '🇨🇳',
      phoneticGuide: 'Mandarin uses tones. Pay attention to the rising and falling marks (ā, á, ǎ, à) as they change the meaning.'
    },
    {
      code: 'es',
      name: 'Spanish',
      location: 'Spain',
      flag: '🇪🇸',
      phoneticGuide: 'Spanish vowels are short and crisp (a, e, i, o, u). The "r" is often rolled.'
    },
    {
      code: 'fr',
      name: 'French',
      location: 'France',
      flag: '🇫🇷',
      phoneticGuide: 'French flows smoothly. Many final consonants are silent. "R" is pronounced in the back of the throat.'
    },
    {
      code: 'de',
      name: 'German',
      location: 'Germany',
      flag: '🇩🇪',
      phoneticGuide: 'German is phonetic but crisp. "W" sounds like English "V". "V" sounds like English "F".'
    },
    {
      code: 'ja',
      name: 'Japanese',
      location: 'Japan',
      flag: '🇯🇵',
      phoneticGuide: 'Japanese syllables are equal length. Vowels are pure (ah, ee, oo, eh, oh). No stress accents.'
    },
    {
      code: 'it',
      name: 'Italian',
      location: 'Italy',
      flag: '🇮🇹',
      phoneticGuide: 'Italian is rhythmic and melodic. Vowels are clear and open. Double consonants are pronounced longer.'
    },
    {
      code: 'pt',
      name: 'Portuguese',
      location: 'Portugal',
      flag: '🇵🇹',
      phoneticGuide: 'Portuguese is nasal and smooth. Vowels can be open or closed. "S" at the end of words often sounds like "sh".'
    },
    {
      code: 'uk',
      name: 'Ukrainian',
      location: 'Ukraine',
      flag: '🇺🇦',
      phoneticGuide: 'Ukrainian is melodic. "H" is soft (like hotel). "Y" is like "i" in bit. Stress is dynamic.'
    },
    {
      code: 'ru',
      name: 'Russian',
      location: 'Russia',
      flag: '🇷🇺',
      phoneticGuide: 'Russian is stress-timed. Unstressed "o" sounds like "a". Consonants can be hard or soft.'
    },
    {
      code: 'pl',
      name: 'Polish',
      location: 'Poland',
      flag: '🇵🇱',
      phoneticGuide: 'Polish has complex consonant clusters. "Sz" is like "sh", "cz" like "ch". Stress is usually on the second-to-last syllable.'
    }
  ];

  // ============================================================
  // 1. ESSENTIALS (Standalone phrases - Always available)
  // ============================================================
  private essentials: Phrase[] = Object.entries(enData.essentials).map(([key, value]) => ({
    id: key,
    type: 'essential',
    english: (value as any).text
  }));

  // ============================================================
  // 2. STARTERS (The "Operators")
  // ============================================================
  private starters: Phrase[] = [
    { id: 'where', type: 'starter', english: 'Where is...?' },
    { id: 'like', type: 'starter', english: 'I would like...' },
    { id: 'have', type: 'starter', english: 'Do you have...?' },
    { id: 'cost', type: 'starter', english: 'How much is...?' },
    { id: 'allergic', type: 'starter', english: 'I am allergic to...' },
    { id: 'need', type: 'starter', english: 'I need...' },
    { id: 'use', type: 'starter', english: 'Can I use...?' },
    { id: 'lost', type: 'starter', english: 'I lost...' },
    { id: 'is_there', type: 'starter', english: 'Is there...?' },
    { id: 'love', type: 'starter', english: 'I like...' },
    { id: 'call', type: 'starter', english: 'Please call...' },
    { id: 'another', type: 'starter', english: 'Another... please' },
    { id: 'share', type: 'starter', english: 'Let\'s share...' },
    { id: 'no', type: 'starter', english: 'No... please' },
    { id: 'is_free', type: 'starter', english: 'Is... free?' }
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
    { id: 'restaurant', type: 'noun', category: 'Dining', english: 'A Restaurant' },
    { id: 'beer', type: 'noun', category: 'Dining', english: 'A Beer' },
    { id: 'wine', type: 'noun', category: 'Dining', english: 'A Glass of Wine' },
    { id: 'seafood', type: 'noun', category: 'Dining', english: 'Seafood' },
    { id: 'vegetarian', type: 'noun', category: 'Dining', english: 'A Vegetarian Dish' },

    // Health / Safety
    { id: 'peanuts', type: 'noun', category: 'Health', english: 'Peanuts' },
    { id: 'doctor', type: 'noun', category: 'Health', english: 'A Doctor' },
    { id: 'pharmacy', type: 'noun', category: 'Health', english: 'Pharmacy' },
    { id: 'hospital', type: 'noun', category: 'Health', english: 'The Hospital' },

    // Tech
    { id: 'charger', type: 'noun', category: 'Tech', english: 'Charger' },

    // Leisure / Shopping
    { id: 'beach', type: 'noun', category: 'Leisure', english: 'The Beach' },
    { id: 'supermarket', type: 'noun', category: 'Shopping', english: 'The Supermarket' },
    { id: 'map', type: 'noun', category: 'Leisure', english: 'A Map' },
    { id: 'wallet', type: 'noun', category: 'Shopping', english: 'Wallet' },
    { id: 'bag', type: 'noun', category: 'Transport', english: 'Bag' },
    { id: 'passport', type: 'noun', category: 'Transport', english: 'Passport' },
    { id: 'receipt', type: 'noun', category: 'Shopping', english: 'The Receipt' },

    // New General Nouns
    { id: 'bus', type: 'noun', category: 'Transport', english: 'The Bus' },
    { id: 'entrance', type: 'noun', category: 'Transport', english: 'The Entrance' },
    { id: 'exit', type: 'noun', category: 'Transport', english: 'The Exit' },
    { id: 'ice', type: 'noun', category: 'Dining', english: 'Ice' },
    { id: 'sugar', type: 'noun', category: 'Dining', english: 'Sugar' },
    { id: 'bathroom', type: 'noun', category: 'Accommodation', english: 'The Bathroom' },
    { id: 'phone', type: 'noun', category: 'Tech', english: 'Phone' },
    { id: 'music', type: 'noun', category: 'Leisure', english: 'Music' },
    { id: 'police', type: 'noun', category: 'Health', english: 'Police' },
    { id: 'hotel', type: 'noun', category: 'Accommodation', english: 'Hotel' },
    { id: 'meat', type: 'noun', category: 'Dining', english: 'Meat' },

    // Allergies
    { id: 'gluten', type: 'noun', category: 'Health', english: 'Gluten' },
    { id: 'dairy', type: 'noun', category: 'Health', english: 'Dairy' },
    { id: 'nuts', type: 'noun', category: 'Health', english: 'Nuts' },
    { id: 'eggs', type: 'noun', category: 'Health', english: 'Eggs' },
    { id: 'soy', type: 'noun', category: 'Health', english: 'Soy' },
  ];

  // ============================================================
  // 4. COMBINATIONS (The Sentence Lookup Logic)
  // Format: "starterId_nounId"
  // ============================================================
  private combinations: { [key: string]: { english: string } } = Object.entries(enData.combinations).reduce((acc, [key, value]) => {
    acc[key] = { english: (value as any).text };
    return acc;
  }, {} as { [key: string]: { english: string } });

  constructor(private http: HttpClient) { }

  saveLanguagePreference(code: string) {
    localStorage.setItem(this.STORAGE_KEY, code);
  }

  getSavedLanguage(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  getLanguages(): LanguageInfo[] {
    return this.supportedLanguages;
  }

  getCurrentLanguage(): Observable<LanguageInfo | null> {
    return this.currentLanguage.asObservable();
  }

  loadLanguage(lang: string): Observable<any> {
    this.languageLoaded.next(false);
    const selectedLang = this.supportedLanguages.find(l => l.code === lang);
    if (selectedLang) {
      this.currentLanguage.next(selectedLang);
    }

    return this.http.get(`assets/i18n/${lang}.json`).pipe(
      tap(data => {
        this.currentTranslations = data;
        this.languageLoaded.next(true);
      })
    );
  }

  get isLanguageLoaded() {
    return this.languageLoaded.asObservable();
  }

  /**
   * Get Essentials (Power Phrases)
   */
  getEssentials(): Phrase[] {
    return this.essentials.map(item => ({
      ...item,
      translation: this.currentTranslations.essentials?.[item.id]
    }));
  }

  /**
   * Get Sentence Starters
   */
  getStarters() {
    return this.starters.map(starter => ({
      ...starter,
      listenFor: this.currentTranslations.starters?.[starter.id]?.listenFor
    }));
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
    const translation = this.currentTranslations.combinations?.[key];

    if (combo) {
      return {
        english: combo.english,
        translation: translation || { text: '...', phonetic: '...' }
      };
    } else {
      // Fallback if we haven't defined a combination yet
      // This helps you spot missing data during development
      return {
        english: `[MISSING: ${key}]`,
        translation: { text: '...', phonetic: '...' }
      };
    }
  }

  isValidCombination(starterId: string, nounId: string): boolean {
    const key = `${starterId}_${nounId}`;
    return this.combinations.hasOwnProperty(key);
  }
}
