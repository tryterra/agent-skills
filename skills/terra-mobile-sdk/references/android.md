# Android (Kotlin): terra-android 2.x

Native Kotlin integration for **Health Connect** and **Samsung Health**. Sources: [Android SDK guide](https://docs.tryterra.co/mobile-sdks/android-sdk-2), [Samsung Health](https://docs.tryterra.co/mobile-sdks/samsung-health), [Android SDK reference](https://docs.tryterra.co/reference/mobile-sdks/android-sdk-2), [Android upgrade guide](https://docs.tryterra.co/mobile-sdks/android-migrating-to-2).

The Kotlin package is `co.tryterra.sdk` (1.x was `co.tryterra.terra`). The Maven coordinate is unchanged, so check imports, not the dependency line, to tell the majors apart.

## Requirements

- `minSdk` 28 (Samsung Health add-on: 29), `compileSdk` 36, Android Gradle Plugin 8.9.1 or later.
- Health Connect on the device.
- Never add `terra-android` 2.x to an app still on `terra-react` or the 1.x Flutter plugin: it crashes with missing `co.tryterra.terra` classes.

## 1. Install

```kotlin
dependencies {
    implementation("co.tryterra:terra-android:2.3.1") // or the latest 2.x on Maven Central
}
```

## 2. Manifest

The SDK's manifest declares no health permission and no component. Your app declares exactly what it uses.

1. **One `<uses-permission>` per Health Connect permission behind each category or type you request.** Health Connect never grants an undeclared permission, refuses the whole sheet if one requested type is undeclared, and Play rejects declarations you do not use. Fetch the category table in the [Android SDK guide](https://docs.tryterra.co/mobile-sdks/android-sdk-2#configure-health-permissions) rather than guessing; `HealthConnectPermissions.readPermissions(categories)` and `HealthConnectTypes.readPermissions(types)` return the same lists for a test that keeps the manifest in step.
2. **Optional but usually wanted:** `android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND` (background sync) and `android.permission.health.READ_HEALTH_DATA_HISTORY` (more than 30 days on the first sync). The permission sheet asks for them only if declared.
3. **The privacy-policy screen, declared twice.** Without the alias, Android 14+ fails every read with "Incorrect health permission state":

```xml
<activity android:name=".PermissionsRationaleActivity" android:exported="true">
    <intent-filter>
        <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
    </intent-filter>
</activity>

<activity-alias
    android:name=".ViewPermissionUsageActivity"
    android:exported="true"
    android:targetActivity=".PermissionsRationaleActivity"
    android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
    <intent-filter>
        <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
        <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
    </intent-filter>
</activity-alias>
```

4. **Network and visibility:** `<uses-permission android:name="android.permission.INTERNET" />` and `<queries><package android:name="com.google.android.apps.healthdata" /></queries>` (without the query, Android 13 and below report Health Connect unavailable).
5. **Before release,** submit the Health Connect declaration in the Play Console, one sentence per data type.

## 3. Build the client in `Application.onCreate`

Background runs start the process with no activity, so build the client in the `Application`, never in a screen.

```kotlin
import co.tryterra.sdk.Terra
import co.tryterra.sdk.background.BackgroundSync

class YourApp : Application() {
    lateinit var terra: Terra

    override fun onCreate() {
        super.onCreate()
        terra = Terra(
            this,
            devId = BuildConfig.TERRA_DEV_ID,
            tokenProvider = { yourBackend.mintTerraToken() },   // POST /v2/auth/tokens?reference_id=...
        )
        if (!BackgroundSync.register(this, terra)) {
            Log.w("Terra", "Background sync was refused; nothing is scheduled")
        }
    }
}
```

**Name `tokenProvider`.** The factory's last parameter is `stores`, so a trailing lambda binds there and the client has no token provider.

## 4. Connect and request permissions

Create the `PermissionLauncher` in `onCreate`, before anything that suspends (`connect` included), and unregister it in `onDestroy`.

```kotlin
import co.tryterra.sdk.DataCategory
import co.tryterra.sdk.EndUser
import co.tryterra.sdk.Source
import co.tryterra.sdk.permissions.PermissionLauncher

class ConnectActivity : ComponentActivity() {
    private val terra get() = (application as YourApp).terra
    private lateinit var launcher: PermissionLauncher

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        launcher = terra.permissions.launcher(this)

        connectButton.setOnClickListener {
            lifecycleScope.launch {
                val connection = terra.connect(Source.HEALTH, EndUser.Reference(signedInUser.id))
                Log.i("Terra", "user_id ${connection.userId}")
                val granted = terra.permissions.request(
                    read = setOf(DataCategory.DAILY, DataCategory.SLEEP, DataCategory.ACTIVITY),
                    launcher = launcher,
                )
            }
        }
    }

    override fun onDestroy() {
        launcher.unregister()
        super.onDestroy()
    }
}
```

- `connect(source, forUser)` or `connect(source, forUser, token)`. `Source.HEALTH` is Health Connect (Samsung data included once Samsung Health shares with Health Connect); `Source.SAMSUNG_HEALTH` is the direct add-on. `EndUser.Reference(id)` must match the token's `reference_id`; `EndUser.Anonymous` if the backend sends none.
- Categories: `DAILY`, `BODY`, `SLEEP`, `ACTIVITY`, `NUTRITION`, `MENSTRUATION`. Request `DAILY` for heart rate.
- `request` returns what the sheet granted for this call. Check it. Without arguments: `permissions.status(category)`, `writeStatus(category)`, `backgroundReadStatus()`, `historyReadStatus()`, `requested()`.
- 2.3.0+: `readTypes = setOf(HealthDataType.STEPS, HealthDataType.HEART_RATE, ...)`, Health Connect only (Samsung throws `IllegalArgumentException`). `SLEEP` as a category also reads heart rate, resting heart rate, HRV, oxygen saturation and respiratory rate; `HealthConnectTypes.types(category)` lists what a category reads before you narrow it.
- GPS routes need `READ_EXERCISE_ROUTES`, which Health Connect grants only in Settings or its own route consent screen. The SDK never asks for it.

## 5. Background sync

`BackgroundSync.register` schedules a WorkManager run every 15 minutes (the platform minimum) when online, a run on each foreground and, from 2.2.1, on each time the person leaves the app, each at most every 15 minutes. A run stops after 8 minutes and continues next time. It returns `false` when another client with the same dev ID already owns background sync.

OEM battery managers (Xiaomi, Redmi, POCO and others) stop background work regardless of permissions. When `diagnostics.state()` is `BackgroundRestricted(OEM_RESTRICTED)` or `BackgroundRestricted(TICKS_NOT_RUNNING)`, show the person:

```kotlin
BackgroundSetup.oemSetupIntents(context).firstOrNull()?.let { activity.startActivity(it) }
```

Do not declare `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` or `QUERY_ALL_PACKAGES`; Play restricts both and the SDK does not need them.

## 6. Samsung Health directly

Start on Health Connect; add this only when you need every Samsung workout or data Health Connect does not carry.

1. Samsung must approve **your** app: submit a partner request with your package name and the SHA-256 of your signing certificate. Until approved, reads work only with Samsung Health developer mode on (Settings > About Samsung Health, tap the version number repeatedly).
2. Add `co.tryterra:terra-android-samsung` (same version as `terra-android`), Samsung's `samsung-health-data-api.aar` in `libs/`, and the runtime dependencies the [Samsung Health](https://docs.tryterra.co/mobile-sdks/samsung-health) page lists. `minSdk` 29.
3. Register the store and use its own launcher:

```kotlin
import co.tryterra.sdk.health.samsung.samsungHealth

terra = Terra(this, devId = BuildConfig.TERRA_DEV_ID, tokenProvider = { yourBackend.mintTerraToken() }) {
    samsungHealth()
}

// in onCreate
samsungLauncher = terra.on(Source.SAMSUNG_HEALTH).permissions.launcher(this)
// on tap
terra.connect(Source.SAMSUNG_HEALTH, EndUser.Reference(signedInUser.id))
terra.on(Source.SAMSUNG_HEALTH).permissions.request(
    read = setOf(DataCategory.DAILY, DataCategory.SLEEP, DataCategory.ACTIVITY),
    launcher = samsungLauncher,
)
```

The Samsung store reads only. With both sources connected, the SDK sends each record once (Samsung first, Health Connect fills gaps), but daily totals can appear under both sources.

## 7. Local reads, writes, troubleshooting

Reads go to Health Connect, never the network: `terra.daily.steps(TimeRange.Today)`, `terra.body.heartRate(TimeRange.LastHours(6))`, `terra.sleep.segments(TimeRange.LastDays(7))`, `terra.activity.workouts(TimeRange.Between(from, to))`. Reading an unrequested category throws `TerraError.AuthorizationNotDetermined`. `daily.steps` returns one total per day **per writing app**: do not add them up. Writes are `log` on `activity`, `body`, `daily`, `nutrition` and `sleep`, with `delete` on the returned handle. The SDK never reports deletions: a record deleted in Health Connect stays in Terra API.

| Symptom                                             | Fix                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `connect` throws `TokenRejected`                    | Token expired (three minutes) or reused. Mint inside the token provider     |
| `HealthDataUnavailable`                             | Install or update Health Connect from Google Play                           |
| `permissions.launcher` throws `TerraError.Platform` | Called after the activity started; move it to `onCreate`                    |
| "Incorrect health permission state" on every read   | Add the Android 14 `activity-alias`                                         |
| `BackgroundRefreshUnscheduled`                      | `BackgroundSync.register` never called or returned `false`                  |
| `BackgroundRestricted(BACKGROUND_READ_DENIED)`      | Declare `READ_HEALTH_DATA_IN_BACKGROUND` so the sheet asks for it           |
| `LinkRevoked`                                       | Call `connect` again with the same end user                                 |
| First sync only reaches 30 days                     | Declare `READ_HEALTH_DATA_HISTORY`; check `permissions.historyReadStatus()` |
