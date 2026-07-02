# Sport-Specific Examples

Copy-paste request payloads for each sport type. All bodies are the JSON sent to `POST /workouts`; schedule with `POST /workouts/{id}/plan?user_id=Y`.

Live docs: https://docs.tryterra.co/planned-workouts-api/overview/sport-specific-examples

## Running

### Interval run with HR targets

5min warmup, then 5x(3min @ 85-90% max HR, 2min easy), then 5min cooldown.

```json
{
  "name": "5x3min HR Intervals",
  "sport": "running",
  "step_blocks": [
    { "steps": [{ "completion_condition": {"type":"time","value":300}, "intensity_type": "warmup" }] },
    { "completion_condition": {"type":"reps","value":5},
      "steps": [
        { "completion_condition": {"type":"time","value":180}, "intensity_type": "active",
          "intensity_targets": [{"target_type":"heart_rate_max_percentage","value_low":85,"value_high":90}] },
        { "completion_condition": {"type":"time","value":120}, "intensity_type": "rest" }
      ] },
    { "steps": [{ "completion_condition": {"type":"time","value":300}, "intensity_type": "cooldown" }] }
  ]
}
```

Schedule with body: `{ "planned_date": "2026-02-10", "max_heart_rate": 185 }`

### Tempo run with pace target

20min @ 4:30-4:45/km (270-285 sec/km).

```json
{
  "name": "20min Tempo",
  "sport": "running",
  "step_blocks": [
    { "steps": [{ "completion_condition": {"type":"time","value":300}, "intensity_type": "warmup" }] },
    { "steps": [{ "completion_condition": {"type":"time","value":1200}, "intensity_type": "active",
        "intensity_targets": [{"target_type":"pace","value_low":270,"value_high":285}] }] },
    { "steps": [{ "completion_condition": {"type":"time","value":300}, "intensity_type": "cooldown" }] }
  ]
}
```

## Cycling

### FTP intervals

4x8min @ 95-100% FTP with 4min recovery.

```json
{
  "name": "4x8min FTP",
  "sport": "cycling",
  "step_blocks": [
    { "steps": [{ "completion_condition": {"type":"time","value":600}, "intensity_type": "warmup",
        "intensity_targets": [{"target_type":"power_percentage","value_low":50,"value_high":60}] }] },
    { "completion_condition": {"type":"reps","value":4},
      "steps": [
        { "completion_condition": {"type":"time","value":480}, "intensity_type": "active",
          "intensity_targets": [{"target_type":"power_percentage","value_low":95,"value_high":100}] },
        { "completion_condition": {"type":"time","value":240}, "intensity_type": "rest",
          "intensity_targets": [{"target_type":"power_percentage","value_low":40,"value_high":50}] }
      ] },
    { "steps": [{ "completion_condition": {"type":"time","value":600}, "intensity_type": "cooldown" }] }
  ]
}
```

Schedule with body: `{ "planned_date": "2026-02-10", "ftp": 280 }`

### Indoor cycling with cadence

Stationary bike, alternating high and low cadence. Note two targets per step (power + cadence); this is only supported on some providers (see references/provider-compatibility.md).

```json
{
  "name": "Cadence Drills",
  "sport": "cycling",
  "environment": "indoor",
  "step_blocks": [{
    "completion_condition": {"type":"reps","value":3},
    "steps": [
      { "completion_condition": {"type":"time","value":120}, "intensity_type": "active", "notes": "High cadence",
        "intensity_targets": [
          {"target_type":"power_percentage","value_low":70,"value_high":80},
          {"target_type":"cadence","value_low":100,"value_high":110}
        ] },
      { "completion_condition": {"type":"time","value":120}, "intensity_type": "active", "notes": "Low cadence / strength",
        "intensity_targets": [
          {"target_type":"power_percentage","value_low":70,"value_high":80},
          {"target_type":"cadence","value_low":60,"value_high":70}
        ] }
    ]
  }]
}
```

## Swimming

### Lap swimming with strokes

Pool workout with stroke-specific intervals.

```json
{
  "name": "Mixed Stroke Workout",
  "sport": "swimming",
  "environment": "pool",
  "pool_length_meters": 25,
  "step_blocks": [
    { "steps": [{ "completion_condition": {"type":"distance","value":200}, "intensity_type": "warmup",
        "swimming": {"stroke_type":"freestyle"} }] },
    { "completion_condition": {"type":"reps","value":4},
      "steps": [
        { "completion_condition": {"type":"distance","value":50}, "intensity_type": "active",
          "swimming": {"stroke_type":"butterfly"} },
        { "completion_condition": {"type":"distance","value":50}, "intensity_type": "rest",
          "swimming": {"stroke_type":"backstroke"} }
      ] },
    { "steps": [{ "completion_condition": {"type":"distance","value":200}, "intensity_type": "cooldown",
        "swimming": {"stroke_type":"freestyle"} }] }
  ]
}
```

### Swimming with equipment

```json
{
  "completion_condition": {"type":"distance","value":100},
  "intensity_type": "active",
  "swimming": { "stroke_type": "freestyle", "equipment": ["swim_paddles","swim_pull_buoy"] }
}
```

- Available strokes: `freestyle`, `backstroke`, `breaststroke`, `butterfly`, `mixed`, `drill`, `im`.
- Available equipment: `swim_kickboard`, `swim_paddles`, `swim_pull_buoy`, `swim_fins`, `swim_snorkel`.

## Strength Training

3 sets each of bench press, rows, and shoulder press. Each exercise is its own block; the block's reps are the set count, the step's reps are the reps per set. See references/garmin-exercises.md for valid `exercise_name` values.

```json
{
  "name": "Upper Body",
  "sport": "strength",
  "step_blocks": [
    { "completion_condition": {"type":"reps","value":3},
      "steps": [{ "completion_condition": {"type":"reps","value":10}, "intensity_type": "active", "notes": "Bench Press",
        "strength": {"exercise_name":"BARBELL_BENCH_PRESS","weight":60,"weight_display_unit":"kg"} }] },
    { "completion_condition": {"type":"reps","value":3},
      "steps": [{ "completion_condition": {"type":"reps","value":12}, "intensity_type": "active", "notes": "Rows",
        "strength": {"exercise_name":"BENT_OVER_ROW","weight":50,"weight_display_unit":"kg"} }] },
    { "completion_condition": {"type":"reps","value":3},
      "steps": [{ "completion_condition": {"type":"reps","value":10}, "intensity_type": "active", "notes": "Shoulder Press",
        "strength": {"exercise_name":"OVERHEAD_PRESS","weight":40,"weight_display_unit":"kg"} }] }
  ]
}
```

Exercise names are flexible: `BARBELL_BENCH_PRESS`, `barbell_bench_press`, `Barbell Bench Press`, and `barbell bench press` all resolve.

## Multi-Sport (Triathlon / Brick)

There is no single multi-sport template. Create separate templates per sport and schedule them on the same day.

```bash
# Bike portion
POST /workouts/bike_intervals/plan?user_id=X   { "planned_date": "2026-02-10", "ftp": 250 }
# Run portion
POST /workouts/brick_run/plan?user_id=X        { "planned_date": "2026-02-10", "max_heart_rate": 180 }
```
