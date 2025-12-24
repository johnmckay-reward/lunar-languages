import { Component, EventEmitter, Input, Output } from '@angular/core';

interface NumberItem {
  value: string;
  text: string;
  phonetic: string;
}

interface CulturalNote {
  title: string;
  content: string;
}

@Component({
  selector: 'app-numbers-modal',
  templateUrl: './numbers-modal.component.html',
  styleUrls: ['./numbers-modal.component.scss'],
  standalone: false
})
export class NumbersModalComponent {
  @Input() isOpen: boolean = false;
  @Input() numbers: NumberItem[] = [];
  @Input() guidance: CulturalNote[] = [];
  @Output() didDismiss = new EventEmitter<void>();

  close() {
    this.didDismiss.emit();
  }
}
