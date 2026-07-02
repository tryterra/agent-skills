# Flutter – terra_flutter_bridge

Cross-platform integration for **Apple Health** (iOS), **Samsung Health**, and **Health Connect** (Android). Source: [docs.tryterra.co/health-and-fitness-api/mobile-only-sources/flutter](https://docs.tryterra.co/health-and-fitness-api/mobile-only-sources/flutter).

## 1. Install and native setup

```bash
flutter pub get terra_flutter_bridge
```

Then complete the native setup for each platform you target.

### iOS setup

1. `cd ios && pod install`.
2. Add **Capabilities**: HealthKit > HealthKit Background Delivery; Background Modes > Background processing; Background Modes > Background fetch.
3. Add to `info.plist`:
   ```xml
   <key>BGTaskSchedulerPermittedIdentifiers</key>
   <array>
     <string>co.tryterra.data.post.request</string>
   </array>
   <key>NSHealthClinicalHealthRecordsShareUsageDescription</key>
   <string>Using TerraiOS to gather health data</string>
   <key>NSHealthShareUsageDescription</key>
   <string>Using TerraiOS as a means of getting Health Data</string>
   <key>NSHealthUpdateUsageDescription</key>
   <string>Allow writing data to health kit</string>
   ```
   (usage-description strings must be at least 3 words).

### Android setup

Same as native Android (see `references/android.md`): minSDK 28, and either the Samsung route (apply for the partnership, use the Samsung-tagged `terra_flutter_bridge` version from [pub.dev](https://pub.dev/packages/terra_flutter_bridge/versions), add the ProGuard rule `-keep class com.samsung.android.** { *; }` in `android/app/proguard-rules.pro`, enable Developer Mode) or the Health Connect route (grant permissions in the Health Connect app, add the privacy-policy `<activity>` intent-filters to `AndroidManifest.xml`, apply to Google before release).

## 2. Initialize (once on app start, and on every foreground)

`initTerra` is asynchronous and a prerequisite for all other SDK calls.

```dart
import 'package:flutter/material.dart';
import 'package:terra_flutter_bridge/terra_flutter_bridge.dart';
import 'package:terra_flutter_bridge/models/enums.dart';
import 'package:terra_flutter_bridge/models/responses.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _initializeTerra();
  runApp(Container());
}

Future<void> _initializeTerra() async {
  SuccessMessage? result = await TerraFlutter.initTerra('YOUR_DEV_ID', 'YOUR_REFERENCE_ID');
  if (result?.error != null) {
    throw Exception('Failed to initialise Terra ${result?.error}');
  }
}
```

## 3. Connect with initConnection

Mint the single-use token from your backend first (`POST https://api.tryterra.co/v2/auth/generateAuthToken` with `dev-id` + `x-api-key`).

```dart
Future<void> _initialiseConnection() async {
  String token = 'example_token';   // from your backend
  SuccessMessage? result = await TerraFlutter.initConnection(
    Connection.appleHealth,          // or Connection.samsung / Connection.healthConnect
    token,
    true,                            // schedulerOn
    [],                              // customPermissions – empty = all
  );
  if (result?.error != null) {
    throw Exception('Failed to initialise connection ${result?.error}');
  }
}
```

- `type`: `Connection.appleHealth`, `Connection.samsung`, or `Connection.healthConnect`.
- `schedulerOn`: **no effect on iOS** (background delivery is via `setUpBackgroundDelivery`); on Android, `true` enables foreground scheduled requests.
- `customPermissions`: see [Permissions mapping](https://docs.tryterra.co/health-and-fitness-api/mobile-only-sources).

Popup behavior: Apple Health and Health Connect show the popup once (re-triggers only on expanded `customPermissions`, reinstall, or – Health Connect – a permission Google has not approved). The HealthKit popup is a WebView; WebView-based apps must interrupt their WebView, call `initConnection`, then reopen.

## 4. Validate with getUserId on every re-init

Call `TerraFlutter.getUserId` after every init; it returns the `user_id` or null. On null, call `initConnection` again to reconnect.

## 5. Background delivery (iOS only)

In `ios/.../AppDelegate.swift`, call `setUpBackgroundDelivery` in `didFinishLaunchingWithOptions`:

```swift
import UIKit
import Flutter
import TerraiOS

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    Terra.setUpBackgroundDelivery()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

Delivery constraints and per-category `customPermissions` requirements are in SKILL.md.

## 6. Filtering by source app (iOS, optional)

`setIgnoredSources` skips named HealthKit source apps (to avoid duplicates when a cloud Terra API connection and that provider's companion app both sync into Apple Health). Call it after every `initTerra`; **not persisted across restarts**. No-op on Android.

```dart
await TerraFlutter.setIgnoredSources(["com.whoop.app", "com.garmin.connect.mobile"]);
```

## Historical data and disconnect

```dart
Future<void> getData() async {
  Connection connection = Connection.appleHealth;
  DateTime startDate = DateTime.now().subtract(Duration(days: 1));
  DateTime endDate = DateTime.now();
  DataMessage? dataMessage =
      await TerraFlutter.getDaily(connection, startDate, endDate, toWebhook: false);
  if (dataMessage?.error != null) {
    throw Exception("Error getting data ${dataMessage?.error}");
  }
  // process dataMessage?.data
}
```

Set `toWebhook: false` to receive the payload in the response instead of pushing to your destination. Disconnect via the same backend endpoint as web integrations (`DELETE /auth/deauthenticateUser`). See the SDK reference on [docs.tryterra.co](https://docs.tryterra.co/health-and-fitness-api/mobile-only-sources/flutter) for the full function list.
