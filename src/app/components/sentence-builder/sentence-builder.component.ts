import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Phrase } from '../../interfaces';

@Component({
  selector: 'app-sentence-builder',
  templateUrl: './sentence-builder.component.html',
  styleUrls: ['./sentence-builder.component.scss'],
  standalone: false
})
export class SentenceBuilderComponent {
  @Input() starters: Phrase[] = [];
  @Input() visibleNouns: Phrase[] = [];
  @Input() selectedStarter: Phrase | null = null;
  @Input() selectedNoun: Phrase | null = null;

  @Output() starterSelected = new EventEmitter<Phrase>();
  @Output() nounSelected = new EventEmitter<Phrase>();

  onSelectStarter(starter: Phrase) {
    this.starterSelected.emit(starter);
  }

  onSelectNoun(noun: Phrase) {
    this.nounSelected.emit(noun);
  }
}
