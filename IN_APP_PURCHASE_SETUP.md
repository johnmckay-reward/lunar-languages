# In-App Purchase Implementation Guide

This guide details the steps to finalize the In-App Purchase (IAP) integration for Lunar Languages using RevenueCat.

## 1. RevenueCat Portal Setup (Required)

1.  **Create Account**: Sign up at [RevenueCat](https://www.revenuecat.com/).
2.  **Create Project**: Name it "Lunar Languages".
3.  **Add Apps**:
    *   **iOS**: Add your app using the Bundle ID (found in `ios/App/App/Info.plist`).
    *   **Android**: Add your app using the Package Name (found in `android/app/build.gradle`).
    *   *Note: You must configure the "Service Account credentials" (Android) and "App Store Connect Shared Secret" (iOS) in RevenueCat settings to allow receipt validation.*
4.  **Create Entitlement**:
    *   Go to **Entitlements**.
    *   Create a new identifier: `pro`.
    *   *If you use a different name, update `src/app/services/purchase.service.ts`.*
5.  **Create Offerings**:
    *   Go to **Offerings**.
    *   Create a default offering named `default`.
    *   Add a "Package" (e.g., "Lifetime Unlock").
    *   Attach your Apple/Google product IDs to this package.
6.  **Get API Keys**:
    *   Go to **Project Settings** > **API Keys**.
    *   Copy the **Public SDK Key** for iOS (`appl_...`).
    *   Copy the **Public SDK Key** for Android (`goog_...`).

## 2. Platform Permissions & Capabilities

### Android (Completed)
I have automatically added the required billing permission to your `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```
*No further action required for permissions.*

### iOS (Manual Action Required)
You must manually enable the In-App Purchase capability in Xcode.
1.  Open the project:
    ```bash
    npx cap open ios
    ```
2.  In Xcode, select the **App** target (blue icon in the left navigator).
3.  Select the **Signing & Capabilities** tab.
4.  Click **+ Capability** (top left of the tab).
5.  Search for **In-App Purchase** and double-click to add it.
*Without this, the app will crash or fail to initialize purchases.*

## 3. Code Configuration

Open `src/app/services/purchase.service.ts` and update the keys:

```typescript
// Replace with your keys from Step 1.6
if (this.platform.is('ios')) {
  await Purchases.configure({ apiKey: 'appl_your_ios_api_key' });
} else if (this.platform.is('android')) {
  await Purchases.configure({ apiKey: 'goog_your_android_api_key' });
}
```

## 4. Store Setup & Testing

### Android
1.  **Upload Build**: You must upload a signed App Bundle (.aab) to the **Internal Testing** track on Google Play Console.
2.  **Testers**: Add your email to the "License Testing" section (Settings > License Testing) in Play Console to test for free.
3.  **Device**: Test on a real Android device logged in with that email.

### iOS
1.  **Agreements**: Ensure "Paid Applications Agreement" is active in App Store Connect.
2.  **Sandbox User**: Create a Sandbox Tester account in App Store Connect > Users and Access.
3.  **Device**: Test on a real iOS device. Sign out of your personal Apple ID in the App Store settings (not iCloud) and let the app prompt you to sign in with the Sandbox account when you attempt a purchase.

## Troubleshooting Checklist
- [ ] **Products Empty?** Check that the Offering is "Current" in RevenueCat.
- [ ] **Invalid API Key?** Check logs in Xcode/Android Studio.
- [ ] **User Cancelled?** The app handles this gracefully, but check logs to be sure.
- [ ] **Not Pro after purchase?** Ensure the Entitlement ID in RevenueCat matches `pro` in the code.
    *   Ensure the "Offering" in RevenueCat is set as "Current".
    *   Ensure your products are "Active" in App Store Connect / Google Play Console.
    *   (Android) Ensure you have accepted the latest agreements in the Play Console.
    *   (iOS) Ensure your "Paid Applications Agreement" is active in App Store Connect.
