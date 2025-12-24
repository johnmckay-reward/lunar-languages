import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import enData from '../assets/i18n/en.json';
import { LanguageInfo, Phrase } from './interfaces';
import { supportedLanguages } from './data/supported-languages';
import { starters } from './data/starters';
import { nouns } from './data/nouns';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private readonly STORAGE_KEY = 'lunar_language';
  private currentTranslations: any = {};
  private languageLoaded = new BehaviorSubject<boolean>(false);
  private currentLanguage = new BehaviorSubject<LanguageInfo | null>(null);

  private supportedLanguages: LanguageInfo[] = supportedLanguages;

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
  private starters: Phrase[] = starters;

  // ============================================================
  // 3. NOUNS (The "Fillers")
  // ============================================================
  private nouns: Phrase[] = nouns;

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
