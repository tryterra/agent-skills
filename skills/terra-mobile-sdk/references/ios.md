# iOS (Swift): TerraSDK 2.x

Native Swift integration for **Apple Health**. Sources: [iOS SDK guide](https://docs.tryterra.co/mobile-sdks/ios-sdk-2), [iOS SDK reference](https://docs.tryterra.co/reference/mobile-sdks/ios-sdk-2), [iOS upgrade guide](https://docs.tryterra.co/mobile-sdks/ios-migrating-to-2).

The package is `https://github.com/tryterra/TerraiOS`; the module is `TerraSDK` and the entry point is `Terra`. iOS 15 or later. Code written against 1.x (`import TerraiOS`, `Terra.instance`, `initConnection`) does not compile against 2.x: follow the upgrade guide first.

## 1. Install

Swift Package Manager only for anything after 2.3.0 (CocoaPods trunk becomes read-only on 2 December 2026). In Xcode, add the package with **Up to Next Major Version** from `2.3.1`, or:

```swift
.package(url: "https://github.com/tryterra/TerraiOS", from: "2.3.1")
```

Link the `TerraSDK` product into the app target. An app moving off CocoaPods removes `pod 'TerraiOS'` from its `Podfile`, runs `pod install`, then adds the package.

## 2. Entitlements and Info.plist

| Where        | Key                                                 | Value                                                                     |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Entitlements | `com.apple.developer.healthkit`                     | `true`                                                                    |
| Entitlements | `com.apple.developer.healthkit.access`              | empty array (add `health-records` only for Apple Health Records)          |
| Entitlements | `com.apple.developer.healthkit.background-delivery` | `true`                                                                    |
| Info.plist   | `NSHealthShareUsageDescription`                     | Why the app reads health data                                             |
| Info.plist   | `NSHealthUpdateUsageDescription`                    | Why the app writes health data. **Required even if the app never writes** |
| Info.plist   | `UIBackgroundModes`                                 | `fetch`                                                                   |
| Info.plist   | `BGTaskSchedulerPermittedIdentifiers`               | `co.tryterra.sdk.refresh` (the exact string; iOS ignores undeclared ones) |

## 3. Build the client and register background sync, at launch

One `Terra` per app, built at launch and kept. Register background sync in the same place, **before the first `await`**: iOS stops the app if a background task is registered after launch finishes.

```swift
import SwiftUI
import TerraSDK

@MainActor
final class HealthModel: ObservableObject {
    let terra = Terra(devID: "<YOUR_DEV_ID>") {
        try await YourBackend.shared.mintTerraToken()   // POST /v2/auth/tokens?reference_id=...
    }

    init() {
        BackgroundSync.register(terra: terra)
    }

    func connect(userID: String) async throws {
        let connection = try await terra.connect(.health, for: .reference(userID))
        print("Terra user_id:", connection.userID)
        try await terra.permissions.request(read: [.daily, .sleep, .activity, .body])
    }
}
```

- `Terra(devID:tokenProvider:)` is synchronous. The closure runs off the main actor and outlives the call, so capture what it needs, not a view.
- `connect(_:for:)` restores the stored link with no network call when it was made for the same `EndUser`; the token provider is called only for a new link. `connect(_:for:using:)` takes a token already in hand and always links fresh.
- `BackgroundSync.register(terra:source:earliestInterval:)` returns `false` when `co.tryterra.sdk.refresh` is missing from `BGTaskSchedulerPermittedIdentifiers`, or when the task was already registered (harmless).
- `try await terra.connections` lists the links on this device.

## 4. Permissions

```swift
// Categories: daily, body, sleep, activity, nutrition, menstruation, athlete, healthObservation
try await terra.permissions.request(
    read: [.activity, .body, .daily, .sleep],
    write: [.body],
    workouts: [WorkoutScope(activity: .running, energy: true, distance: true)]
)

// 2.3.0+: individual types. Makes the install type-scoped for good.
try await terra.permissions.request(readTypes: [
    .workouts, .steps, .activeEnergy, .distance,
    .heartRate, .restingHeartRate, .sleepAnalysis, .weight,
])
```

- `status(for:)` (category or `HealthDataType`) answers `.notDisclosed` for reads; iOS never says granted or denied. `.unavailable` means no Apple Health on the device, `.unsupported` means the SDK cannot read that category yet: hide the feature. `writeStatus(for:)` is real (`granted`, `denied`, `notDetermined`). `await terra.permissions.requested` is everything asked so far.
- Request `body` to upload heart rate; it rides the daily route.
- `write: [.activity]` asks for workouts plus energy and distance. To log only some workouts, leave `.activity` out of `write` and pass `WorkoutScope`s.
- `.workoutRoute`, `.speed`, `.power`, `.cyclingCadence` need `.workouts` or `.activity`, else `workoutsRequired`.
- Apple Health Records: `permissions.requestClinicalRecords()`, never `request`. Use the `terra-clinical-records` skill if installed.

## 5. Your app already has a background task

iOS keeps one pending refresh request per app. If the app submits its own `BGAppRefreshTaskRequest`, the SDK's is dropped and `diagnostics.state()` reports `.backgroundRefreshUnscheduled`. Run Terra API's pass from your task instead:

```swift
// At launch, before the first await, instead of BackgroundSync.register(terra:)
BackgroundSync.registerForHostTask(terra: terra)

BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.example.refresh", using: .main) { task in
    scheduleNextRefresh()   // your own resubmit
    let work = Task { await BackgroundSync.run(terra: terra) }
    task.expirationHandler = { work.cancel() }
    Task { task.setTaskCompleted(success: await work.value) }
}
```

Register the handler with `using: .main`: a handler isolated to the main actor that iOS calls on a background queue stops the app the first time it runs.

## 6. Local reads and writes

Reads go straight to HealthKit, never the network, and need the category requested first:

```swift
let heartRate = try await terra.body.heartRate(in: .lastDays(7))
let steps = try await terra.daily.steps(in: .lastDays(7))
let sleep = try await terra.sleep.segments(in: .lastDays(1))
let workouts = try await terra.activity.workouts(in: .lastHours(24))
guard await terra.availability() == .available else { return }   // 2.2.0+, needs no connection
```

2.2.0 added `daily.totals`, `daily.intraday`, `body.restingHeartRate`, `body.readings`, `activity.routes`, `activity.intensity`, `nutrition.quantities`, `nutrition.hydration`, `menstruation.flow`, `menstruation.events` and `athlete.profile()`. Writes: `log` on `activity`, `body`, `daily`, `nutrition` and `sleep` returns one `UUID` per entry, the only handle for `delete(id:)`. There is no way to write Terra API payloads back into Apple Health.

Planned workouts on Apple Watch: `connection.workouts.requestScheduling()`, once; every sync run then puts the person's plans on the Watch. See [Planned workouts on Apple Watch](https://docs.tryterra.co/mobile-sdks/planned-workouts-apple-watch).

## 7. Diagnostics and troubleshooting

```swift
await terra.diagnostics.state()         // healthy, quiet(since:), linkRevoked, backgroundRefreshUnscheduled, ...
await terra.diagnostics.lastDelivery()  // when data last reached Terra API
for await event in terra.diagnostics.events() { /* typed events, never health values */ }
```

| Symptom                                   | Fix                                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `connect` throws `tokenRejected`          | Token expired (three minutes) or reused. Mint inside the token provider                                          |
| `connect` throws `devIDMismatch`          | Another dev ID linked on this device; the Keychain survives reinstall. One dev ID per app                        |
| `diagnostics.state()` is `.linkRevoked`   | Call `connect(.health, for:)` again with the same end user                                                       |
| No background uploads at all              | `co.tryterra.sdk.refresh` missing, Background fetch off, or `register` called after launch                       |
| Uploads only when the app opens           | Missing `healthkit.background-delivery` entitlement (`backgroundObservationUnavailable` on `events()`)           |
| A category is missing in Terra API        | Never requested, or denied (iOS will not say): ask the person to check Settings > Health > Data Access & Devices |
| Workout energy, distance or steps missing | Type-scoped install without `.activeEnergy`, `.distance`, `.steps` in `readTypes`                                |

App extensions read and write on the host app's grants but cannot show a permission sheet and never sync on their own.
