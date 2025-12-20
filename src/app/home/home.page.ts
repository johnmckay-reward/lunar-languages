import { Component, OnInit, ViewChild } from '@angular/core';
import { ActionSheetController, IonContent } from '@ionic/angular';
import { DataService, Phrase, LanguageInfo } from '../data-service';

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

  categories: string[] = [];

  // --- Selection State ---
  selectedStarter: Phrase | null = null;
  selectedNoun: Phrase | null = null;
  selectedCategory: string = 'All';
  currentLanguage: LanguageInfo | null = null;

  // --- Display State ---
  displayEnglish: string = 'Hello';
  displayNative: string = '你好';
  displayPhonetic: string = 'Nǐ hǎo';

  @ViewChild(IonContent) content!: IonContent;

  constructor(
    private dataService: DataService,
    private actionSheetCtrl: ActionSheetController
  ) {}

  ngOnInit() {
    // Subscribe to language changes
    this.dataService.getCurrentLanguage().subscribe(lang => {
      this.currentLanguage = lang;
    });

    this.dataService.loadLanguage('zh').subscribe(() => {
      this.loadData();

      // Auto-select first starter
      if (this.starters.length > 0) {
        this.selectStarter(this.starters[0]);
      }
    });
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
    this.dataService.loadLanguage(code).subscribe(() => {
      this.loadData();
      // Refresh current display if something is selected
      if (this.selectedStarter) {
        this.selectStarter(this.selectedStarter);
        if (this.selectedNoun) {
          this.selectNoun(this.selectedNoun);
        }
      } else {
        // If nothing selected, maybe reset to Hello?
        // Or just refresh the essentials list which happens in loadData
      }
    });
  }

  loadData() {
    this.essentials = this.dataService.getEssentials();
    this.starters = this.dataService.getStarters();

    // Load ALL nouns once into memory
    this.allNouns = this.dataService.getNouns();

    // Setup categories
    const serviceCats = this.dataService.getCategories();
    this.categories = ['All', ...serviceCats.filter(cat => cat !== undefined)];
  }

  // ============================================
  // SMART FILTERING LOGIC
  // ============================================

  /**
   * Refreshes the grid based on:
   * 1. The selected Starter (Where is vs. I am allergic)
   * 2. The selected Category Chip (Food vs. Tech)
   */
  updateVisibleNouns() {
    if (!this.selectedStarter) return;

    this.visibleNouns = this.allNouns.filter(noun => {
      // 1. Check Category Filter
      const matchesCategory = this.selectedCategory === 'All' || noun.category === this.selectedCategory;

      // 2. Check Logic Validity (Does "Starter + Noun" exist?)
      const isValid = this.dataService.isValidCombination(this.selectedStarter!.id, noun.id);

      return matchesCategory && isValid;
    });
  }

  // ============================================
  // USER ACTIONS
  // ============================================

  filterNouns(category: string) {
    this.selectedCategory = category;
    this.updateVisibleNouns(); // Re-run filter
  }

  selectStarter(starter: Phrase) {
    this.selectedStarter = starter;
    this.selectedNoun = null;

    // When changing starter, we must re-filter the nouns!
    // e.g. "Where is" shows Locations, "Allergic" shows Food
    this.updateVisibleNouns();

    this.updateDisplay();
  }

  selectNoun(noun: Phrase) {
    this.content.scrollToTop(500);
    this.selectedNoun = noun;
    this.updateDisplay();
  }

  selectEssential(phrase: Phrase) {
    this.selectedStarter = null;
    this.selectedNoun = null;
    // Clear the grid or leave it as is? Let's leave it but visually deselect
    // (Optional: this.visibleNouns = [] if you want to hide the grid entirely)

    this.displayEnglish = phrase.english;
    if (phrase.translation) {
      this.displayNative = phrase.translation.text;
      this.displayPhonetic = phrase.translation.phonetic;
    }
  }

  updateDisplay() {
    if (!this.selectedStarter) return;

    if (this.selectedNoun) {
      const combo = this.dataService.getSentence(this.selectedStarter.id, this.selectedNoun.id);
      this.displayEnglish = combo.english;

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
    }
  }

  playAudio() {
    console.log('Playing:', this.displayNative);
  }
}
