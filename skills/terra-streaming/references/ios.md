# iOS producer (Swift)

Setting up a native iOS app as a producer with `TerraRTiOS`. Sources: [connect-wearable-to-sdk/ios-swift](https://docs.tryterra.co/streaming-api/connect-wearable-to-sdk/ios-swift) and [your-app-greater-than-terra/ios-swift](https://docs.tryterra.co/streaming-api/your-app-greater-than-terra/ios-swift). For exact signatures see the SDK reference on [docs.tryterra.co](https://docs.tryterra.co).

## Requirement: Apple Developer Program

Realtime streaming on iOS is **only available to accounts enrolled in the [Apple Developer Program](https://developer.apple.com/programs/enroll/)**. This is a hard prerequisite, not a nice-to-have.

## Install and permissions

1. Add `https://github.com/tryterra/TerraRTiOS` as a Swift package dependency.
2. Add to `Info.plist`:
   - `Privacy - Bluetooth Always Usage Description` – justification shown when requesting BLE permission.
   - `Privacy - Motion Usage Description` – only if you stream from the phone's own motion sensors.

Permissions are requested from the user on first launch.

## Initialize the SDK

The SDK revolves around the `TerraRT` class. **Initialize it every time the app is opened or brought to the foreground** – producer registration does not survive backgrounding.

```swift
import TerraRTiOS

let terraRT = TerraRT(devId: developerId, referenceId: referenceId) { success in
    print(success ? "TerraRT ready" : "TerraRT init failed")
}
```

## Register the phone (initConnection)

`initConnection` registers the phone with the Terra API so it can act as a producer. It takes a **phone-registration token** minted by your backend from `POST https://api.tryterra.co/v2/auth/generateAuthToken`.

```swift
terraRT.initConnection(token: token) { success in
    print(success ? "Connection initialized" : "initConnection failed")
}
```

## Connect a wearable

iOS supports BLE and Apple Watch (WatchConnectivity). **There is no `startDeviceScan` on iOS** – instead `startBluetoothScan` returns a SwiftUI `TerraBLEWidget` view that renders the device picker and handles connection:

```swift
scanWidget = terraRT.startBluetoothScan(type: .BLE) { success in
    connected = success
}
```

Render the returned widget in your view.

## Stream: local vs to the broker

`startRealtime` has two forms. **Passing a token is the only difference** between local-only and streaming to the broker.

Local only (no data leaves the device):

```swift
terraRT.startRealtime(type: .BLE, dataType: [.HEART_RATE, .STEPS]) { update in
    if let value = update.val { print("\(update.type ?? ""): \(value)") }
    if let arr = update.d { print("\(update.type ?? ""): \(arr)") }
}
```

To the broker as well – pass a **producer token** from `POST /auth/user?id=<terra_user_id>`:

```swift
terraRT.startRealtime(
    type: .BLE,
    dataType: [.HEART_RATE, .STEPS],
    token: token,
    callback: { update in /* local updates */ },
    connectionCallback: { connected in print("Websocket connected: \(connected)") }
)
```

Stop and disconnect:

```swift
terraRT.stopRealtime(type: .BLE)
terraRT.disconnect(type: .BLE)
```

## Apple Watch (watchOS)

To stream from an Apple Watch, the watch must **initiate** the stream to the paired iPhone, so you need a watchOS companion app. **The watch app must be native Swift using the `Terra` class from `TerraRTiOS`** – this holds even when your phone app is React Native or Flutter.

Watch-side setup:

1. Add a watchOS target: File → New → Target → Watch App for iOS App.
2. Enable **HealthKit** and **Background Modes**, and add to the watch `Info.plist`:
   - `Privacy - Health Share Usage Description`
   - `Privacy - Health Update Usage Description`
   - `Privacy - Health Records Usage Description`

On the watch, initialize `Terra`, `connect()`, then `startStream(forDataTypes:)`:

```swift
terra = try Terra()
terra?.connect()
terra?.startStream(forDataTypes: [.HEART_RATE, .STEPS]) { success, error in }
```

On the iPhone, pair with the watch via `connectWithWatchOS()` and listen with `startRealtime(type: .WATCH_OS, ...)`:

```swift
try? terraRT?.connectWithWatchOS()
terraRT?.startRealtime(type: .WATCH_OS, dataType: [.HEART_RATE, .STEPS]) { update in }
```

### Workout sessions for higher frequency

Outside a workout session the watch records at **reduced frequency**. To capture the highest frequency, run a workout session on the watch. Watch-side: `startExercise(forType:)`, `pauseExercise`, `resumeExercise`, `stopExercise`. iPhone-side control: `pauseWatchOSWorkout`, `resumeWatchOSWorkout`, `stopWatchOSWorkout`.

```swift
terra?.startExercise(forType: .RUNNING) { success, error in }
```
