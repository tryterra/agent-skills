# Data types and connection types

Read this when choosing what to request from the RT SDK, or when a stream is silent for a data type the user expects.

## The full `DataTypes` enum

The RT SDKs accept seventeen values. Pass a set of them to `startRealtime` (or to the `Terra` constructor on Wear OS). Each streamed payload is labelled with the matching name in its `t` field.

| Group          | Data types                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| Cardiac        | `HEART_RATE`, `HRV`, `RR_INTERVAL`, `ECG`                                   |
| Movement       | `STEPS`, `STEPS_CADENCE`, `DISTANCE`, `SPEED`, `FLOORS_CLIMBED`, `ACTIVITY` |
| Cycling        | `POWER`, `BIKE_CADENCE`                                                     |
| Motion sensors | `ACCELERATION`, `GYROSCOPE`                                                 |
| Energy         | `CALORIES`, `MET`                                                           |
| Position       | `LOCATION`                                                                  |

Do not assume the set is only heart rate and steps. Cycling integrations in particular need `POWER` and `BIKE_CADENCE`, and HRV work usually needs `RR_INTERVAL` rather than `HRV`.

## The `Connections` enum

| Connection    | What it covers                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| `BLE`         | Bluetooth Low Energy wearables: heart-rate straps and compatible watches                                       |
| `ANT`         | ANT+ wearables. Android only, and only where the handset has ANT+ hardware                                     |
| `WEAR_OS`     | A Wear OS watch running your companion app                                                                     |
| `WATCH_OS`    | An Apple Watch over WatchConnectivity. Needs a companion watchOS app, which React Native cannot build directly |
| `APPLE`       | Apple platform sources                                                                                         |
| `ANDROID`     | The Android phone's own sensors                                                                                |
| `ALL_DEVICES` | Any connected device                                                                                           |

## Requesting is not receiving

This is the most common source of "the stream is empty" reports. Three things must line up:

1. **The device broadcasts the signal** over BLE, ANT+, or a supported custom Bluetooth protocol.
2. **The connection type carries it.** A chest strap and a Wear OS watch expose very different sensors.
3. **You requested it** in the set passed to `startRealtime`.

Check them in that order. Silence almost always means the device is not broadcasting that signal, not that the connection is broken.

Terra does not gate or filter by device. The broker passes payloads through opaquely and labels them with the `data_type` the producer supplied, so what arrives is decided entirely by the wearable's own broadcast profile.

### Practical consequences for the code you write

- **Never block the UI waiting for a data type.** Render per-signal state and degrade gracefully when one never arrives.
- **Do not treat a missing data type as an error.** It is the normal case for most hardware.
- **Most heart-rate straps are cardiac only.** A strap will not produce `STEPS`, `LOCATION`, or `FLOORS_CLIMBED` however the SDK is configured. Those come from a watch or from the phone's own sensors.

### Determining what a specific device supports

There is no per-device capability list in the API. To find out:

- Check the manufacturer's specification for the BLE services or ANT+ profiles it advertises.
- Connect the device, request a broad set of data types, and log which ones actually produce payloads. This is the most reliable answer for a given firmware version.
- Use a dashboard test user to stream synthetic data without hardware, which separates a broken consumer from a device that does not broadcast.

## Wear OS labels data types differently

On Wear OS, streams started as part of an exercise are labelled with the exercise type and the data type concatenated. Streaming `HEART_RATE` and `STEPS` during a `RUNNING` exercise produces payloads typed `RUNNING_HEART_RATE` and `RUNNING_STEPS`, not `HEART_RATE` and `STEPS`.

Parse the `t` field accordingly if the consumer handles both Wear OS and BLE producers. See [wear-os.md](wear-os.md).
