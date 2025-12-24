import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-intro-modal',
  templateUrl: './intro-modal.component.html',
  styleUrls: ['./intro-modal.component.scss'],
  standalone: false
})
export class IntroModalComponent {
  @Output() dismiss = new EventEmitter<void>();

  onDismiss() {
    this.dismiss.emit();
  }
}
