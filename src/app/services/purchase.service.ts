import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Purchases, PurchasesOfferings, PurchasesPackage, LOG_LEVEL, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { DataService } from '../data-service';

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private offerings: PurchasesOfferings | null = null;

  constructor(
    private platform: Platform,
    private dataService: DataService
  ) {
    // Initialization is handled by AppComponent
  }

  async initialize() {
    if (!this.platform.is('capacitor')) {
      console.log('Not running on Capacitor, skipping IAP initialization');
      return;
    }

    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

    // TODO: Replace with your actual API keys from RevenueCat
    if (this.platform.is('ios')) {
      await Purchases.configure({ apiKey: 'appl_your_ios_api_key' });
    } else if (this.platform.is('android')) {
      await Purchases.configure({ apiKey: 'goog_your_android_api_key' });
    }

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      this.updateProStatus(customerInfo);
    } catch (e) {
      console.error('Error getting customer info', e);
    }
  }

  async getOfferings(): Promise<PurchasesOfferings | null> {
    if (!this.platform.is('capacitor')) {
      console.log('IAP: Web detected, returning mock offerings');

      const isUK = navigator.language === 'en-GB';
      const priceString = isUK ? '£4.99' : '$4.99';
      const currencyCode = isUK ? 'GBP' : 'USD';

      return {
        current: {
          identifier: 'default',
          serverDescription: 'Default Offering',
          availablePackages: [
            {
              identifier: 'pro_monthly',
              packageType: 'MONTHLY',
              product: {
                identifier: 'lunar_pro_monthly',
                description: 'Unlock all features',
                title: 'Lunar Pro (Web Mock)',
                price: 4.99,
                priceString: priceString,
                currencyCode: currencyCode,
                // Add other required fields with dummy values if needed
              } as any,
              offeringIdentifier: 'default'
            } as any
          ],
          metadata: {}
        },
        all: {}
      } as PurchasesOfferings;
    }

    try {
      this.offerings = await Purchases.getOfferings();
      return this.offerings;
    } catch (e) {
      console.error('Error getting offerings', e);
      return null;
    }
  }

  async purchasePackage(packageToPurchase: PurchasesPackage): Promise<boolean> {
    if (!this.platform.is('capacitor')) {
      console.log('IAP: Web detected, simulating successful purchase');
      this.dataService.setPro(true);
      return true;
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToPurchase });
      this.updateProStatus(customerInfo);
      return true;
    } catch (e: any) {
      if (e.userCancelled) {
        return false;
      }
      console.error('Error purchasing package', e);
      throw e;
    }
  }

  async restorePurchases(): Promise<boolean> {
    if (!this.platform.is('capacitor')) {
      console.log('IAP: Web detected, simulating successful restore');
      this.dataService.setPro(true);
      return true;
    }

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      this.updateProStatus(customerInfo);
      return true;
    } catch (e) {
      console.error('Error restoring purchases', e);
      throw e;
    }
  }

  private updateProStatus(customerInfo: CustomerInfo) {
    // Check if the user has the 'pro' entitlement active
    // TODO: Replace 'pro' with your actual entitlement identifier from RevenueCat dashboard
    const isPro = typeof customerInfo.entitlements.active['pro'] !== "undefined";

    console.log('IAP: User is pro?', isPro);
    this.dataService.setPro(isPro);
  }
}
