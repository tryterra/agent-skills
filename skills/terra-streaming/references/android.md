# Android producer (Kotlin)

Setting up a native Android app as a producer with `terra-rtandroid`. Sources: [connect-wearable-to-sdk/android](https://docs.tryterra.co/streaming-api/connect-wearable-to-sdk/android) and [your-app-greater-than-terra/android](https://docs.tryterra.co/streaming-api/your-app-greater-than-terra/android). For exact signatures see the SDK reference on [docs.tryterra.co](https://docs.tryterra.co).

## Install

Add the dependency (use [the latest version on Maven Central](https://central.sonatype.com/artifact/co.tryterra/terra-rtandroid)):

```gradle
implementation 'co.tryterra:terra-rtandroid:X.X.X'
```

Permissions are **requested automatically by the SDK on initialization** – no manual permission plumbing.

## Initialize the SDK

**Initialize the `TerraRT` class every time the app is opened or brought to the foreground.**

```kotlin
import co.tryterra.terrartandroid.TerraRT

terraRT = TerraRT(
    devId = developerId,
    context = this,
    referenceId = referenceId
) { success ->
    if (success) println("TerraRT initialized")
}
```

## Register the phone (initConnection)

`initConnection` registers the phone as a producer using a **phone-registration token** minted by your backend from `POST https://api.tryterra.co/v2/auth/generateAuthToken`.

```kotlin
terraRT.initConnection(token) { success ->
    if (success) println("Connection initialized")
}
```

## Scan and connect a device

Android supports **BLE** and **ANT+**. ANT+ is Android-only and works only when the phone's hardware supports it.

`startDeviceScan` comes in two forms. You choose whether to reuse cached devices (ones connected before) or show a picker widget when no cached device is found.

Widget-based, auto-connecting:

```kotlin
import co.tryterra.terrartandroid.enums.Connections

terraRT.startDeviceScan(
    type = Connections.BLE,
    useCache = false,
    showWidgetIfCacheNotFound = true
) { success -> if (success) println("Device connected") }
```

Programmatic, with a per-device callback so you pick and connect yourself:

```kotlin
terraRT.startDeviceScan(type = Connections.BLE) { device ->
    println("Found: ${device.deviceName}")
    terraRT.connectDevice(device) { connected -> println("Connected: $connected") }
}
```

## Stream: local vs to the broker

A device only streams when it is configured to broadcast over BLE or ANT+.

Local only (no server):

```kotlin
import co.tryterra.terrartandroid.enums.DataTypes

val dataTypes = setOf(DataTypes.HEART_RATE, DataTypes.STEPS)
terraRT.startRealtime(type = Connections.BLE, dataTypes = dataTypes) { update ->
    println("${update.type}: ${update.`val`}")
}
```

To the broker as well – pass a **producer token** from `POST /auth/user?id=<terra_user_id>`. Retrieve the user ID from the SDK's `getUserId`:

```kotlin
terraRT.startRealtime(
    type = Connections.BLE,
    dataTypes = dataTypes,
    token = token,
    updateHandler = { update -> println("${update.type}: ${update.`val`}") },
    connectionCallback = { connected -> println("Websocket connected: $connected") }
)
```

Stop and disconnect:

```kotlin
terraRT.stopRealtime(type = Connections.BLE)
terraRT.disconnect(type = Connections.BLE)
```
