import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Phrase } from '../../interfaces';

@Component({
  selector: 'app-quick-phrases-modal',
  templateUrl: './quick-phrases-modal.component.html',
  styleUrls: ['./quick-phrases-modal.component.scss'],
  standalone: false
})
export class QuickPhrasesModalComponent {
  @Input() isOpen: boolean = false;
  @Input() essentials: Phrase[] = [];
  @Output() didDismiss = new EventEmitter<void>();
  @Output() phraseSelected = new EventEmitter<Phrase>();

  close() {
    this.didDismiss.emit();
  }

  selectPhrase(phrase: Phrase) {
    this.phraseSelected.emit(phrase);
  }
}
