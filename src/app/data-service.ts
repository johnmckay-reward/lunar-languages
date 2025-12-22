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

export interface ListenFor {
  text: string;
  phonetic: string;
  meaning: string;
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
    },
    {
      code: 'it',
      name: 'Italian',
      flag: '🇮🇹',
      phoneticGuide: 'Italian is rhythmic and melodic. Vowels are clear and open. Double consonants are pronounced longer.'
    },
    {
      code: 'pt',
      name: 'Portuguese',
      flag: '🇵🇹',
      phoneticGuide: 'Portuguese is nasal and smooth. Vowels can be open or closed. "S" at the end of words often sounds like "sh".'
    },
    {
      code: 'uk',
      name: 'Ukrainian',
      flag: '🇺🇦',
      phoneticGuide: 'Ukrainian is melodic. "H" is soft (like hotel). "Y" is like "i" in bit. Stress is dynamic.'
    },
    {
      code: 'ru',
      name: 'Russian',
      flag: '🇷🇺',
      phoneticGuide: 'Russian is stress-timed. Unstressed "o" sounds like "a". Consonants can be hard or soft.'
    },
    {
      code: 'pl',
      name: 'Polish',
      flag: '🇵🇱',
      phoneticGuide: 'Polish has complex consonant clusters. "Sz" is like "sh", "cz" like "ch". Stress is usually on the second-to-last syllable.'
    }
  ];

  // ============================================================
  // 1. ESSENTIALS (Standalone phrases - Always available)
  // ============================================================
  private essentials: Phrase[] = [
    { id: 'hello', type: 'essential', english: 'Hello' },
    { id: 'thanks', type: 'essential', english: 'Thank you' },
    { id: 'goodbye', type: 'essential', english: 'Goodbye' },
    { id: 'good_morning', type: 'essential', english: 'Good morning' },
    { id: 'good_evening', type: 'essential', english: 'Good evening' },
    { id: 'bathroom', type: 'essential', english: 'Where is the bathroom?' },
    { id: 'yes', type: 'essential', english: 'Yes' },
    { id: 'no', type: 'essential', english: 'No' },
    { id: 'sorry', type: 'essential', english: 'Excuse me / Sorry' },
    { id: 'no_understand', type: 'essential', english: 'I don\'t understand' },
    { id: 'speak_english', type: 'essential', english: 'Do you speak English?' },
    { id: 'help', type: 'essential', english: 'Help!' },
    { id: 'delicious', type: 'essential', english: 'Delicious!' },
    { id: 'cheers', type: 'essential', english: 'Cheers!' },
    { id: 'wifi_pass', type: 'essential', english: 'WiFi Password?' },
    { id: 'slowly', type: 'essential', english: 'Please speak slowly' }
  ];

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
    { id: 'another', type: 'starter', english: 'Another... please' }
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
  private combinations: { [key: string]: { english: string } } = {
    // --- WHERE IS...? ---
    'where_station': { english: 'Where is the train station?' },
    'where_airport': { english: 'Where is the airport?' },
    'where_ticket': { english: 'Where can I buy a ticket?' }, // Context adjusted
    'where_taxi': { english: 'Where is the taxi stand?' },
    'where_atm': { english: 'Where is the ATM?' },
    'where_pharmacy': { english: 'Where is the pharmacy?' },
    'where_doctor': { english: 'Where is a doctor?' },
    'where_restaurant': { english: 'Where is a good restaurant?' },
    'where_hospital': { english: 'Where is the hospital?' },
    'where_supermarket': { english: 'Where is the supermarket?' },
    'where_beach': { english: 'Where is the beach?' },
    'where_coffee': { english: 'Where is a coffee shop?' },
    'where_water': { english: 'Where can I buy water?' },
    'where_bus': { english: 'Where is the bus?' },
    'where_entrance': { english: 'Where is the entrance?' },
    'where_exit': { english: 'Where is the exit?' },
    'where_key': { english: 'Where is the key?' },

    // --- I WOULD LIKE... ---
    'like_ticket': { english: 'I would like a ticket please.' },
    'like_taxi': { english: 'I would like a taxi please.' },
    'like_water': { english: 'I would like some water.' },
    'like_coffee': { english: 'I would like a coffee.' },
    'like_menu': { english: 'I would like the menu please.' },
    'like_bill': { english: 'I would like the bill please.' },
    'like_beer': { english: 'I would like a beer.' },
    'like_wine': { english: 'I would like a glass of wine.' },
    'like_seafood': { english: 'I would like the seafood.' },
    'like_vegetarian': { english: 'I would like the vegetarian option.' },
    'like_room': { english: 'I would like a room.' },
    'like_receipt': { english: 'I would like a receipt.' },
    'like_ice': { english: 'I would like some ice.' },

    // --- DO YOU HAVE...? ---
    'have_wifi': { english: 'Do you have WiFi?' },
    'have_room': { english: 'Do you have a room available?' },
    'have_charger': { english: 'Do you have a charger?' },
    'have_menu': { english: 'Do you have a menu in English?' }, // Context added
    'have_vegetarian': { english: 'Do you have any vegetarian options?' },
    'have_water': { english: 'Do you have water?' },
    'have_beer': { english: 'Do you have beer?' },
    'have_wine': { english: 'Do you have wine?' },
    'have_map': { english: 'Do you have a map?' },
    'have_sugar': { english: 'Do you have sugar?' },

    // --- HOW MUCH IS...? ---
    'cost_ticket': { english: 'How much is a ticket?' },
    'cost_taxi': { english: 'How much is the taxi?' },
    'cost_room': { english: 'How much is the room?' },
    'cost_coffee': { english: 'How much is a coffee?' },
    'cost_beer': { english: 'How much is a beer?' },
    'cost_wine': { english: 'How much is a glass of wine?' },
    'cost_wifi': { english: 'How much is the WiFi?' },
    'cost_water': { english: 'How much is the water?' },
    'cost_seafood': { english: 'How much is the seafood?' },
    'cost_bus': { english: 'How much is the bus?' },

    // --- I AM ALLERGIC TO... ---
    'allergic_peanuts': { english: 'I am allergic to peanuts.' },
    'allergic_seafood': { english: 'I am allergic to seafood.' },
    'allergic_gluten': { english: 'I am allergic to gluten.' },
    'allergic_dairy': { english: 'I am allergic to dairy.' },
    'allergic_nuts': { english: 'I am allergic to nuts.' },
    'allergic_eggs': { english: 'I am allergic to eggs.' },
    'allergic_soy': { english: 'I am allergic to soy.' },

    // --- I NEED... ---
    'need_ticket': { english: 'I need a ticket.' },
    'need_taxi': { english: 'I need a taxi.' },
    'need_doctor': { english: 'I need a doctor.' },
    'need_pharmacy': { english: 'I need a pharmacy.' },
    'need_hospital': { english: 'I need a hospital.' },
    'need_charger': { english: 'I need a charger.' },
    'need_map': { english: 'I need a map.' },
    'need_receipt': { english: 'I need a receipt.' },
    'need_water': { english: 'I need water.' },
    'need_key': { english: 'I need the key.' },

    // --- CAN I USE...? ---
    'use_wifi': { english: 'Can I use the WiFi?' },
    'use_charger': { english: 'Can I use the charger?' },
    'use_atm': { english: 'Can I use the ATM?' },
    'use_map': { english: 'Can I use the map?' },
    'use_ticket': { english: 'Can I use this ticket?' },
    'use_entrance': { english: 'Can I use this entrance?' },
    'use_exit': { english: 'Can I use this exit?' },
    'use_menu': { english: 'Can I use the menu?' },
    'use_bathroom': { english: 'Can I use the bathroom?' },
    'use_phone': { english: 'Can I use your phone?' },

    // --- I LOST... ---
    'lost_ticket': { english: 'I lost my ticket.' },
    'lost_key': { english: 'I lost my key.' },
    'lost_phone': { english: 'I lost my phone.' },
    'lost_wallet': { english: 'I lost my wallet.' },
    'lost_passport': { english: 'I lost my passport.' },
    'lost_bag': { english: 'I lost my bag.' },
    'lost_map': { english: 'I lost my map.' },
    'lost_receipt': { english: 'I lost my receipt.' },

    // --- IS THERE...? ---
    'is_there_atm': { english: 'Is there an ATM near here?' },
    'is_there_pharmacy': { english: 'Is there a pharmacy nearby?' },
    'is_there_wifi': { english: 'Is there WiFi here?' },

    // --- I LIKE... ---
    'love_coffee': { english: 'I like this coffee.' },
    'love_wine': { english: 'I like this wine.' },
    'love_seafood': { english: 'I love seafood.' },
    'love_music': { english: 'I like this music.' },
    'is_there_bus': { english: 'Is there a bus to the city?' },

    // --- PLEASE CALL... ---
    'call_taxi': { english: 'Please call a taxi.' },
    'call_doctor': { english: 'Please call a doctor.' },
    'call_police': { english: 'Please call the police.' },
    'call_hotel': { english: 'Please call my hotel.' },

    // --- ANOTHER... ---
    'another_beer': { english: 'Another beer, please!' },
    'another_wine': { english: 'Another glass of wine, please.' },
    'another_coffee': { english: 'Another coffee, please.' },
    'another_bill': { english: 'Can I have another copy of the bill?' },
    // Add other allergies here if you add nouns for seafood, etc.
  };

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
