import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import enData from '../assets/i18n/free/en.json';
import { LanguageInfo, Phrase } from './interfaces';
import { supportedLanguages as freeSupportedLanguages } from './data/free/supported-languages';
import { starters as freeStarters } from './data/free/starters';
import { nouns as freeNouns } from './data/free/nouns';
import { supportedLanguages as proSupportedLanguages } from './data/pro/supported-languages';
import { starters as proStarters } from './data/pro/starters';
import { nouns as proNouns } from './data/pro/nouns';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private readonly STORAGE_KEY = 'lunar_language';
  private readonly PRO_KEY = 'lunar_pro_status';
  private currentTranslations: any = {};
  private proAudioIds = new Set<string>();
  private languageLoaded = new BehaviorSubject<boolean>(false);
  private currentLanguage = new BehaviorSubject<LanguageInfo | null>(null);
  private isProSubject = new BehaviorSubject<boolean>(false);

  // ============================================================
  // 1. ESSENTIALS (Standalone phrases - Always available)
  // ============================================================
  private essentials: Phrase[] = Object.entries(enData.essentials).map(([key, value]) => ({
    id: key,
    type: 'essential',
    english: (value as any).text
  }));

  // ============================================================
  // 4. COMBINATIONS (The Sentence Lookup Logic)
  // Format: "starterId_nounId"
  // ============================================================
  private combinations: { [key: string]: { english: string } } = Object.entries(enData.combinations).reduce((acc, [key, value]) => {
    acc[key] = { english: (value as any).text };
    return acc;
  }, {} as { [key: string]: { english: string } });

  constructor(private http: HttpClient) {
    const savedPro = localStorage.getItem(this.PRO_KEY);
    if (savedPro === 'true') {
      this.isProSubject.next(true);
    }
  }

  get isPro() {
    return this.isProSubject.asObservable();
  }

  setPro(isPro: boolean) {
    this.isProSubject.next(isPro);
    localStorage.setItem(this.PRO_KEY, String(isPro));
  }

  private get supportedLanguages(): LanguageInfo[] {
    return this.isProSubject.value ? proSupportedLanguages : freeSupportedLanguages;
  }

  private get starters(): Phrase[] {
    return this.isProSubject.value ? proStarters : freeStarters;
  }

  private get nouns(): Phrase[] {
    return this.isProSubject.value ? proNouns : freeNouns;
  }


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

    const free$ = this.http.get(`assets/i18n/free/${lang}.json`);
    let request$: Observable<any>;

    if (this.isProSubject.value) {
      const pro$ = this.http.get(`assets/i18n/pro/${lang}.json`);
      request$ = forkJoin([free$, pro$]).pipe(
        map(([free, pro]) => this.mergeTranslations(free, pro))
      );
    } else {
      request$ = free$;
    }

    return request$.pipe(
      tap(data => {
        this.currentTranslations = data;
        this.languageLoaded.next(true);
      })
    );
  }

  private mergeTranslations(free: any, pro: any): any {
    this.proAudioIds.clear();

    const registerProIds = (obj: any) => {
      if (!obj) return;
      Object.keys(obj).forEach(key => this.proAudioIds.add(key));
    };

    registerProIds(pro.essentials);
    registerProIds(pro.starters);
    registerProIds(pro.combinations);

    return {
      ...free,
      essentials: { ...free.essentials, ...pro.essentials },
      starters: { ...free.starters, ...pro.starters },
      combinations: { ...free.combinations, ...pro.combinations }
    };
  }

  isProAudio(id: string): boolean {
    return this.proAudioIds.has(id);
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
