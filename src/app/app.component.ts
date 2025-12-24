import { Component } from '@angular/core';
import { PurchaseService } from './services/purchase.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private purchaseService: PurchaseService) {
    // Initialize IAP service
    this.purchaseService.initialize();
  }
}
