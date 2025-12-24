import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LanguageInfo } from '../../interfaces';

@Component({
  selector: 'app-welcome-screen',
  templateUrl: './welcome-screen.component.html',
  styleUrls: ['./welcome-screen.component.scss'],
  standalone: false
})
export class WelcomeScreenComponent {
  @Input() availableLanguages: LanguageInfo[] = [];
  @Output() languageSelected = new EventEmitter<string>();

  selectLanguage(code: string) {
    this.languageSelected.emit(code);
  }
}
