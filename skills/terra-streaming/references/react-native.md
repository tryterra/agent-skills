# React Native producer

Setting up a React Native app as a producer with `react-native-terra-rt-react`. Sources: [connect-wearable-to-sdk/react-native](https://docs.tryterra.co/streaming-api/connect-wearable-to-sdk/react-native) and [your-app-greater-than-terra/react-native](https://docs.tryterra.co/streaming-api/your-app-greater-than-terra/react-native).

## Install

```bash
npm install react-native-terra-rt-react
```

- **iOS** also requires the [Apple Developer Program](https://developer.apple.com/programs/enroll/) (see [ios.md](ios.md)); add `Privacy - Bluetooth Always Usage Description` and, if streaming from the phone's own sensors via `Connections.APPLE`, `Privacy - Motion Usage Description` to `Info.plist`; then run `pod install` in `/ios`.
- **Android** requests permissions automatically on initialization.

## Initialize with event emitters

Data arrives through native event emitters, so set the listeners up once (e.g. in a `useEffect`) before initializing. **Initialize every time the app is opened or foregrounded.**

```tsx
import { NativeEventEmitter, NativeModules } from "react-native";
import { initTerra } from "react-native-terra-rt-react";
import type { Update, Device } from "react-native-terra-rt-react";

const updateEmitter = new NativeEventEmitter(NativeModules.UpdateHandler);
updateEmitter.addListener("Update", (u: Update) =>
  console.log(`${u.type}: ${u.val}`),
);

const deviceEmitter = new NativeEventEmitter(NativeModules.DeviceHandler);
deviceEmitter.addListener("Device", (d: Device) =>
  console.log(`Found: ${d.name}`),
);

const connectionEmitter = new NativeEventEmitter(
  NativeModules.ConnectionHandler,
);
connectionEmitter.addListener("ConnectionUpdate", (c: boolean) =>
  console.log("WS:", c),
);

const result = await initTerra("YOUR_DEV_ID", "YOUR_REFERENCE_ID");
```

## Register the phone (initConnection)

Pass a **phone-registration token** minted by your backend from `POST https://api.tryterra.co/v2/auth/generateAuthToken`:

```tsx
const connResult = await initConnection(token);
```

## Device scanning differs by platform

- **Android:** `startDeviceScan(Connections.BLE)` shows a built-in device picker.
- **iOS:** `startDeviceScan` is **not supported**. Render the `BLWidget` native component (`requireNativeComponent('BLWidget')`) instead; it lists devices and handles connection.

```tsx
if (Platform.OS === "android") {
  await startDeviceScan(Connections.BLE);
} else {
  // render <BLWidget withCache={false} onSuccessfulConnection={...} /> in your tree
}
```

## Stream: local vs to the broker

The **token is the only difference**. Without it, streaming is local (updates arrive on the `Update` emitter); with it, the SDK also relays to the broker.

Local only:

```tsx
await startRealtime(Connections.BLE, [DataTypes.HEART_RATE, DataTypes.STEPS]);
```

To the broker as well – fetch a **producer token** from your backend (`POST /auth/user?id=<terra_user_id>`), using `getUserId()` for the ID:

```tsx
const { userId } = await getUserId();
const { token } = await fetchStreamingToken(userId); // your backend
await startRealtime(
  Connections.BLE,
  [DataTypes.HEART_RATE, DataTypes.STEPS],
  token,
);
```

Watch websocket status via the `ConnectionUpdate` emitter. Stop and disconnect:

```tsx
await stopRealtime(Connections.BLE);
await disconnect(Connections.BLE);
```

## Apple Watch

Call `connectWithWatchOS()` on the iOS side (rejects on Android), then stream with `Connections.WATCH_OS`:

```tsx
await connectWithWatchOS();
await startRealtime(Connections.WATCH_OS, [DataTypes.HEART_RATE]);
```

**The watchOS app itself must be native Swift** using the `Terra` class from `TerraRTiOS` – React Native cannot supply the watch app. See [ios.md](ios.md) for the watch-side setup and workout sessions.
