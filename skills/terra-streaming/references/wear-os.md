# Wear OS producer

Streaming from a Wear OS watch with the `terra-wearos` library. Source: [connect-wearable-to-sdk/wear-os](https://docs.tryterra.co/streaming-api/connect-wearable-to-sdk/wear-os).

## How it fits together

`terra-wearos` runs **on the Wear OS watch app** and streams the watch's sensor data over Bluetooth to your Android phone, which runs [`TerraRTAndroid`](https://github.com/tryterra/TerraRTAndroid) and forwards it to the Terra broker. The two libraries are used together: the watch is the sensor source, the phone is the producer. Set up the phone side per [android.md](android.md).

## Install (watch app)

```gradle
implementation 'co.tryterra:terra-wearos:X.X.X'
```

Add to the watch app's `AndroidManifest.xml` so it can reach Wear OS Health Services:

```xml
<queries>
    <package android:name="com.google.android.wearable.healthservices" />
</queries>
```

## Instantiate Terra

```kotlin
terra = Terra(context: Context, streamDataSet: Set<StreamDataTypes>)
```

- `context` – the app context.
- `streamDataSet` – the set of `StreamDataTypes` you want to stream.

Instantiating this class **prompts the user for `Body Sensor`, `Location`, and `Activity Recognition` permissions**.

## Pair with the phone

Put the watch in discovery mode, then find it from the `TerraRTAndroid` side on the phone to complete the pairing:

```kotlin
terra.startBluetoothDiscovery { success -> /* true when a phone connects */ }
```

The callback fires with `true` (paired) or `false` (failed).

## Stream

```kotlin
terra.startStream()
terra.stopStream()
```

## Exercises

You can run an exercise on the watch and have its data streamed to the phone.

**`prepareExercise` only warms up the sensors – it does not start streaming.** It is recommended but optional:

```kotlin
terra.prepareExercise(
    type: ExerciseTypes,
    dataTypes: Set<DataTypes>,
    shouldEnableGPS: Boolean,   // optional, default false – warms the location sensor
    callback: (Boolean) -> Unit // optional but recommended
)
```

`startExercise` begins the session and **automatically starts streaming**:

```kotlin
terra.startExercise(
    type: ExerciseTypes,
    dataTypes: Set<DataTypes>,
    shouldEnableGPS: Boolean,                 // optional, default false
    shouldEnableAutoPauseAndResume: Boolean,  // optional, default false
)
```

Control the session with `pauseExercise()`, `resumeExercise()`, and `stopExercise()`.

## Payload shape (arrives on your consumer)

Exercise (and stream) data reaches your backend as a standard DISPATCH (`op 5`):

```json
{
  "op": 5,
  "d": { "ts": "<ISO 8601>", "val": 0.0, "d": [0.0] },
  "uid": "<user id>",
  "seq": 0,
  "t": "RUNNING_HEART_RATE"
}
```

For exercises, **`t` is the `ExerciseTypes` enum and the `DataTypes` enum concatenated**. A `RUNNING` exercise streaming `HEART_RATE` and `STEPS` produces two payload streams with `t` values `RUNNING_HEART_RATE` and `RUNNING_STEPS`. `d.val` carries single-value types; `d.d` carries multi-axis arrays. See [consumer-protocol.md](consumer-protocol.md) for the full DISPATCH shape.
