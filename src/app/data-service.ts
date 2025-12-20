import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// --- INTERFACES ---

export interface Translation {
  text: string;
  phonetic: string;
  audio?: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  flag: string;
  phoneticGuide: string;
}

export interface Phrase {
  id: string;
  type: 'essential' | 'starter' | 'noun';
  category?: string;
  english: string;
  translation?: Translation;
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

  private currentTranslations: any = {};
  private languageLoaded = new BehaviorSubject<boolean>(false);
  private currentLanguage = new BehaviorSubject<LanguageInfo | null>(null);

  private supportedLanguages: LanguageInfo[] = [
    {
      code: 'zh',
      name: 'Mandarin',
      flag: '🇨🇳',
      phoneticGuide: 'Mandarin uses tones. Pay attention to the rising and falling marks (ā, á, ǎ, à) as they change the meaning.'
    },
    {
      code: 'es',
      name: 'Spanish',
      flag: '🇪🇸',
      phoneticGuide: 'Spanish vowels are short and crisp (a, e, i, o, u). The "r" is often rolled.'
    },
    {
      code: 'fr',
      name: 'French',
      flag: '🇫🇷',
      phoneticGuide: 'French flows smoothly. Many final consonants are silent. "R" is pronounced in the back of the throat.'
    },
    {
      code: 'de',
      name: 'German',
      flag: '🇩🇪',
      phoneticGuide: 'German is phonetic but crisp. "W" sounds like English "V". "V" sounds like English "F".'
    },
    {
      code: 'ja',
      name: 'Japanese',
      flag: '🇯🇵',
      phoneticGuide: 'Japanese syllables are equal length. Vowels are pure (ah, ee, oo, eh, oh). No stress accents.'
    }
  ];

  // ============================================================
  // 1. ESSENTIALS (Standalone phrases - Always available)
  // ============================================================
  private essentials: Phrase[] = [
    { id: 'hello', type: 'essential', english: 'Hello' },
    { id: 'thanks', type: 'essential', english: 'Thank you' },
    { id: 'bathroom', type: 'essential', english: 'Where is the bathroom?' },
    { id: 'yes', type: 'essential', english: 'Yes' },
    { id: 'no', type: 'essential', english: 'No' },
    { id: 'sorry', type: 'essential', english: 'Excuse me / Sorry' }
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
  private combinations: { [key: string]: { english: string } } = {
    // --- WHERE IS...? ---
    'where_station': { english: 'Where is the train station?' },
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
    'allergic_peanuts': { english: 'I am allergic to peanuts.' },
    // Add other allergies here if you add nouns for seafood, etc.
  };

  constructor(private http: HttpClient) { }

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
