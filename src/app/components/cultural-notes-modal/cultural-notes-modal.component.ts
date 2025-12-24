import { Component, EventEmitter, Input, Output } from '@angular/core';

interface CulturalNote {
  title: string;
  content: string;
}

@Component({
  selector: 'app-cultural-notes-modal',
  templateUrl: './cultural-notes-modal.component.html',
  styleUrls: ['./cultural-notes-modal.component.scss'],
  standalone: false
})
export class CulturalNotesModalComponent {
  @Input() isOpen: boolean = false;
  @Input() notes: CulturalNote[] = [];
  @Output() didDismiss = new EventEmitter<void>();

  close() {
    this.didDismiss.emit();
  }
}
