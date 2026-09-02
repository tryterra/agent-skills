# React Native – terra-react

Cross-platform integration for **Apple Health** (iOS), **Samsung Health**, and **Health Connect** (Android). Source: [docs.tryterra.co/unified-api/mobile-only-sources/react-native](https://docs.tryterra.co/unified-api/mobile-only-sources/react-native).

## 1. Install and native setup

```bash
npm install terra-react
```

Then complete the native setup for each platform you target.

### iOS setup

1. `cd ios && pod install`.
2. Add **Capabilities**: HealthKit > HealthKit Background Delivery; Background Modes > Background processing; Background Modes > Background fetch.
3. Add to `info.plist` (via Xcode or directly):
   ```xml
   <key>BGTaskSchedulerPermittedIdentifiers</key>
   <array>
     <string>co.tryterra.data.post.request</string>
   </array>
   <key>NSHealthClinicalHealthRecordsShareUsageDescription</key>
   <string>Using TerraiOS to gather health data</string>
   <key>NSHealthShareUsageDescription</key>
   <string>Using TerraiOS as a means of getting Health Data</string>
   <key>NSHealthUpdateUsageDescription</key>
   <string>Allow writing data to health kit</string>
   ```
   (usage-description strings must be at least 3 words).

### Android setup

Same as native Android (see `references/android.md`): minSDK 28, and either the Samsung route (apply for the partnership, install the Samsung-tagged package with `npm install terra-react@<samsung-version>`, add the ProGuard rule `-keep class com.samsung.android.** { *; }`, enable Developer Mode) or the Health Connect route (grant permissions in the Health Connect app, add the privacy-policy `<activity>` intent-filters to `AndroidManifest.xml`, apply to Google before release).

## 2. Initialize (once on app start, and on every foreground)

`initTerra` is asynchronous and a prerequisite for all other SDK calls.

```tsx
import { initTerra } from "terra-react";

const initializeTerra = async () => {
  try {
    const successMessage = await initTerra("YOUR_DEV_ID", "YOUR_REFERENCE_ID");
    if (successMessage.error !== null) {
      throw new Error("Terra manager failed to initialise");
    }
    // ready for other terra-react methods
  } catch (error) {
    console.error("Failed to initialize Terra:", error);
  }
};
```

## 3. Connect with initConnection

Mint the single-use token from your backend first (`POST https://api.tryterra.co/v2/auth/generateAuthToken` with `dev-id` + `x-api-key`). The token expires in 3 minutes, so mint it just-in-time, not at app start.

```tsx
import { Connections, initConnection } from "terra-react";

const initializeConnection = async () => {
  try {
    const token = "example_token"; // from your backend
    const successMessage = await initConnection(
      Connections.APPLE_HEALTH, // or SAMSUNG / HEALTH_CONNECT
      token,
      true, // schedulerOn
      [], // customPermissions – empty = all
    );
    if (successMessage.error !== null) {
      throw new Error("Error initialising a connection");
    }
  } catch (error) {
    console.error("Connection failed:", error);
  }
};
```

- `type`: `Connections.APPLE_HEALTH`, `Connections.SAMSUNG`, or `Connections.HEALTH_CONNECT`.
- `schedulerOn`: **no effect on iOS** (background delivery is via `setUpBackgroundDelivery`); on Android, `true` enables foreground scheduled requests.
- `customPermissions`: see [Permissions mapping](https://docs.tryterra.co/unified-api/mobile-only-sources).

Popup behavior: Apple Health and Health Connect show the popup once (re-triggers only on expanded `customPermissions`, reinstall, or – Health Connect – a permission Google has not approved). The HealthKit popup is a WebView; WebView-based apps must interrupt their WebView, call `initConnection`, then reopen.

## 4. Validate with getUserId on every re-init

```tsx
import { getUserId, Connections } from "terra-react";
// returns the user_id or null; on null, call initConnection again
```

## 5. Background delivery (iOS only)

In your `/ios` `AppDelegate.m`, call `setUpBackgroundDelivery` in `didFinishLaunchingWithOptions`:

```objectivec
#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <TerraiOS/TerraiOS-Swift.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"AwesomeProject";
  self.initialProps = @{};
  [Terra setUpBackgroundDelivery];
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}
@end
```

Delivery constraints and per-category `customPermissions` requirements are in SKILL.md.

## 6. Filtering by source app (iOS, optional)

`setIgnoredSources` skips named HealthKit source apps (to avoid duplicates when a cloud Terra API connection and that provider's companion app both sync into Apple Health). Call it after every `initTerra`; **not persisted across restarts**. No-op on Android.

```tsx
import { setIgnoredSources } from "terra-react";
setIgnoredSources(["com.whoop.app", "com.garmin.connect.mobile"]);
```

## Historical data and disconnect

```tsx
import { Connections, getDaily } from "terra-react";

const requestData = async () => {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 1);
  const dataMessage = await getDaily(
    Connections.APPLE_HEALTH,
    startDate,
    endDate,
    false,
  );
  if (dataMessage.error !== null) throw new Error("Failed to get data");
  if (dataMessage.success) console.log("Daily data:", dataMessage.data);
};
```

Set the final `toWebhook` argument to `false` to receive the payload in the response. Disconnect via the same backend endpoint as web integrations (`DELETE /auth/deauthenticateUser`).

## Writing data (Apple Health only)

`postActivity` writes into Apple Health (Health Connect writes are not yet supported). **`device_data` is required** – the write fails without it.

```tsx
import { Activity, postActivity, Connections } from "terra-react";

const activityPayload: Activity = {
  metadata: {
    name: "Morning Run",
    start_time: "...",
    end_time: "...",
    type: 8 /* RUNNING */,
  },
  device_data: { name: "Terra" }, // required
};
const resp = await postActivity(Connections.APPLE_HEALTH, activityPayload);
```

Fetch [docs.tryterra.co/unified-api/mobile-only-sources/react-native.md](https://docs.tryterra.co/unified-api/mobile-only-sources/react-native.md) for the full payload fields, function list, and `ActivityType` enum when building the request body.
