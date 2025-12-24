import { Component, OnInit, ViewChild } from '@angular/core';
import { ActionSheetController, IonContent } from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { DataService } from '../data-service';
import * as culturalNotesData from '../cultural-notes.json';
import * as numbersData from '../numbers.json';
import * as numbersGuidanceData from '../numbers-guidance.json';
import { LanguageInfo, Phrase } from '../interfaces';

interface CulturalNote {
  title: string;
  content: string;
}

interface NumberItem {
  value: string;
  text: string;
  phonetic: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

  // --- Data Containers ---
  essentials: Phrase[] = [];
  starters: Phrase[] = [];

  // This is the "Master List" of all nouns
  allNouns: Phrase[] = [];

  // This is what we actually show on screen (Filtered)
  visibleNouns: Phrase[] = [];

  // --- Selection State ---
  selectedStarter: Phrase | null = null;
  selectedNoun: Phrase | null = null;
  currentLanguage: LanguageInfo | null = null;
  currentAudioId: string | null = null;
  currentNotes: CulturalNote[] = [];
  currentNumbers: NumberItem[] = [];
  currentNumberGuidance: CulturalNote[] = [];

  // --- Display State ---
  displayEnglish: string = '';
  displayNative: string = '';
  displayPhonetic: string = '';

  isModalOpen = false;
  isNotesModalOpen = false;
  isNumbersModalOpen = false;
  showWelcomeScreen = false;

  @ViewChild(IonContent) content!: IonContent;

  constructor(
    private dataService: DataService,
    private actionSheetCtrl: ActionSheetController
  ) {}

  setModalOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
  }

  setNotesModalOpen(isOpen: boolean) {
    this.isNotesModalOpen = isOpen;
  }

  setNumbersModalOpen(isOpen: boolean) {
    this.isNumbersModalOpen = isOpen;
  }

  ngOnInit() {
    // Subscribe to language changes
    this.dataService.getCurrentLanguage().subscribe(lang => {
      this.currentLanguage = lang;
    });

    const savedLang = this.dataService.getSavedLanguage();
    if (savedLang) {
      this.loadLanguage(savedLang);
    } else {
      this.showWelcomeScreen = true;
    }
  }

  loadLanguage(code: string) {
    this.dataService.loadLanguage(code).subscribe(() => {
      this.loadData();

      // Load Notes
      this.currentNotes = (culturalNotesData as any)[code] || (culturalNotesData as any).default?.[code] || [];

      // Load Numbers
      this.currentNumbers = (numbersData as any)[code] || (numbersData as any).default?.[code] || [];
      this.currentNumberGuidance = (numbersGuidanceData as any)[code] || (numbersGuidanceData as any).default?.[code] || [];

      // Reset State
      this.selectedNoun = null;
      this.currentAudioId = null;
      this.selectedStarter = null;

      // Reset Display
      this.displayEnglish = '';
      this.displayNative = '';
      this.displayPhonetic = '';
      this.visibleNouns = [];
    });
  }

  selectInitialLanguage(code: string) {
    Haptics.impact({ style: ImpactStyle.Medium });
    this.dataService.saveLanguagePreference(code);
    this.showWelcomeScreen = false;
    this.loadLanguage(code);
  }

  get availableLanguages() {
    return this.dataService.getLanguages();
  }

  async openLanguageSelector() {
    const languages = this.dataService.getLanguages();

    const buttons = languages.map(lang => ({
      text: `${lang.flag}  ${lang.name}`,
      handler: () => {
        this.changeLanguage(lang.code);
      }
    }));

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Language',
      buttons: [
        ...buttons,
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  changeLanguage(code: string) {
    Haptics.impact({ style: ImpactStyle.Medium });
    this.dataService.saveLanguagePreference(code);
    this.loadLanguage(code);
  }

  loadData() {
    this.essentials = this.dataService.getEssentials();
    this.starters = this.dataService.getStarters();

    // Load ALL nouns once into memory
    this.allNouns = this.dataService.getNouns();
  }

  // ============================================
  // SMART FILTERING LOGIC
  // ============================================

  /**
   * Refreshes the grid based on:
   * 1. The selected Starter (Where is vs. I am allergic)
   */
  updateVisibleNouns() {
    if (!this.selectedStarter) return;

    this.visibleNouns = this.allNouns.filter(noun => {
      // Check Logic Validity (Does "Starter + Noun" exist?)
      const isValid = this.dataService.isValidCombination(this.selectedStarter!.id, noun.id);
      return isValid;
    });
  }

  // ============================================
  // USER ACTIONS
  // ============================================

  selectStarter(starter: Phrase, autoScroll: boolean = true) {
    Haptics.impact({ style: ImpactStyle.Light });
    this.selectedStarter = starter;
    this.selectedNoun = null;

    // When changing starter, we must re-filter the nouns!
    // e.g. "Where is" shows Locations, "Allergic" shows Food
    this.updateVisibleNouns();

    this.updateDisplay();

    if (autoScroll) {
      // Smooth scroll to the complete phrase section
      setTimeout(() => {
        const element = document.getElementById('complete-phrase-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  selectNoun(noun: Phrase) {
    Haptics.impact({ style: ImpactStyle.Light });
    this.content.scrollToTop(500);
    this.selectedNoun = noun;
    this.updateDisplay();
  }

  selectEssential(phrase: Phrase) {
    Haptics.impact({ style: ImpactStyle.Medium });
    this.selectedStarter = null;
    this.selectedNoun = null;
    this.currentAudioId = phrase.id;
    // Clear the grid or leave it as is? Let's leave it but visually deselect
    // (Optional: this.visibleNouns = [] if you want to hide the grid entirely)

    this.displayEnglish = phrase.english;
    if (phrase.translation) {
      this.displayNative = phrase.translation.text;
      this.displayPhonetic = phrase.translation.phonetic;
    }

    this.setModalOpen(false);
    this.content.scrollToTop(500);
  }

  updateDisplay() {
    if (!this.selectedStarter) return;

    if (this.selectedNoun) {
      const combo = this.dataService.getSentence(this.selectedStarter.id, this.selectedNoun.id);
      this.displayEnglish = combo.english;
      this.currentAudioId = `${this.selectedStarter.id}_${this.selectedNoun.id}`;

      if (combo.translation) {
        this.displayNative = combo.translation.text;
        this.displayPhonetic = combo.translation.phonetic;
      } else {
        this.displayNative = 'Translation pending...';
        this.displayPhonetic = '---';
      }
    } else {
      this.displayEnglish = this.selectedStarter.english;
      this.displayNative = '...';
      this.displayPhonetic = '';
      this.currentAudioId = null;
    }
  }

  playAudio(speed: number = 1.0) {
    if (!this.currentLanguage || !this.currentAudioId) return;

    Haptics.impact({ style: ImpactStyle.Light });

    const path = `assets/audio/${this.currentLanguage.code}/${this.currentAudioId}.mp3`;
    const audio = new Audio(path);
    audio.playbackRate = speed;
    audio.play().catch(e => console.error('Error playing audio:', e));
  }
}
