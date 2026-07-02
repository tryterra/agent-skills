# Flutter producer

Setting up a Flutter app as a producer with `terra_flutter_rt`. Sources: [connect-wearable-to-sdk/flutter](https://docs.tryterra.co/streaming-api/connect-wearable-to-sdk/flutter) and [your-app-greater-than-terra/flutter](https://docs.tryterra.co/streaming-api/your-app-greater-than-terra/flutter).

## Install

```yaml
dependencies:
  terra_flutter_rt: ^X.X.X
```

- **iOS** also requires the [Apple Developer Program](https://developer.apple.com/programs/enroll/) (see [ios.md](ios.md)); add `Privacy - Bluetooth Always Usage Description` and, if streaming from the phone's own sensors via `Connection.apple`, `Privacy - Motion Usage Description` to `Info.plist`.
- **Android** requests permissions automatically on initialization.

## Initialize

**Initialize every time the app is opened or foregrounded.**

```dart
import 'package:terra_flutter_rt/terra_flutter_rt.dart';
import 'package:terra_flutter_rt/types.dart';

await TerraFlutterRt.init('YOUR_DEV_ID', 'YOUR_REFERENCE_ID');
```

## Register the phone (initConnection)

Pass a **phone-registration token** minted by your backend from `POST https://api.tryterra.co/v2/auth/generateAuthToken`:

```dart
await TerraFlutterRt.initConnection(token);
```

## Device scanning

Built-in widget – Android shows a native picker; on iOS embed the `iOSScanView` widget (renders an empty container on Android):

```dart
await TerraFlutterRt.startDeviceScan(
  Connection.ble,
  connectionCallback: (connected) => print('Connected: $connected'),
);
// iOS: place iOSScanView() in your widget tree
```

Or scan programmatically and connect a chosen device yourself:

```dart
await TerraFlutterRt.startDeviceScanToCallback(
  Connection.ble,
  (Device device) async {
    await TerraFlutterRt.connectDevice(device);
  },
  connectionCallback: (connected) => print('Status: $connected'),
);
```

## Local vs server streaming is an explicit choice

Unlike the other SDKs (where a token toggles server streaming on the same call), **Flutter has two separate functions**:

- `startRealtimeToApp` – streams to a local callback only, no server.
- `startRealtimeToServer` – streams to the Terra API broker only, no local callback.

To get **both** local updates and a server stream, call `startRealtimeToApp` for the local callback and have your backend consume from the [Terra API websocket](consumer-protocol.md); one call does not do both.

Local:

```dart
void onUpdate(Update data) => print('${data.type.datatypeString}: ${data.val}');

await TerraFlutterRt.startRealtimeToApp(
  Connection.ble,
  [DataType.heartRate, DataType.steps],
  onUpdate,
);
```

To the broker – fetch a **producer token** from your backend (`POST /auth/user?id=<terra_user_id>`), using `getUserId()` for the ID:

```dart
final userId = await TerraFlutterRt.getUserId();
final token = await fetchStreamingTokenFromBackend(userId); // your backend
await TerraFlutterRt.startRealtimeToServer(
  Connection.ble,
  [DataType.heartRate, DataType.steps],
  token,
);
```

Stop and disconnect:

```dart
await TerraFlutterRt.stopRealtime(Connection.ble);
await TerraFlutterRt.disconnect(Connection.ble);
```

## Apple Watch

Call `connectWatchOS()` (returns false on Android), then stream with `Connection.watchOs`:

```dart
final connected = await TerraFlutterRt.connectWatchOS();
if (connected) {
  await TerraFlutterRt.startRealtimeToApp(Connection.watchOs, [DataType.heartRate], onUpdate);
}
```

Control watch workout sessions from Flutter: `pauseWatchOSWorkout`, `resumeWatchOSWorkout`, `stopWatchOSWorkout`.

**The watchOS app itself must be native Swift** using the `Terra` class from `TerraRTiOS` – Flutter cannot supply the watch app. See [ios.md](ios.md) for the watch-side setup and why a workout session raises the sampling frequency.
