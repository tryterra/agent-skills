# Flutter: terra_flutter_bridge 2.x

Apple Health on iOS, Health Connect and Samsung Health on Android. Sources: [Flutter SDK guide](https://docs.tryterra.co/mobile-sdks/flutter-sdk-2), [Flutter SDK reference](https://docs.tryterra.co/reference/mobile-sdks/flutter-sdk-2).

2.x is `terra_flutter_bridge` 2.2.1 and later on pub.dev. The 1.x plugin shipped as the **0.x** versions of the same package (`TerraFlutter.initTerra`, `TerraFlutter.initConnection`). There is no Flutter upgrade guide: rebuild the integration against the Flutter SDK guide. The Dart API matches the React Native one, so the [React Native upgrade guide](https://docs.tryterra.co/mobile-sdks/react-native-migrating-to-2) maps the old calls.

## Requirements

- Flutter 3.24 or later, Dart 3.5 or later.
- iOS 15 or later. Android `minSdk` 28, `compileSdk` 36, Kotlin 2.0 or later, Android Gradle Plugin 8.9.1 or later.

## 1. Install

```yaml
dependencies:
  terra_flutter_bridge: ^2.3.1
```

The package carries the iOS SDK and resolves `co.tryterra:terra-android` from Maven Central.

## 2. iOS native setup

1. Signing & Capabilities: **HealthKit > HealthKit Background Delivery** and **Background Modes > Background fetch**.
2. `ios/Runner/Info.plist`: `TerraDevID` (your dev ID), `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription` (required even if the app never writes), `UIBackgroundModes` with `fetch`, and `BGTaskSchedulerPermittedIdentifiers` with `co.tryterra.sdk.refresh`. The XML is the same as in `references/react-native.md`.
3. Bootstrap in `AppDelegate`, before `super`, keeping the template's plugin registration:

```swift
import Flutter
import UIKit
import terra_flutter_bridge

override func application(
  _ application: UIApplication,
  didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
) -> Bool {
  TerraFlutterBridgePlugin.bootstrap()
  // ... your template's plugin registration, unchanged
  return super.application(application, didFinishLaunchingWithOptions: launchOptions)
}
```

`bootstrap()` reads `TerraDevID`, builds the native client and registers background sync; a HealthKit wake starts the app with no Flutter engine.

## 3. Android native setup

1. `<meta-data android:name="co.tryterra.sdk.DEV_ID" android:value="YOUR_DEV_ID" />` inside `<application>`. The `androidx.startup` initializer builds the client; if the app removes WorkManager's default initializer, call `TerraFlutter.bootstrap(this)` at the end of `Application.onCreate`.
2. **`MainActivity` must extend `FlutterFragmentActivity`**, not `FlutterActivity`, or `permissions.request` fails with `bridge.no_activity`:

```kotlin
import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity : FlutterFragmentActivity()
```

3. The Health Connect manifest work from `references/android.md` section 2: every Health Connect permission the request reads, `READ_HEALTH_DATA_IN_BACKGROUND`, `READ_HEALTH_DATA_HISTORY`, the `com.google.android.apps.healthdata` package query, and the rationale intent-filter on `MainActivity` plus the Android 14 `activity-alias`.
4. Samsung Health directly (optional): follow [Samsung Health](https://docs.tryterra.co/mobile-sdks/samsung-health), set `terraSamsungHealth=true` in `android/gradle.properties`, and add Samsung's `samsung-health-data-api.aar` to the app; no Terra API artifact carries it.

## 4. Create the client, connect, request permissions

```dart
import 'package:flutter/material.dart';
import 'package:terra_flutter_bridge/terra_flutter_bridge.dart';

late final Terra terra;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  terra = createTerra(tokenProvider: () => api.fetchTerraToken()); // POST /v2/auth/tokens?reference_id=...
  runApp(const MyApp());
}

Future<void> connectHealth(String userId) async {
  try {
    await terra.connect(Source.health, EndUser.reference(id: userId));
    final granted = await terra.permissions.request(read: [
      DataCategory.activity,
      DataCategory.body,
      DataCategory.daily,
      DataCategory.sleep,
    ]); // Android: what was granted. iOS: null.
  } on TerraError catch (error) {
    debugPrint('Connection failed: ${error.code.wire}');
  }
}
```

- `createTerra` attaches to the native client built at launch; it does not build a second one. `tokenTimeout` defaults to 30 seconds.
- Sources: `Source.health` or `Source.samsungHealth` (Android only; pass `source: Source.samsungHealth` to `permissions.request` too). `const EndUser.anonymous()` if the backend sends no `reference_id`.
- Categories: `activity`, `body`, `daily`, `sleep`, `nutrition`, `menstruation`, and `athlete` on iOS. Heart rate needs `body` on iOS and `daily` on Android.
- 2.3.0+: `terra.permissions.request(readTypes: [HealthDataType.steps, HealthDataType.heartRate, ...])` and `terra.permissions.typeStatus(HealthDataType.heartRate)`. Platform-only types (`exerciseTime`, `bmi` are iOS only) and any type for `Source.samsungHealth` fail with `bridge.unsupported_on_platform`.
- iOS only, 2.3.0+: `await terra.permissions.requestClinicalRecords?.call()` (null on Android). Use the `terra-clinical-records` skill if installed.

## 5. Health checks and background

```dart
final state = await terra.diagnostics.state();
if (state is DiagnosticsStateLinkRevoked) {
  await terra.connect(Source.health, EndUser.reference(id: userId));
}
final registered = await terra.background.isRegistered();
```

Local reads take a `TimeRange` (`const TimeRange.lastDays(days: 7)`), e.g. `terra.daily.steps(...)`; writes are `log` on `activity`, `body`, `daily`, `nutrition` and `sleep`. Disconnect with `await terra.disconnect()`. Error codes (`bridge.not_bootstrapped`, `token_rejected`, `workouts_required`, `bridge.no_activity`) mean the same as in `references/react-native.md`; `details['line']` names the missing bootstrap line.
