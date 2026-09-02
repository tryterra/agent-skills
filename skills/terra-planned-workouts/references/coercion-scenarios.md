# Coercion Scenarios

When a workout feature cannot be fully represented on a provider's platform, the Terra API makes adjustments and returns `coercion_warnings`. The workout is still created; some details may differ from what you requested. Coercion is a success path, not an error.

Live docs: https://docs.tryterra.co/planned-workouts-api/coercion-warnings

## Response Format

Each warning is an object with a `path` (the field that changed) and a `message` (what happened and why). Note that all Terra API IDs (`planned_workout_id`, `workout_id`) are serialized as JSON strings.

```json
{
  "status": "success",
  "planned_workout_id": "12345",
  "provider_workout_id": "garmin_abc123",
  "coercion_warnings": [
    {
      "path": "workout.sport",
      "message": "Unsupported sport type: yoga. Defaulting to OTHER."
    },
    {
      "path": "workout.step_blocks[1].steps[0].intensity_targets[1]",
      "message": "Secondary targets only supported for cycling and swimming. Target ignored."
    }
  ]
}
```

## Scenario Catalog

### Missing athlete parameters

A percentage target was used but its required parameter was not supplied at scheduling. The Terra API uses a provider default.

```json
{
  "path": "threshold_heart_rate",
  "message": "heart_rate_threshold_percentage target requires threshold_heart_rate parameter. Using provider default."
}
```

Fix: include the required parameter (`max_heart_rate`, `threshold_heart_rate`, `ftp`, or `threshold_speed`) in the `plan` request body.

### Unsupported sport type

The provider does not support the workout's sport; it is coerced to a default (often running or OTHER).

```json
{
  "path": "workout.sport",
  "message": "Unsupported sport type: strength. Defaulting to OTHER."
}
```

Impact: the workout is created but may display incorrectly on the device.

### Too many targets

The step has more targets than the provider supports. The first target is kept.

```json
{
  "path": "workout.step_blocks[0].steps[0].intensity_targets",
  "message": "Provider supports max 1 target per step. Using first target, ignoring 2 additional targets."
}
```

Fix: order targets so your most important one is first.

### Unsupported target type

The provider does not support the target type, so it is dropped.

```json
{
  "path": "workout.step_blocks[0].steps[0].intensity_targets[0].target_type",
  "message": "cadence targets not supported. Target ignored."
}
```

### Swimming pool length missing

A swimming workout has no pool length; the Terra API defaults to 25 meters.

```json
{
  "path": "workout.pool_length_meters",
  "message": "Pool length not provided for swimming workout. Defaulting to 25 meters."
}
```

Fix: set `pool_length_meters` in the template or the `plan` request.

### Unrecognized exercise name

A strength exercise name does not match Garmin's catalog. The name and category are omitted but weight is preserved and the step is still created.

```json
{
  "path": "workout.step_blocks[0].steps[0].strength.exercise_name",
  "message": "Exercise 'CUSTOM_EXERCISE' not found in Garmin catalog. Exercise name and category will be omitted."
}
```

Fix: use a recognized name (see references/exercise-reference.md). Note Hevy behaves differently: it creates a custom exercise automatically and only warns if the account's custom exercise limit is reached.

### Block completion coercion

The provider does not support the block's completion type; the block runs once.

```json
{
  "path": "workout.step_blocks[1].completion_condition",
  "message": "Time-based block completion not supported. Block will execute once."
}
```

### Target reinterpretation (Garmin threshold HR)

The provider keeps your values but interprets the target differently. Garmin only supports heart rate as a percentage of max HR, so threshold-percentage targets are re-labeled.

```json
{
  "path": "workout.step_blocks[0].steps[0].intensity_targets[0]",
  "message": "Garmin uses heart rate percentage of max HR, not threshold HR. The percentage values will be interpreted as % of max HR."
}
```

### Sync window (Zepp)

The workout is scheduled outside Zepp's 7-day window (today to today + 6 days). It is stored in Terra API's database but not pushed until it enters the window, and only when a subsequent write or delete for that user triggers a refresh. There is no background sync.

```json
{
  "path": "planned_date",
  "message": "workout date is outside Zepp's 7-day sync window; it will not appear on the device until it falls within range"
}
```

### Unsupported sport (Zepp)

Several sports map silently before this warning fires: trail running maps to TRAILRUN, mountain biking to CYCLING, and hiking/walking to RUNNING. Only sports with no mapping at all (e.g. strength) trigger the warning.

```json
{
  "path": "workout.sport",
  "message": "sport 'strength' not supported by Zepp, defaulting to 'RUNNING'. Supported sports: RUNNING, CYCLING, LAP_SWIMMING"
}
```

### Cadence as primary target (Zepp)

Cadence was given as the only target. Zepp supports cadence only as a secondary target.

```json
{
  "path": "workout.step_blocks[0].steps[0].intensity_targets[0].target_type",
  "message": "cadence is only supported as a secondary target on Zepp; provide a primary target (pace, power, heart_rate) alongside it"
}
```

Fix: add a primary target (heart rate, power, pace, or speed) and keep cadence as secondary.

### Swim stroke ignored (Zepp)

```json
{
  "path": "workout.step_blocks[0].steps[0].swimming.stroke_type",
  "message": "Zepp does not support stroke types, 'butterfly' will be ignored"
}
```

## Handling Patterns

How you respond to warnings is your choice. Three common approaches:

**Log for debugging.**

```python
response = create_planned_workout(workout_id, user_id, date, params)
for warning in response.get("coercion_warnings", []):
    logger.warning(f"Workout coercion: {warning['path']} - {warning['message']}")
```

**Surface to users** (optional, for user-facing apps).

```javascript
if (response.coercion_warnings?.length > 0) {
  showNotification({
    type: "info",
    message: "Some workout features were adjusted for your device.",
    details: response.coercion_warnings.map((w) => w.message),
  });
}
```

**Ignore if acceptable.** Many warnings are informational. If the workout still serves your use case, they are safe to ignore.

## Prevention Checklist

1. Check provider compatibility before building a workout (references/provider-compatibility.md).
2. Always provide athlete parameters for percentage-based targets.
3. Use single targets per step for maximum cross-provider compatibility.
4. Use recognized exercise names for strength training.
5. Set `pool_length_meters` for swimming workouts.
6. Stick to common intensity types: `warmup`, `active`, `rest`, `cooldown`.
