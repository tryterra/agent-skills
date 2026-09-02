# Android (Kotlin) – TerraAndroid

Native Kotlin integration for **Samsung Health** and **Health Connect**. Source: [docs.tryterra.co/unified-api/mobile-only-sources/android-kotlin](https://docs.tryterra.co/unified-api/mobile-only-sources/android-kotlin).

## 1. Install

In your `build.gradle` dependencies:

```gradle
implementation 'co.tryterra:terra-android:{VERSION_NUMBER}'
```

Latest version on [Maven Central](https://central.sonatype.com/artifact/co.tryterra/terra-android/). Then Sync Project with Gradle Files.

**Requirements:** Android 28 (minSDK 28) and above; the target app (Samsung Health or Health Connect) must be installed on the device.

## Configure health permissions

Choose your route. You can start on Health Connect and switch to Samsung direct later with only a version bump.

### Samsung Health (recommended for Samsung devices)

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

### Health Connect

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

## 2. Initialize (once on app start, and on every foreground)

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

## 3. Connect with initConnection

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
- `customPermissions`: maps to Health Connect / Samsung data types – see [Permissions mapping](https://docs.tryterra.co/unified-api/mobile-only-sources).

**Popup fires once.** Health Connect forbids the permission popup from appearing more than once per permission, so a second `initConnection` does nothing. It re-appears only if you expand `customPermissions`, the app is reinstalled, or you request a permission Google has not approved for release.

## 4. Validate with getUserId on every re-init

`getUserId` is synchronous: returns the `user_id` or `null`.

```kotlin
if (terra.getUserId(Connections.SAMSUNG) != null) {
    // already connected
    return
}
// else call initConnection to (re)connect
```

## Historical data and disconnect

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

Disconnect via the same backend endpoint as web integrations (`DELETE /auth/deauthenticateUser`). There is no iOS-style background-delivery setup on Android – foreground scheduled requests are controlled by `schedulerOn`. See the SDK reference on [docs.tryterra.co](https://docs.tryterra.co/unified-api/mobile-only-sources/android-kotlin) for the full function list.
