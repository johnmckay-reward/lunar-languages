import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import enData from '../assets/i18n/free/en.json';
import proEnData from '../assets/i18n/pro/en.json';
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
  private essentials: Phrase[] = [
    ...Object.entries(enData.essentials).map(([key, value]) => ({
      id: key,
      type: 'essential' as const,
      english: (value as any).text
    })),
    ...Object.entries((proEnData as any).essentials || {}).map(([key, value]) => ({
      id: key,
      type: 'essential' as const,
      english: (value as any).text
    }))
  ];

  // ============================================================
  // 4. COMBINATIONS (The Sentence Lookup Logic)
  // Format: "starterId_nounId"
  // ============================================================
  private combinations: { [key: string]: { english: string } } = {
    ...Object.entries(enData.combinations).reduce((acc, [key, value]) => {
      acc[key] = { english: (value as any).text };
      return acc;
    }, {} as { [key: string]: { english: string } }),
    ...Object.entries((proEnData as any).combinations || {}).reduce((acc, [key, value]) => {
      acc[key] = { english: (value as any).text };
      return acc;
    }, {} as { [key: string]: { english: string } })
  };

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
    return proSupportedLanguages;
  }

  private get starters(): Phrase[] {
    return proStarters;
  }

  private get nouns(): Phrase[] {
    return proNouns;
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
    const pro$ = this.http.get(`assets/i18n/pro/${lang}.json`);

    const request$ = forkJoin([free$, pro$]).pipe(
      map(([free, pro]) => this.mergeTranslations(free, pro))
    );

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

  isProItem(id: string, type: 'essential' | 'starter' | 'noun'): boolean {
    if (type === 'essential') {
      return !enData.essentials.hasOwnProperty(id);
    }
    if (type === 'starter') {
      return !freeStarters.some(s => s.id === id);
    }
    if (type === 'noun') {
      return !freeNouns.some(n => n.id === id);
    }
    return false;
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
      translation: this.currentTranslations.essentials?.[item.id],
      isPro: this.isProItem(item.id, 'essential')
    }));
  }

  /**
   * Get Sentence Starters
   */
  getStarters() {
    return this.starters.map(starter => ({
      ...starter,
      listenFor: this.currentTranslations.starters?.[starter.id]?.listenFor,
      isPro: this.isProItem(starter.id, 'starter')
    }));
  }

  /**
   * Get Nouns, optionally filtered by category
   */
  getNouns(category: string = 'All') {
    let nouns = this.nouns;
    if (category !== 'All') {
      nouns = nouns.filter(n => n.category === category);
    }
    return nouns.map(n => ({
      ...n,
      isPro: this.isProItem(n.id, 'noun')
    }));
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
