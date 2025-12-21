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
    
    // --- NEW 100 COMBINATIONS ---
    'accept_cards': { english: 'Do you accept credit cards?' },
    'air_conditioning_broken': { english: 'The air conditioning is not working.' },
    'allergic_dairy': { english: 'I am allergic to dairy.' },
    'allergic_nuts': { english: 'I am allergic to nuts.' },
    'allergic_reaction': { english: 'I am having an allergic reaction.' },
    'allergic_shellfish': { english: 'I am allergic to shellfish.' },
    'been_robbed': { english: 'I have been robbed.' },
    'breakfast_included': { english: 'Is breakfast included?' },
    'breakfast_time': { english: 'What time is breakfast?' },
    'bus_to_downtown': { english: 'Which bus goes to downtown?' },
    'call_police': { english: 'Please call the police.' },
    'check_in': { english: 'I would like to check in.' },
    'check_out': { english: 'I would like to check out.' },
    'chopsticks': { english: 'Can I have chopsticks?' },
    'contains_dairy': { english: 'Does this have dairy?' },
    'contains_gluten': { english: 'Is this gluten-free?' },
    'contains_meat': { english: 'Does this contain meat?' },
    'different_color': { english: 'Do you have this in a different color?' },
    'directions_hotel': { english: 'How do I get to this hotel?' },
    'directions_museum': { english: 'How do I get to the museum?' },
    'discount': { english: 'Do you have a discount?' },
    'do_not_disturb': { english: 'Please do not disturb.' },
    'embassy_location': { english: 'Where is my country\'s embassy?' },
    'emergency_contact': { english: 'Please contact my emergency contact.' },
    'exchange_this': { english: 'Can I exchange this?' },
    'extend_stay': { english: 'Can I extend my stay?' },
    'extra_blanket': { english: 'Can I have an extra blanket?' },
    'extra_pillows': { english: 'Can I have extra pillows?' },
    'extra_towels': { english: 'Can I have extra towels?' },
    'feeling_sick': { english: 'I am feeling sick.' },
    'fitting_room': { english: 'Where is the fitting room?' },
    'fork_knife': { english: 'Can I have a fork and knife?' },
    'get_off_here': { english: 'I need to get off here.' },
    'gift_wrap': { english: 'Can you gift wrap this?' },
    'have_fever': { english: 'I have a fever.' },
    'have_pain': { english: 'I am in pain.' },
    'how_are_you': { english: 'How are you?' },
    'how_far': { english: 'How far is it?' },
    'how_long_journey': { english: 'How long is the journey?' },
    'how_much_this': { english: 'How much is this?' },
    'key_card': { english: 'My key card is not working.' },
    'last_train': { english: 'When is the last train?' },
    'late_checkout': { english: 'Can I have a late checkout?' },
    'lost_passport': { english: 'I lost my passport.' },
    'lost_phone': { english: 'I lost my phone.' },
    'lost_wallet': { english: 'I lost my wallet.' },
    'miss_my_stop': { english: 'I missed my stop.' },
    'more_napkins': { english: 'Can I have more napkins?' },
    'need_ambulance': { english: 'I need an ambulance.' },
    'need_doctor': { english: 'I need a doctor.' },
    'need_medication': { english: 'I need medication.' },
    'next_train': { english: 'When is the next train?' },
    'nice_meet_you': { english: 'Nice to meet you.' },
    'no_hot_water': { english: 'There is no hot water.' },
    'no_salt': { english: 'No salt, please.' },
    'no_sugar': { english: 'No sugar, please.' },
    'order_beer': { english: 'Can I have a beer?' },
    'order_bread': { english: 'Can I have some bread?' },
    'order_dessert': { english: 'What desserts do you have?' },
    'order_tea': { english: 'I would like tea, please.' },
    'order_water': { english: 'Can I have some water, please?' },
    'order_wine': { english: 'A glass of wine, please.' },
    'pay_cash': { english: 'Can I pay with cash?' },
    'prescription': { english: 'I have a prescription.' },
    'receipt_please': { english: 'Can I have a receipt?' },
    'recommend_dish': { english: 'What do you recommend?' },
    'reservation_name': { english: 'I have a reservation under the name...' },
    'return_this': { english: 'Can I return this?' },
    'room_cleaning': { english: 'Can you clean my room?' },
    'room_number': { english: 'What is my room number?' },
    'room_too_cold': { english: 'The room is too cold.' },
    'room_too_hot': { english: 'The room is too hot.' },
    'separate_bills': { english: 'Can we have separate bills?' },
    'size_large': { english: 'Do you have this in large?' },
    'size_medium': { english: 'Do you have this in medium?' },
    'size_small': { english: 'Do you have this in small?' },
    'speak_little': { english: 'I speak a little...' },
    'spicy_food': { english: 'Is this spicy?' },
    'straight_ahead': { english: 'Go straight ahead.' },
    'table_for_four': { english: 'A table for four, please.' },
    'table_for_two': { english: 'A table for two, please.' },
    'takeaway': { english: 'Can I get this to go?' },
    'taxi_to_airport': { english: 'Can you take me to the airport?' },
    'ticket_one_way': { english: 'A one-way ticket, please.' },
    'ticket_return': { english: 'A return ticket, please.' },
    'toilet_broken': { english: 'The toilet is broken.' },
    'too_expensive': { english: 'That\'s too expensive.' },
    'train_schedule': { english: 'What time does the train leave?' },
    'try_this_on': { english: 'Can I try this on?' },
    'turn_left': { english: 'Turn left.' },
    'turn_right': { english: 'Turn right.' },
    'uber_available': { english: 'Is Uber available here?' },
    'validate_ticket': { english: 'Where do I validate my ticket?' },
    'vegan_options': { english: 'Do you have vegan options?' },
    'vegetarian_options': { english: 'Do you have vegetarian options?' },
    'wake_up_call': { english: 'Can I have a wake-up call at 7 AM?' },
    'walking_distance': { english: 'Is it walking distance?' },
    'where_from': { english: 'Where are you from?' },
    'which_platform': { english: 'Which platform?' },
    'wifi_password': { english: 'What is the WiFi password?' },
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
