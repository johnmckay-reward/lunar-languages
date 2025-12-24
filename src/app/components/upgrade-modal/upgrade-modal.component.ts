import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PurchaseService } from '../../services/purchase.service';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';

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

  priceDisplay: string = 'Loading...';
  package: PurchasesPackage | null = null;

  constructor(private purchaseService: PurchaseService) {}

  async ngOnInit() {
    try {
      const offerings = await this.purchaseService.getOfferings();
      if (offerings && offerings.current && offerings.current.availablePackages.length > 0) {
        this.package = offerings.current.availablePackages[0];
        this.priceDisplay = this.package.product.priceString;
      } else {
        // Fallback or error state
        this.priceDisplay = '$4.99';
      }
    } catch (error) {
      console.error('Error loading offerings', error);
      this.priceDisplay = '$4.99';
    }
  }

  onDismiss() {
    this.didDismiss.emit();
  }

  async onUpgrade() {
    if (this.package) {
      const success = await this.purchaseService.purchasePackage(this.package);
      if (success) {
        this.upgradeTriggered.emit();
        this.didDismiss.emit();
      }
    } else {
      // Fallback for testing or if offerings failed to load
      console.warn('No package loaded, using fallback upgrade trigger');
      this.upgradeTriggered.emit();
      this.didDismiss.emit();
    }
  }

  async onRestore() {
    const success = await this.purchaseService.restorePurchases();
    if (success) {
      this.didDismiss.emit();
    }
  }
}
