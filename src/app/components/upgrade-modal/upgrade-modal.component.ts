import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-upgrade-modal',
  templateUrl: './upgrade-modal.component.html',
  styleUrls: ['./upgrade-modal.component.scss'],
  standalone: false
})
export class UpgradeModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() hasPendingSelection = false;
  @Output() didDismiss = new EventEmitter<void>();
  @Output() upgradeTriggered = new EventEmitter<void>();

  priceDisplay: string = '$4.99';

  ngOnInit() {
    // Simple heuristic: check if user's locale suggests GBP
    // In a real app, this would come from the App Store / Play Store product details
    const locale = navigator.language;
    if (locale === 'en-GB') {
      this.priceDisplay = '£4.99';
    } else {
      this.priceDisplay = '$4.99';
    }
  }

  onDismiss() {
    this.didDismiss.emit();
  }

  onUpgrade() {
    this.upgradeTriggered.emit();
    this.didDismiss.emit();
  }
}
