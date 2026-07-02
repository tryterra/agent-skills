# Provider Compatibility

Not all providers support all features or operations. When a feature is not supported, the Terra API returns a coercion warning but still creates the workout. See references/coercion-scenarios.md for warning handling.

Live docs: https://docs.tryterra.co/planned-workouts-api/overview/provider-compatibility

## Operations Support

Which providers support create, update, retrieve, and delete of planned workouts.

| Operation | Garmin | COROS | Wahoo | Suunto | TrainingPeaks | Huawei | Zepp | Hevy | Apple |
| --------- | ------ | ----- | ----- | ------ | ------------- | ------ | ---- | ---- | ----- |
| Create    | yes    | yes   | yes   | yes    | yes           | yes    | yes  | yes  | yes   |
| Update    | yes    | yes*  | yes   | yes    | yes           | no†    | yes§ | yes  | yes   |
| Retrieve  | yes‡   | no    | yes   | yes    | yes           | no     | no   | yes  | no    |
| Delete    | yes    | yes   | yes   | yes    | yes           | no     | yes  | no   | yes   |

- \* COROS has no in-place update. Updates delete the old workout and create a new one (the `provider_workout_id` changes).
- † Huawei cannot update workout content on the device. An update changes only the planned date in Terra API's database; the device workout is unchanged.
- ‡ Garmin only returns workouts created by your application's API credentials. Workouts from other apps or created on the device do not appear.
- § Zepp uses a 7-day sync window. Updates replace all workouts within the current window on the device.

**When an operation is not supported the API still returns success.** For deletes, the workout is removed from Terra API's database but remains on the device. For retrieves, only workouts stored in Terra API's database are returned, not workouts from the provider.

## Feature Matrix

`yes` = supported natively or via Terra API conversion. `no` = not supported (coercion warning). Notes below the table.

### Sports

| Sport              | Garmin | COROS | Wahoo | Suunto | TrainingPeaks | Huawei | Zepp | Hevy | Apple |
| ------------------ | ------ | ----- | ----- | ------ | ------------- | ------ | ---- | ---- | ----- |
| Running            | yes    | yes   | yes   | yes    | yes           | yes    | yes  | no   | yes   |
| Cycling            | yes    | yes   | yes   | yes    | yes           | no     | yes  | no   | yes   |
| Swimming           | yes    | yes   | no    | yes    | yes           | no     | yes  | no   | yes   |
| Strength           | yes    | yes   | no    | yes    | yes           | no     | no   | yes  | yes   |
| Trail Running      | yes    | yes   | yes   | yes    | no            | no     | yes  | no   | no    |
| Mountain Biking    | yes    | yes‖  | yes   | yes    | yes           | no     | no‖  | no   | no    |
| Backcountry Skiing | yes    | no‖   | no    | yes    | no            | no     | no   | no   | no    |

- ‖ Silent fallback with **no** coercion warning: COROS pushes Mountain Biking as its generic bike sport and Backcountry Skiing as a run; Zepp pushes Mountain Biking as CYCLING.

### Targets

| Target            | Garmin | COROS | Wahoo | Suunto | TrainingPeaks | Huawei | Zepp | Hevy | Apple |
| ----------------- | ------ | ----- | ----- | ------ | ------------- | ------ | ---- | ---- | ----- |
| Heart Rate (BPM)  | yes    | yes   | yes   | yes    | yes*          | yes    | yes  | no   | yes   |
| HR % of Max       | yes    | yes   | yes   | yes*   | yes           | yes*   | yes* | no   | yes   |
| HR % of Threshold | yes    | yes   | yes   | yes*   | yes           | yes*   | yes* | no   | yes   |
| HR Zones          | yes    | yes†  | yes†  | yes†   | yes†          | yes†   | yes† | no   | yes   |
| Power (Watts)     | yes    | yes   | yes   | yes    | yes*          | no     | yes  | no   | yes   |
| Power % FTP       | yes    | yes   | yes   | yes*   | yes           | no     | yes* | no   | yes   |
| Power Zones       | yes    | yes†  | yes†  | yes†   | yes†          | no     | yes† | no   | yes   |
| Pace              | yes    | yes   | yes   | yes    | yes*          | yes    | yes  | no   | yes   |
| Speed             | yes    | yes   | yes   | yes    | yes*          | yes    | yes  | no   | yes   |
| Cadence           | yes    | yes   | yes   | yes    | yes           | yes    | yes¶ | no   | yes   |
| RPE               | no     | no    | yes   | no     | yes           | no     | no   | no   | no    |

### Completion Conditions

| Condition     | Garmin | COROS | Wahoo | Suunto | TrainingPeaks | Huawei | Zepp | Hevy | Apple |
| ------------- | ------ | ----- | ----- | ------ | ------------- | ------ | ---- | ---- | ----- |
| Time          | yes    | yes   | yes   | yes    | yes           | yes    | yes  | yes  | yes   |
| Distance      | yes    | yes   | yes   | yes    | yes           | yes    | yes  | yes  | yes   |
| Reps          | yes    | yes   | no    | no     | yes           | yes    | yes  | yes  | no    |
| Calories      | yes    | no    | no    | no     | no            | yes    | no   | no   | yes   |
| HR Trigger    | yes    | no    | no    | no     | no            | no     | no   | no   | no    |
| Power Trigger | yes    | no    | no    | no     | no            | no     | no   | no   | no    |

### Structure

| Feature               | Garmin                    | COROS | Wahoo | Suunto | TrainingPeaks | Huawei | Zepp              | Hevy | Apple |
| --------------------- | ------------------------- | ----- | ----- | ------ | ------------- | ------ | ----------------- | ---- | ----- |
| Multiple targets/step | yes (2, cycling/swimming) | no    | yes   | yes    | no            | no     | yes (1 + cadence) | no   | no    |
| Block repeats         | yes                       | yes   | yes   | yes    | yes           | yes    | yes               | no   | yes   |
| Exercise names        | yes                       | yes   | no    | yes    | yes           | no     | no                | yes  | no    |
| Swim strokes          | yes                       | yes   | no    | yes    | no            | no     | no                | no   | no    |

**Table notes:**

- \* Converted by Terra API. TrainingPeaks converts absolute values to percentages using the athlete profile. Suunto, Huawei, and Zepp convert percentage targets to absolute values using provided athlete parameters or defaults.
- † Zone targets converted by Terra API. HR zones (1-5) and power zones (1-7) convert to each provider's native format. HR zones use **threshold HR** as baseline for COROS and Zepp, and **max HR** for Wahoo, TrainingPeaks, Suunto, and Huawei. Power zones use FTP for all providers that support them. Output format varies: percentage (COROS, Wahoo, TrainingPeaks) or absolute BPM/watts (Suunto, Huawei, Zepp).
- ¶ Cadence is only supported as a secondary target on Zepp, and must be paired with a primary target (heart rate, power, pace, or speed).

## Provider Details

### Garmin

Most complete support. Handles nearly all workout features. Supports create, update, retrieve, and delete.

- **Strengths:** full strength training with exercise categories; swimming with stroke types and equipment; up to 2 targets per step (cycling/swimming); HR and power trigger completions; all completion condition types.
- **Limitations:** time-based steps inside time-based repeat blocks get unwrapped; exercise names must match Garmin's catalog; only one equipment item per swimming step (if multiple are provided, the first is used and a coercion warning is returned); retrieve only returns workouts created by your app.
- **Special behaviors:** single values get a ±5% range; HR threshold percentage converts to max HR percentage with a warning; pool length defaults to 25m if not provided.

### COROS

Good support for endurance sports. Supports create, update (via delete + recreate), and delete. No retrieve.

- **Strengths:** running, cycling, swimming, strength; HR and power percentage targets; equipment encoded in step names.
- **Limitations:** single target per step only (extras ignored); block completion only supports reps; no HR/power trigger completions; drill stroke type not supported; no retrieve support (the COROS API has no fetch endpoint).
- **Special behaviors:** single values get a ±5% range; weight converted to grams internally; stroke/equipment added to step name in brackets; updates delete the old workout and create a new one, so `provider_workout_id` changes.

### Wahoo

Focused on cycling and running.

- **Strengths:** excellent power zone support; RPE targets; multiple targets per step; grade control for smart trainers.
- **Limitations:** no swimming; no strength training.
- **Special behaviors:** percentage targets divided by 100 for the API; single values expanded ±5%; steps without intensity targets get an RPE fallback coercion.

### Suunto

Solid multi-sport support.

- **Strengths:** wide sport type support; swimming with stroke metadata; strength with exercise text; percentage targets converted to absolute values using athlete parameters.
- **Limitations:** no controls support; workout names truncated to 60 characters; step names truncated to 13 characters; descriptions truncated to 256 characters (the short description shown on the watch, derived from the workout **name**, is truncated to 23 characters).
- **Special behaviors:** all intensity targets on a step are emitted (multiple targets per step supported); cadence converted from RPM to Hz (÷60); manual lap trigger for open/reps completion; percentage targets (HR %, power %, speed %) resolved to absolute values using provided athlete parameters or defaults.

### TrainingPeaks

Training platform integration.

- **Strengths:** RPE support; wide sport coverage (unlisted sports map to "other" with a coercion warning); integrates with athlete profile for conversions.
- **Limitations:** single target per step; no stroke type support.
- **Special behaviors:** absolute HR converted to % using the athlete's max HR from request, then the TrainingPeaks profile, then defaults; absolute power converted to % using FTP from request, then profile, then defaults; reps estimated as 4 sec/rep (minimum 30 sec); missing profile data falls back to defaults with a coercion warning.

### Huawei

Running workouts only. Create only. No update, retrieve, or delete on the device.

- **Strengths:** heart rate targets (absolute BPM, max %, threshold %, zones); pace and speed targets (converted to milliseconds per kilometer); cadence targets (as "steps rate"); calorie-based completion; block repeats via ActionCombine.
- **Limitations:** running only (other sports get a warning and appear as a run); no power targets; single target per step (first prioritized target used); no strength or swimming; no retrieve (no fetch endpoint); no delete (delete removes the Terra API record but the device workout remains); no update (only changes the planned date in Terra API's DB); no planned-date support (the workout is available immediately regardless of `planned_date`, and a coercion warning is always returned).
- **Special behaviors:** pace stored as milliseconds per kilometer internally; HR zones converted to absolute BPM via max HR; cooldown and recovery both map to Huawei's "Relax" action with a warning; single values expanded ±5%; step-level reps converted to separate repeating ActionCombine blocks; unique workout names enforced per user (duplicates return 400); Huawei may return a 500 "createWorkout error" but still create the workout, in which case `provider_workout_id` is empty and a coercion warning is returned.

### Zepp

Endurance sports with a sync-window constraint. Supports create, update, and delete. No retrieve.

- **Strengths:** running, cycling, swimming; full HR and power target coverage including zones and percentages; cadence as a secondary target; block repeats; pace targets auto-converted from sec/km to m/s.
- **Limitations:** no strength; no swim stroke types (ignored with warning); no equipment weight targets (ignored with warning); no controls; no retrieve (no fetch endpoint); **7-day sync window** – workouts only appear when scheduled within today to today + 6 days. Out-of-window workouts are stored in Terra API's database but not pushed until a later write or delete for that user triggers a window refresh. There is no automatic background sync.
- **Special behaviors:** full window replacement (every write or delete re-syncs the entire 7-day window); out-of-window workouts return a warning but are still stored; unsupported sports default to RUNNING with a warning; missing completion conditions default to 60 seconds; cadence only as a secondary target (a warning is returned if it is the only target); step-level reps wrapped in repeat blocks; single values expanded ±5%.

### Hevy

Strength training routines only. Supports create, update, and retrieve. No delete on the provider.

- **Strengths:** full exercise name resolution (Garmin UPPER_CASE names, Hevy display names, and short aliases all resolve to built-in Hevy template IDs); exercise metadata enrichment (custom exercises get muscle group, equipment category, and type inferred from the shared metadata registry); weight unit conversion (lbs to kg); duration-based and distance-based sets alongside weight/reps.
- **Limitations:** strength only (other sports produce a warning but exercises are still pushed as a routine); no HR, power, pace, speed, or cadence targets; no RPE (silently dropped with a warning); no block repeats (each block maps to one exercise, each step to one set); no planned-date support (the routine appears in the library immediately, and routines are not tied to a date so "update planned date" has no provider-side effect); no delete (removes the Terra API record but the routine stays in the Hevy account).
- **Special behaviors:** updates are supported – when a `provider_workout_id` exists, the existing Hevy routine is updated in place (title, notes, exercises); if the user's Hevy account hits the custom exercise limit, a 403 is returned per exercise with a warning and the routine is still created with the remaining exercises; muscle group and equipment for custom exercises are inferred from the shared exercise metadata registry when the Garmin-normalized name is found there, otherwise they default to "other".

### Apple

Workouts sync via the Terra iOS SDK: the server queues the sync action, the SDK polls, pushes to WorkoutKit, and reports back.

- **Strengths:** heart rate targets (absolute BPM, % max, % threshold, zones); power targets (absolute watts, % FTP, zones); pace and speed targets; cadence targets; calorie-based completion; block repeats via IntervalBlock iterations.
- **Limitations:** single target per step (extras dropped with a warning); single warmup and single cooldown per workout (WorkoutKit supports one of each; extras dropped with a warning); no exercise names (WorkoutKit steps are goals and alerts, so strength is limited to timed interval blocks, not sets/reps); no swim stroke types; no RPE; no multiple targets per step; no retrieve (no server-side WorkoutKit read API).
- **Special behaviors:** the SDK reports the WorkoutKit UUID via `POST /v2/plannedWorkouts/{id}/synced`, stored as `provider_workout_id`; until the SDK syncs, `provider_workout_id` is `null`; unsupported sports (pilates, cardio, trail running, mountain biking, backcountry skiing) map to the generic "other" activity with a warning.

## Best Practices

1. Design for Garmin first (most complete support).
2. Use percentage targets for better cross-provider compatibility.
3. Check coercion warnings to know what was modified.
4. Test on target devices to verify appearance.
5. Keep step names short (some providers truncate).
