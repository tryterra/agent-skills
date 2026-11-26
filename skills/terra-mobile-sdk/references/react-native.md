# React Native: @tryterra/react-native 2.x

Apple Health on iOS, Health Connect and Samsung Health on Android. Sources: [React Native SDK guide](https://docs.tryterra.co/mobile-sdks/react-native-sdk-2), [React Native SDK reference](https://docs.tryterra.co/reference/mobile-sdks/react-native-sdk-2), [React Native upgrade guide](https://docs.tryterra.co/mobile-sdks/react-native-migrating-to-2).

The 2.x package is `@tryterra/react-native`. The 1.x package was `terra-react` (`initTerra`, `initConnection`): an app that still has it must follow the upgrade guide, uninstalling `terra-react` (and any Samsung-tagged build of it) first.

## Requirements

- React Native 0.81 or later, New Architecture.
- iOS 15.1 or later. Android `minSdkVersion` 28, `compileSdkVersion` 36.

## 1. Install

```bash
npm install @tryterra/react-native
cd ios && pod install
```

The package carries the iOS SDK and resolves `co.tryterra:terra-android` from Maven Central; nothing else to install.

## 2. iOS native setup

1. Signing & Capabilities: **HealthKit > HealthKit Background Delivery** and **Background Modes > Background fetch**.
2. `Info.plist`:

```xml
<key>TerraDevID</key>
<string>YOUR_DEV_ID</string>
<key>NSHealthShareUsageDescription</key>
<string>We read your health data to show your activity and sleep.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>We save your workouts to Apple Health.</string>
<key>UIBackgroundModes</key>
<array>
  <string>fetch</string>
</array>
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
  <string>co.tryterra.sdk.refresh</string>
</array>
```

`NSHealthUpdateUsageDescription` is required even if the app never writes.

3. Bootstrap first thing in `AppDelegate`, before React Native starts. It reads `TerraDevID`, builds the native client and registers background sync, because a HealthKit wake starts the app with no JavaScript runtime:

```swift
import TerraReactNative

func application(
  _ application: UIApplication,
  didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
) -> Bool {
  TerraReactNative.bootstrap()
  // ... start React Native as usual
  return true
}
```

Remove any 1.x `Terra.setUpBackgroundDelivery()` call.

## 3. Android native setup

1. Dev ID inside `<application>`:

```xml
<meta-data android:name="co.tryterra.sdk.DEV_ID" android:value="YOUR_DEV_ID" />
```

The package's `androidx.startup` initializer builds the client before `Application.onCreate`. If the app removes WorkManager's default initializer, call `TerraReactNative.bootstrap(this)` at the end of `Application.onCreate` instead. An Expo app, whose manifest is generated, sets the meta-data from a config plugin.

2. The Health Connect manifest work from `references/android.md` section 2: one `<uses-permission>` per Health Connect permission the request reads (an undeclared one makes Health Connect refuse the whole sheet), `READ_HEALTH_DATA_IN_BACKGROUND`, `READ_HEALTH_DATA_HISTORY`, the `com.google.android.apps.healthdata` package query, and the rationale intent-filter on `MainActivity` plus the Android 14 `activity-alias` targeting it.
3. Samsung Health directly: follow [Samsung Health](https://docs.tryterra.co/mobile-sdks/samsung-health) and set `terraSamsungHealth=true` in `android/gradle.properties`. Without it, `'samsungHealth'` rejects with `health_data_unavailable`.

## 4. Create the client, connect, request permissions

Create the client once, at module scope:

```typescript
// terra.ts
import { createTerra } from "@tryterra/react-native";

export const terra = createTerra({
  tokenProvider: () => api.terraToken(), // your backend: POST /v2/auth/tokens?reference_id=...
});
```

`tokenTimeoutMs` (default 30 seconds) bounds the wait for the token provider.

```tsx
import { EndUser, TerraError } from "@tryterra/react-native";
import { terra } from "./terra";

const connectHealth = async () => {
  try {
    await terra.connect("health", EndUser.reference(user.id));
    const granted = await terra.permissions.request({
      read: ["activity", "body", "daily", "sleep"],
    }); // Android: what was granted. iOS: undefined.
  } catch (error) {
    if (error instanceof TerraError) console.error(error.code);
  }
};
```

- Sources: `'health'` (Apple Health on iOS, Health Connect on Android) or `'samsungHealth'` (Android only; pass it as the second argument to `permissions.request` too). `EndUser.anonymous` if the backend sends no `reference_id`. `connect(source, endUser, { token })` links fresh with a token in hand.
- Categories: `activity`, `body`, `daily`, `sleep`, `nutrition`, and from 2.2.1 `menstruation` and `athlete` (iOS). Heart rate needs `body` on iOS and `daily` on Android.
- 2.3.0+: `permissions.request({ readTypes: ['workouts', 'steps', 'heartRate', ...] })` and `permissions.typeStatus('heartRate')` (`notDisclosed` on iOS). A type the platform cannot store, or any type for `'samsungHealth'`, rejects with `bridge.unsupported_on_platform`.
- iOS only, 2.3.0+: `await terra.permissions.requestClinicalRecords?.()` (undefined on Android). Use the `terra-clinical-records` skill if installed.

## 5. Health checks and background

```typescript
const state = await terra.diagnostics.state(); // { state: 'healthy' }, { state: 'linkRevoked' }, ...
const last = await terra.diagnostics.lastDelivery();
const stop = terra.diagnostics.events((event) => console.log(event));
const registered = await terra.background.isRegistered();
```

On `{ state: 'linkRevoked' }`, call `connect` again with the same end user. Local reads take a `TimeRange` object (`{ kind: 'lastDays', days: 7 }`, `{ kind: 'today' }`), e.g. `terra.daily.steps({ kind: 'today' })`; writes are `log` on `activity`, `body`, `daily`, `nutrition` and `sleep`. Disconnect with `await terra.disconnect()`.

## Errors

Every rejection is a `TerraError` with a stable `code`, a `retryable` flag and `details`.

| Code                                                            | Fix                                                                                                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `bridge.not_bootstrapped`                                       | iOS: add `TerraReactNative.bootstrap()` and `TerraDevID`. Android: add the `co.tryterra.sdk.DEV_ID` meta-data. `details.line` names the line |
| `bridge.token_timeout` (iOS), `token_provider_failed` (Android) | The token provider rejected or exceeded `tokenTimeoutMs`                                                                                     |
| `token_rejected`                                                | Token expired (three minutes) or reused                                                                                                      |
| `bridge.no_activity` (Android)                                  | Request permissions while the app is in the foreground                                                                                       |
| `workouts_required`                                             | Add `workouts` to `readTypes`                                                                                                                |
| Android sheet closes without asking                             | The request reads a type the manifest does not declare                                                                                       |
