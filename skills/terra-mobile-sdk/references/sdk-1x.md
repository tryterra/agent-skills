# Terra API Mobile SDK 1.x

1.x is the previous major version of the Terra API mobile SDK (`TerraiOS` 1.x, `terra-android` 1.x, `terra-react`, `terra_flutter_bridge` 0.x). New apps use 2.x, as SKILL.md describes. Read this file only to maintain an existing 1.x app; to move one to 2.x, follow the [iOS](https://docs.tryterra.co/mobile-sdks/ios-migrating-to-2), [Android](https://docs.tryterra.co/mobile-sdks/android-migrating-to-2) or [React Native](https://docs.tryterra.co/mobile-sdks/react-native-migrating-to-2) upgrade guide (Flutter has none; rebuild against the [Flutter SDK guide](https://docs.tryterra.co/mobile-sdks/flutter-sdk-2)). Never mix the two majors in one app.

Full 1.x reference: [iOS](https://docs.tryterra.co/reference/mobile-sdks/ios-swift), [Android](https://docs.tryterra.co/reference/mobile-sdks/android-kotlin), [React Native](https://docs.tryterra.co/reference/mobile-sdks/react-native), [Flutter](https://docs.tryterra.co/reference/mobile-sdks/flutter).

## Workflow and gotchas (all platforms)

### The six-step workflow

The shape is identical on every platform. Platform differences are in the per-platform sections below.

1. **Install the SDK and grant native capabilities.** Add the package, declare HealthKit/background capabilities (iOS) or manifest permissions and minSDK 28 (Android). See the per-platform section below.
2. **Initialize the SDK on every app start and every foreground.** Create the `TerraManager` (iOS/Android) or call `initTerra` (RN/Flutter). This call is **asynchronous** and must complete before any other SDK call. Initializing is a prerequisite for everything else, so do it every time the app opens, not just once per install.
3. **Mint a single-use auth token from YOUR BACKEND.** `POST https://api.tryterra.co/v2/auth/tokens` (the deprecated `/auth/generateAuthToken` is the same endpoint), with your user's identifier as the `reference_id` **query** parameter so the token is bound to that user. Authenticate with the `auth:write` data token from "Account tools" in SKILL.md, sent as `Authorization: Bearer terra_dt_...`; it is bound to one environment, so no `dev-id` header is needed. The `dev-id` and `x-api-key` pair the reference files show still works, but it is the environment's master key. The token is single-use **and expires in 3 minutes** (the response includes `expires_in`), so mint it just-in-time when the user initiates the connection, not at app start. Hand it to the client through your own channel. Never call this endpoint from the app, in development or production: whatever credential can mint tokens must stay on your server.
4. **Open the connection with `initConnection`.** Pass the connection type, the token, and your permission set. This triggers the OS permission popup. See "Permission popup behavior" below – it is the highest-friction part of the integration.
5. **Validate with `getUserId` on every re-initialization.** `getUserId` is synchronous and returns the `user_id` if the connection is live or `nil`/`null` if not. Call it right after every init; on `nil`, call `initConnection` again to reconnect. Re-connecting an already-connected user triggers no popup and does not interrupt the user.
6. **iOS only: enable background delivery.** Call `Terra.setUpBackgroundDelivery()` in your `AppDelegate`'s `didFinishLaunchingWithOptions`. Without it, Apple Health data is not pushed automatically.

**Deauthenticating** a user uses the same endpoint as web integrations: `DELETE /auth/deauthenticateUser`, called from your backend. See [the web API auth reference](https://docs.tryterra.co/unified-api).

### Permission popup behavior (read before shipping)

- **The popup fires once.** On both Apple Health and Health Connect, the OS shows the permission screen only the first time. Calling `initConnection` again is a no-op for the popup. It re-triggers **only** if: (a) you call `initConnection` with an **expanded** set of `customPermissions`, (b) the app is deleted and reinstalled, or (c) – Health Connect only – you request a permission that Google has not approved for your app on release.
- **The HealthKit popup is a WebView.** If your app is itself WebView-based, you must interrupt your WebView, call `initConnection`, and reopen your WebView on completion. Otherwise the popup cannot render.
- **`getUserId` returning `nil` means reconnect, not re-popup.** Reconnecting a still-authorized user is silent.

### Background delivery (iOS)

`Terra.setUpBackgroundDelivery()` enables automatic Apple Health pushes, but the delivery is constrained:

- Fires at a **much lower frequency** when the app is killed.
- Fires **only when the phone is unlocked**.
- Fires **only with a network connection**.
- Delivers **only data types enabled on [the Terra API dashboard](https://dashboard.tryterra.co)**. `terra unified-api data scopes list --env <dev-id>` reads that set. To change it, `terra unified-api data scopes replace` takes the **complete** set: every type you leave out is deselected, so read the list first and send it back with your additions.
- If you use `customPermissions`, background delivery needs specific per-category permissions enabled: **Daily** needs `STEPS`; **Sleep** needs `SLEEP_ANALYSIS`; **Body** needs `BMI` and `HEART_RATE`; **Activity** needs `WORKOUT_TYPE`; **Nutrition** needs `NUTRITION_CALORIES`.

`schedulerOn` has **no effect on iOS** – background delivery is controlled entirely by `setUpBackgroundDelivery()`. On Android, `schedulerOn = true` enables Terra API to make scheduled requests while the app is in the foreground.

### Cross-platform gotchas

- **Samsung Health needs an approved partnership.** Terra API has a privileged Samsung partnership that bypasses Health Connect, but you must [apply for access](https://developer.samsung.com/SHealth/business-partner/m48wvqi1mt9w2w4c). While waiting, develop against Health Connect; switching to Samsung direct later is a **version bump with no code changes**. Release builds need the ProGuard rule `-keep class com.samsung.android.** { *; }` (R8 strips the Samsung classes without it and crashes at runtime), and test devices need **Developer Mode** enabled in Samsung Health.
- **Health Connect needs manifest work and Google approval.** Your manifest needs a privacy-policy `<activity>` with the `ACTION_SHOW_PERMISSIONS_RATIONALE` and `VIEW_PERMISSION_USAGE` intent-filters. Before going live you must apply to Google for Health Connect data-type access and add `tools:node="remove"` `<uses-permission>` lines for every permission you do not use. See "Android (Kotlin)" below.
- **`setIgnoredSources` is iOS-only and not persisted.** It filters out data from specific source apps in HealthKit (useful when a user has both a cloud Terra API connection and that provider's companion app syncing into Apple Health, which produces duplicates). It resets on every app restart, so call it after every init. On Android it is a no-op.
- **A new device or reinstall replaces the connection – handle `user_reauth`.** When an SDK auth arrives with the same `(dev-id, reference_id, provider)` as an existing connection but a new device identifier (second device, or a reinstall that reset the vendor ID), Terra API issues a **new** `user_id`, **deletes every previous connection** for that tuple, and sends a `user_reauth` webhook carrying `old_user` and `new_user`. Handle that event by migrating your stored `old_user.user_id` to `new_user.user_id`; there is only ever one active connection per `(dev-id, reference_id, provider)`. This replacement only fires when a `reference_id` is supplied – with an empty `reference_id` stale connections accumulate instead, one more reason to always set `reference_id`.
- **`postActivity` requires `device_data` and iOS 14+.** Writing a completed activity fails without `device_data` in the payload.

## iOS (Swift) – TerraiOS

Native Swift integration for **Apple Health**. Source: [iOS SDK 1.x](https://docs.tryterra.co/mobile-sdks/ios-swift). `TerraiOS` supports Apple Health only.

### 1. Install and add capabilities

1. Add `https://github.com/tryterra/TerraiOS` as a Swift Package dependency in Xcode.
2. Add these **Capabilities**:
   - HealthKit > HealthKit Background Delivery
   - Background Modes > Background processing
   - Background Modes > Background fetch
3. Add to `info.plist`:

| Key                                        | Value                                                |
| ------------------------------------------ | ---------------------------------------------------- |
| Privacy - Health Share Usage Description   | Description of how Health data is used (min 3 words) |
| Privacy - Health Records Usage Description | Description of how Health data is used (min 3 words) |
| Privacy - Health Update Usage Description  | Description of how Health data is used (min 3 words) |
| Permitted background task scheduler        | `co.tryterra.data.post.request`                      |

### 2. Initialize (once on app start, ideally on every foreground)

`Terra.instance` is asynchronous. Ensure it completes before any other SDK call.

```swift
import TerraiOS

var terra: TerraManager?

Terra.instance(devId: "<YOUR_DEV_ID>", referenceId: "<REFERENCE_ID>") { manager, error in
    guard let manager = manager, error == nil else {
        fatalError("\(error?.localizedDescription ?? "unknown error")")
    }
    terra = manager
}
```

`Terra.instance` arguments: `devId` (your Terra API developer ID), `referenceId` (your ID for this user, the webhook join key), `requestPermissions` (optional, defaults `true`; see deferred prompting below), and the `completion` callback.

### 3. Connect Apple Health with initConnection

Mint the single-use token from your backend first (`POST https://api.tryterra.co/v2/auth/generateAuthToken` with `dev-id` + `x-api-key`). The token expires in 3 minutes, so mint it just-in-time, not at app start.

```swift
let token = "<AUTH_TOKEN>"               // from your backend
let customPermissions: Set<CustomPermissions> = []   // empty = all available
let schedulerOn = true                    // no effect on iOS

terra.initConnection(
    type: .APPLE_HEALTH,
    token: token,
    customReadTypes: customPermissions,
    schedulerOn: schedulerOn
) { success, error in
    guard success, error == nil else {
        fatalError("\(error?.localizedDescription ?? "unknown error")")
    }
    // Connection successful – Apple Health permission popup was shown
}
```

`schedulerOn` has no effect on iOS; background delivery is controlled by `setUpBackgroundDelivery()`. `customReadTypes` maps to HealthKit types – see [Permissions mapping](https://docs.tryterra.co/reference/mobile-sdks/permissions-mapping). The popup fires once (re-triggers only on expanded `customPermissions` or reinstall), and it is a WebView (WebView-based apps must interrupt their WebView, call `initConnection`, then reopen).

### 4. Validate with getUserId on every re-init

`getUserId` is synchronous: returns the `user_id` if connected, `nil` if not.

```swift
func connectUser(_ terra: TerraManager, _ token: String, _ completion: @escaping () -> Void) {
    guard terra.getUserId(type: .APPLE_HEALTH) == nil else {
        completion()   // already connected
        return
    }
    terra.initConnection(type: .APPLE_HEALTH, token: token) { success, error in
        guard success && error == nil else {
            fatalError("\(error?.localizedDescription ?? "")")
        }
        completion()
    }
}
```

### 5. Background delivery

In `AppDelegate.didFinishLaunchingWithOptions`:

```swift
import UIKit
import TerraiOS

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
      _ application: UIApplication,
      didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        Terra.setUpBackgroundDelivery()
        return true
    }
}
```

Delivery fires at lower frequency when the app is killed, only with the phone unlocked and a network connection, and only for data types enabled on the [Terra API dashboard](https://dashboard.tryterra.co). With `customPermissions`, enable the per-category permissions listed in "Background delivery (iOS)" above (Daily→`STEPS`, Sleep→`SLEEP_ANALYSIS`, Body→`BMI`+`HEART_RATE`, Activity→`WORKOUT_TYPE`, Nutrition→`NUTRITION_CALORIES`).

### Deferred HealthKit prompting

By default the popup appears when `initConnection` runs and when `Terra.instance` reconnects a returning user whose iOS authorization was cleared. To gate the popup on an explicit user action, pass `requestPermissions: false` and call `requestHealthKitPermissions` later.

```swift
// Launch: recognize returning user silently, no popup.
Terra.instance(devId: "<DEV_ID>", referenceId: "<REFERENCE_ID>", requestPermissions: false) { manager, error in
    guard let manager = manager, error == nil else { return }
    self.terra = manager
}

// When the user taps "Connect Apple Health":
func userTappedConnectAppleHealth() {
    terra?.requestHealthKitPermissions { success, error in
        // Popup shown here if iOS has not already determined permissions for this install.
    }
}
```

`requestPermissions: false` only changes behavior when `Terra.instance` finds an existing connection needing re-authorization. First-time users, new devices, and reinstalls with a changed device identifier never auto-prompt regardless of the flag.

### Cross-device and reinstall behavior

A second device, or a reinstall that reset the vendor identifier, authenticates with a new device identifier. (Apple resets `identifierForVendor` only when the user deletes every app from your App Store team before reinstalling.) When that new identifier arrives under a `referenceId` that already has an Apple Health connection for your dev-id, Terra API issues a **new** `user_id`, **deletes the previous connection**, and sends a `user_reauth` webhook so you can migrate:

```json
{
  "type": "user_reauth",
  "old_user": { "user_id": "<uid-A>", "reference_id": "user-42" },
  "new_user": { "user_id": "<uid-B>", "reference_id": "user-42" }
}
```

Handle `user_reauth` by re-pointing everything stored under `old_user.user_id` to `new_user.user_id`. There is only ever one active connection per `(dev-id, reference_id, provider)`. This replacement fires only when a `referenceId` is supplied; with an empty `referenceId` stale connections accumulate instead – one more reason to always set it.

### Filtering by source app (optional)

Apple Health aggregates data from every health app. If a user has a cloud Terra API connection (e.g. WHOOP) and that provider's companion app syncing into Apple Health, you get duplicates. `setIgnoredSources` skips named apps. Call it after every `Terra.instance` completion; it is **not persisted across restarts**.

```swift
Terra.setIgnoredSources(["com.whoop.app", "com.garmin.connect.mobile"])
```

Common bundle IDs: WHOOP `com.whoop.app`, Garmin Connect `com.garmin.connect.mobile`, Fitbit `com.fitbit.FitbitMobile`, Oura `com.ouraring.oura`. Users can find any app's bundle ID under Settings > Health > Data Access & Devices.

### Historical data and disconnect

Getters (`getDaily`, `getSleep`, etc.) are asynchronous. Set `toWebhook: false` to receive the payload in the callback instead of pushing to your destination.

```swift
terra.getDaily(type: .APPLE_HEALTH, startDate: startDate, endDate: endDate, toWebhook: false) {
    success, payload, err in
    guard success, err == nil else { return }
    print(payload)
}
```

Disconnect via the same backend endpoint as web integrations (`DELETE /auth/deauthenticateUser`).

### Writing data

`postActivity` (completed activity), `postBody` (body measurement), `postNutrition` (nutrition log) write into Apple Health. `postActivity` **requires `device_data` and iOS 14+** – writing fails without `device_data` in the payload.

```swift
let activityData = TerraActivityData(
    metadata: TerraActivityMetaData(
        type: TerraActivityType.RUNNING.rawValue,
        end_time: Date().terraString,
        start_time: Date().addingTimeInterval(-3600).terraString,
        name: "Morning Run"
    ),
    device_data: TerraDeviceData(name: "Terra")   // required
)
terra.postActivity(type: .APPLE_HEALTH, payload: activityData) { success, error in /* ... */ }
```

`postBody` and `postNutrition` follow the same shape with `TerraBodyData` / `TerraNutritionData` payloads. Fetch [docs.tryterra.co/mobile-sdks/ios-swift.md](https://docs.tryterra.co/mobile-sdks/ios-swift.md) for the full payload field lists when building the request body.

### Planned workout sync (iOS 17+)

Planned workouts are created via Terra API's REST API on your backend; the iOS SDK syncs them to Apple Watch through WorkoutKit. Requires iOS 17+.

- `enablePlannedWorkoutBackendSync(enabled:)` – turn automatic syncing on/off (call after connecting Apple Health).
- `syncPlannedWorkoutsFromBackend(type:)` – manually trigger a sync of pending actions.
- `isPlannedWorkoutBackendSyncEnabled` – current state.

Observe `.terraPlannedWorkoutSynced` and `.terraPlannedWorkoutSyncCompleted` via `NotificationCenter` for per-workout and completion events. See the SDK reference linked from [the iOS docs](https://docs.tryterra.co/mobile-sdks/ios-swift) for the event object shapes.

## Android (Kotlin) – TerraAndroid

Native Kotlin integration for **Samsung Health** and **Health Connect**. Source: [Android SDK 1.x](https://docs.tryterra.co/mobile-sdks/android-kotlin).

### 1. Install

In your `build.gradle` dependencies:

```gradle
implementation 'co.tryterra:terra-android:{VERSION_NUMBER}'
```

Latest version on [Maven Central](https://central.sonatype.com/artifact/co.tryterra/terra-android/). Then Sync Project with Gradle Files.

**Requirements:** Android 28 (minSDK 28) and above; the target app (Samsung Health or Health Connect) must be installed on the device.

### Configure health permissions

Choose your route. You can start on Health Connect and switch to Samsung direct later with only a version bump.

#### Samsung Health (recommended for Samsung devices)

Terra API has a privileged Samsung partnership that gives direct Samsung Health SDK access with no Health Connect intermediary.

1. **Apply** through the [Samsung Health partnership portal](https://developer.samsung.com/SHealth/business-partner/m48wvqi1mt9w2w4c). While waiting, develop against Health Connect.
2. **Install the Samsung-tagged SDK** after approval (look for versions with `samsung` in the name on Maven Central):
   ```gradle
   implementation 'co.tryterra:terra-android:{SAMSUNG_VERSION_NUMBER}'
   ```
3. **Add the ProGuard rule** to `proguard-rules.pro` (release builds crash without it – R8 strips the Samsung classes):
   ```proguard
   -keep class com.samsung.android.** { *; }
   ```
4. **Requirements:** Samsung Health installed; minSDK 28; enable **Developer Mode** in Samsung Health on test devices (Settings > About Samsung Health > tap the version number repeatedly). No extra manifest or Gradle changes.

#### Health Connect

1. In the Health Connect app, grant all permissions between the source apps (Samsung Health, Google Fit, etc.) and Health Connect.
2. In `AndroidManifest.xml`, add these intent-filters under the **privacy-policy `<activity>`** (the Activity Health Connect opens when the user taps the privacy-policy link):
   ```xml
   <intent-filter>
     <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
   </intent-filter>
   <intent-filter>
     <action android:name="android.intent.action.VIEW_PERMISSION_USAGE"/>
     <category android:name="android.intent.category.HEALTH_PERMISSIONS"/>
   </intent-filter>
   ```
3. **Before going live**, apply to Google for Health Connect API access using their [application form](https://developer.android.com/health-and-fitness/guides/health-connect/publish/declare-access#explain-use-data-types), declaring the data types you read. For every permission you do **not** use, add a removal line:
   ```xml
   <uses-permission android:name="android.permission.health.READ_HEART_RATE" tools:node="remove"/>
   ```
   (substitute `android.permission.health.XXX` for each unused permission).

Note: Health Connect has known platform-level sync bugs (e.g. Samsung Health failing to push steps into Health Connect, or data occasionally being inaccessible). Factor this into your reliability expectations.

### 2. Initialize (once on app start, and on every foreground)

The SDK must be initialized every time the app is started; it is a prerequisite for all other SDK functions. `Terra.instance` is asynchronous.

```kotlin
import co.tryterra.terra.Terra
import co.tryterra.terra.TerraManager
import java.lang.IllegalStateException

class MainActivity : AppCompatActivity() {
    private lateinit var terra: TerraManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Terra.instance("YOUR DEV ID", "REFERENCE ID", this) { manager, error ->
            error?.let { throw IllegalStateException("Error initialising terra ${it.message}") }
            terra = manager
        }
    }
}
```

### 3. Connect with initConnection

Mint the token from your backend first. Then:

```kotlin
import co.tryterra.terra.enums.Connections

fun initialiseUserConnection() {
    if (!this::terra.isInitialized) {
        throw IllegalStateException("Terra Manager not initialised yet")
    }
    val token = "your_generated_token_from_backend"

    terra.initConnection(
        connection = Connections.SAMSUNG,     // or Connections.HEALTH_CONNECT
        token = token,
        context = this,
        customPermissions = setOf(),          // empty = all available
        schedulerOn = true,                   // foreground scheduled requests
        startIntent = null                    // deprecated – always null
    ) { success, error ->
        error?.let { throw IllegalStateException("${it.message}") }
        Log.i("MainActivity", "Auth Success status: $success")
    }
}
```

- `connection`: `Connections.SAMSUNG` (Samsung Health) or `Connections.HEALTH_CONNECT`.
- `schedulerOn = true`: lets Terra API make scheduled requests while the app is in the foreground.
- `startIntent`: **deprecated, always pass `null`**.
- `customPermissions`: maps to Health Connect / Samsung data types – see [Permissions mapping](https://docs.tryterra.co/reference/mobile-sdks/permissions-mapping).

**Popup fires once.** Health Connect forbids the permission popup from appearing more than once per permission, so a second `initConnection` does nothing. It re-appears only if you expand `customPermissions`, the app is reinstalled, or you request a permission Google has not approved for release.

### 4. Validate with getUserId on every re-init

`getUserId` is synchronous: returns the `user_id` or `null`.

```kotlin
if (terra.getUserId(Connections.SAMSUNG) != null) {
    // already connected
    return
}
// else call initConnection to (re)connect
```

### Historical data and disconnect

Getters are asynchronous; set `toWebhook = false` to receive the payload in the callback.

```kotlin
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

fun requestData() {
    val startDate = Date.from(Instant.now().minus(1, ChronoUnit.DAYS))
    val endDate = Date()
    terra.getDaily(
        type = Connections.SAMSUNG,
        startDate = startDate,
        endDate = endDate,
        toWebhook = false
    ) { success, payload, error ->
        error?.let { throw IllegalStateException("Error requesting data ${it.message}") }
        // process payload
    }
}
```

Disconnect via the same backend endpoint as web integrations (`DELETE /auth/deauthenticateUser`). There is no iOS-style background-delivery setup on Android – foreground scheduled requests are controlled by `schedulerOn`. See the SDK reference on [docs.tryterra.co](https://docs.tryterra.co/mobile-sdks/android-kotlin) for the full function list.

## React Native – terra-react

Cross-platform integration for **Apple Health** (iOS), **Samsung Health**, and **Health Connect** (Android). Source: [React Native SDK 1.x](https://docs.tryterra.co/mobile-sdks/react-native).

### 1. Install and native setup

```bash
npm install terra-react
```

Then complete the native setup for each platform you target.

#### iOS setup

1. `cd ios && pod install`.
2. Add **Capabilities**: HealthKit > HealthKit Background Delivery; Background Modes > Background processing; Background Modes > Background fetch.
3. Add to `info.plist` (via Xcode or directly):
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

#### Android setup

Same as native Android (see "Android (Kotlin)" below): minSDK 28, and either the Samsung route (apply for the partnership, install the Samsung-tagged package with `npm install terra-react@<samsung-version>`, add the ProGuard rule `-keep class com.samsung.android.** { *; }`, enable Developer Mode) or the Health Connect route (grant permissions in the Health Connect app, add the privacy-policy `<activity>` intent-filters to `AndroidManifest.xml`, apply to Google before release).

### 2. Initialize (once on app start, and on every foreground)

`initTerra` is asynchronous and a prerequisite for all other SDK calls.

```tsx
import { initTerra } from "terra-react";

const initializeTerra = async () => {
  try {
    const successMessage = await initTerra("YOUR_DEV_ID", "YOUR_REFERENCE_ID");
    if (successMessage.error !== null) {
      throw new Error("Terra manager failed to initialise");
    }
    // ready for other terra-react methods
  } catch (error) {
    console.error("Failed to initialize Terra:", error);
  }
};
```

### 3. Connect with initConnection

Mint the single-use token from your backend first (`POST https://api.tryterra.co/v2/auth/generateAuthToken` with `dev-id` + `x-api-key`). The token expires in 3 minutes, so mint it just-in-time, not at app start.

```tsx
import { Connections, initConnection } from "terra-react";

const initializeConnection = async () => {
  try {
    const token = "example_token"; // from your backend
    const successMessage = await initConnection(
      Connections.APPLE_HEALTH, // or SAMSUNG / HEALTH_CONNECT
      token,
      true, // schedulerOn
      [], // customPermissions – empty = all
    );
    if (successMessage.error !== null) {
      throw new Error("Error initialising a connection");
    }
  } catch (error) {
    console.error("Connection failed:", error);
  }
};
```

- `type`: `Connections.APPLE_HEALTH`, `Connections.SAMSUNG`, or `Connections.HEALTH_CONNECT`.
- `schedulerOn`: **no effect on iOS** (background delivery is via `setUpBackgroundDelivery`); on Android, `true` enables foreground scheduled requests.
- `customPermissions`: see [Permissions mapping](https://docs.tryterra.co/reference/mobile-sdks/permissions-mapping).

Popup behavior: Apple Health and Health Connect show the popup once (re-triggers only on expanded `customPermissions`, reinstall, or – Health Connect – a permission Google has not approved). The HealthKit popup is a WebView; WebView-based apps must interrupt their WebView, call `initConnection`, then reopen.

### 4. Validate with getUserId on every re-init

```tsx
import { getUserId, Connections } from "terra-react";
// returns the user_id or null; on null, call initConnection again
```

### 5. Background delivery (iOS only)

In your `/ios` `AppDelegate.m`, call `setUpBackgroundDelivery` in `didFinishLaunchingWithOptions`:

```objectivec
#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <TerraiOS/TerraiOS-Swift.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"AwesomeProject";
  self.initialProps = @{};
  [Terra setUpBackgroundDelivery];
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}
@end
```

Delivery constraints and per-category `customPermissions` requirements are in "Background delivery (iOS)" above.

### 6. Filtering by source app (iOS, optional)

`setIgnoredSources` skips named HealthKit source apps (to avoid duplicates when a cloud Terra API connection and that provider's companion app both sync into Apple Health). Call it after every `initTerra`; **not persisted across restarts**. No-op on Android.

```tsx
import { setIgnoredSources } from "terra-react";
setIgnoredSources(["com.whoop.app", "com.garmin.connect.mobile"]);
```

### Historical data and disconnect

```tsx
import { Connections, getDaily } from "terra-react";

const requestData = async () => {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 1);
  const dataMessage = await getDaily(
    Connections.APPLE_HEALTH,
    startDate,
    endDate,
    false,
  );
  if (dataMessage.error !== null) throw new Error("Failed to get data");
  if (dataMessage.success) console.log("Daily data:", dataMessage.data);
};
```

Set the final `toWebhook` argument to `false` to receive the payload in the response. Disconnect via the same backend endpoint as web integrations (`DELETE /auth/deauthenticateUser`).

### Writing data (Apple Health only)

`postActivity` writes into Apple Health (Health Connect writes are not yet supported). **`device_data` is required** – the write fails without it.

```tsx
import { Activity, postActivity, Connections } from "terra-react";

const activityPayload: Activity = {
  metadata: {
    name: "Morning Run",
    start_time: "...",
    end_time: "...",
    type: 8 /* RUNNING */,
  },
  device_data: { name: "Terra" }, // required
};
const resp = await postActivity(Connections.APPLE_HEALTH, activityPayload);
```

Fetch [docs.tryterra.co/mobile-sdks/react-native.md](https://docs.tryterra.co/mobile-sdks/react-native.md) for the full payload fields, function list, and `ActivityType` enum when building the request body.

## Flutter – terra_flutter_bridge

Cross-platform integration for **Apple Health** (iOS), **Samsung Health**, and **Health Connect** (Android). Source: [Flutter SDK 1.x](https://docs.tryterra.co/mobile-sdks/flutter).

### 1. Install and native setup

```bash
flutter pub add terra_flutter_bridge
```

Then complete the native setup for each platform you target.

#### iOS setup

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

#### Android setup

Same as native Android (see "Android (Kotlin)" below): minSDK 28, and either the Samsung route (apply for the partnership, use the Samsung-tagged `terra_flutter_bridge` version from [pub.dev](https://pub.dev/packages/terra_flutter_bridge/versions), add the ProGuard rule `-keep class com.samsung.android.** { *; }` in `android/app/proguard-rules.pro`, enable Developer Mode) or the Health Connect route (grant permissions in the Health Connect app, add the privacy-policy `<activity>` intent-filters to `AndroidManifest.xml`, apply to Google before release).

### 2. Initialize (once on app start, and on every foreground)

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

### 3. Connect with initConnection

Mint the single-use token from your backend first (`POST https://api.tryterra.co/v2/auth/generateAuthToken` with `dev-id` + `x-api-key`). The token expires in 3 minutes, so mint it just-in-time, not at app start.

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
- `customPermissions`: see [Permissions mapping](https://docs.tryterra.co/reference/mobile-sdks/permissions-mapping).

Popup behavior: Apple Health and Health Connect show the popup once (re-triggers only on expanded `customPermissions`, reinstall, or – Health Connect – a permission Google has not approved). The HealthKit popup is a WebView; WebView-based apps must interrupt their WebView, call `initConnection`, then reopen.

### 4. Validate with getUserId on every re-init

Call `TerraFlutter.getUserId` after every init; it returns the `user_id` or null. On null, call `initConnection` again to reconnect.

### 5. Background delivery (iOS only)

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

Delivery constraints and per-category `customPermissions` requirements are in "Background delivery (iOS)" above.

### 6. Filtering by source app (iOS, optional)

`setIgnoredSources` skips named HealthKit source apps (to avoid duplicates when a cloud Terra API connection and that provider's companion app both sync into Apple Health). Call it after every `initTerra`; **not persisted across restarts**. No-op on Android.

```dart
await TerraFlutter.setIgnoredSources(["com.whoop.app", "com.garmin.connect.mobile"]);
```

### Historical data and disconnect

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

Set `toWebhook: false` to receive the payload in the response instead of pushing to your destination. Disconnect via the same backend endpoint as web integrations (`DELETE /auth/deauthenticateUser`). See the SDK reference on [docs.tryterra.co](https://docs.tryterra.co/mobile-sdks/flutter) for the full function list.
