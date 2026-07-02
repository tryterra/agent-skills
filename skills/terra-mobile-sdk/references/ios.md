# iOS (Swift) – TerraiOS

Native Swift integration for **Apple Health**. Source: [docs.tryterra.co/health-and-fitness-api/mobile-only-sources/ios-swift](https://docs.tryterra.co/health-and-fitness-api/mobile-only-sources/ios-swift). `TerraiOS` supports Apple Health only.

## 1. Install and add capabilities

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

## 2. Initialize (once on app start, ideally on every foreground)

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

`Terra.instance` arguments: `devId` (your Terra developer ID), `referenceId` (your ID for this user, the webhook join key), `requestPermissions` (optional, defaults `true`; see deferred prompting below), and the `completion` callback.

## 3. Connect Apple Health with initConnection

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

`schedulerOn` has no effect on iOS; background delivery is controlled by `setUpBackgroundDelivery()`. `customReadTypes` maps to HealthKit types – see [Permissions mapping](https://docs.tryterra.co/health-and-fitness-api/mobile-only-sources). The popup fires once (re-triggers only on expanded `customPermissions` or reinstall), and it is a WebView (WebView-based apps must interrupt their WebView, call `initConnection`, then reopen).

## 4. Validate with getUserId on every re-init

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

## 5. Background delivery

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

Delivery fires at lower frequency when the app is killed, only with the phone unlocked and a network connection, and only for data types enabled on the [Terra Dashboard](https://dashboard.tryterra.co). With `customPermissions`, enable the per-category permissions listed in SKILL.md (Daily→`STEPS`, Sleep→`SLEEP_ANALYSIS`, Body→`BMI`+`HEART_RATE`, Activity→`WORKOUT_TYPE`, Nutrition→`NUTRITION_CALORIES`).

## Deferred HealthKit prompting

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

## Cross-device and reinstall behavior

A second device, or a reinstall that reset the vendor identifier, authenticates with a new device identifier. (Apple resets `identifierForVendor` only when the user deletes every app from your App Store team before reinstalling.) When that new identifier arrives under a `referenceId` that already has an Apple Health connection for your dev-id, Terra API issues a **new** `user_id`, **deletes the previous connection**, and sends a `user_reauth` webhook so you can migrate:

```json
{
  "type": "user_reauth",
  "old_user": { "user_id": "<uid-A>", "reference_id": "user-42" },
  "new_user": { "user_id": "<uid-B>", "reference_id": "user-42" }
}
```

Handle `user_reauth` by re-pointing everything stored under `old_user.user_id` to `new_user.user_id`. There is only ever one active connection per `(dev-id, reference_id, provider)`. This replacement fires only when a `referenceId` is supplied; with an empty `referenceId` stale connections accumulate instead – one more reason to always set it.

## Filtering by source app (optional)

Apple Health aggregates data from every health app. If a user has a cloud Terra API connection (e.g. WHOOP) and that provider's companion app syncing into Apple Health, you get duplicates. `setIgnoredSources` skips named apps. Call it after every `Terra.instance` completion; it is **not persisted across restarts**.

```swift
Terra.setIgnoredSources(["com.whoop.app", "com.garmin.connect.mobile"])
```

Common bundle IDs: WHOOP `com.whoop.app`, Garmin Connect `com.garmin.connect.mobile`, Fitbit `com.fitbit.FitbitMobile`, Oura `com.ouraring.oura`. Users can find any app's bundle ID under Settings > Health > Data Access & Devices.

## Historical data and disconnect

Getters (`getDaily`, `getSleep`, etc.) are asynchronous. Set `toWebhook: false` to receive the payload in the callback instead of pushing to your destination.

```swift
terra.getDaily(type: .APPLE_HEALTH, startDate: startDate, endDate: endDate, toWebhook: false) {
    success, payload, err in
    guard success, err == nil else { return }
    print(payload)
}
```

Disconnect via the same backend endpoint as web integrations (`DELETE /auth/deauthenticateUser`).

## Writing data

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

`postBody` and `postNutrition` follow the same shape with `TerraBodyData` / `TerraNutritionData` payloads. Fetch [docs.tryterra.co/health-and-fitness-api/mobile-only-sources/ios-swift.md](https://docs.tryterra.co/health-and-fitness-api/mobile-only-sources/ios-swift.md) for the full payload field lists when building the request body.

## Planned workout sync (iOS 17+)

Planned workouts are created via Terra API's REST API on your backend; the iOS SDK syncs them to Apple Watch through WorkoutKit. Requires iOS 17+.

- `enablePlannedWorkoutBackendSync(enabled:)` – turn automatic syncing on/off (call after connecting Apple Health).
- `syncPlannedWorkoutsFromBackend(type:)` – manually trigger a sync of pending actions.
- `isPlannedWorkoutBackendSyncEnabled` – current state.

Observe `.terraPlannedWorkoutSynced` and `.terraPlannedWorkoutSyncCompleted` via `NotificationCenter` for per-workout and completion events. See the SDK reference linked from [the iOS docs](https://docs.tryterra.co/health-and-fitness-api/mobile-only-sources/ios-swift) for the event object shapes.
