# Exercise Reference

How `strength.exercise_name` is resolved. For the complete catalog of names (49 categories, 1,624 exercises), fetch the live page: https://docs.tryterra.co/planned-workouts-api/overview/garmin-exercise-reference.md

Live docs: https://docs.tryterra.co/planned-workouts-api/overview/exercise-reference

## Overview

For strength workouts on Garmin, exercise names are matched against Garmin's catalog of 1,600+ exercises (1,624 across 49 categories), which drives categorization and display on the device. For other providers that accept custom names, the name is title-cased and underscores are converted to spaces.

## Name Normalization

Garmin lookup is flexible. The normalization process is:

1. Replace spaces with underscores.
2. Convert to UPPERCASE.
3. Look up in the exercise catalog.

So all of these resolve to the same `BARBELL_BENCH_PRESS`:

| Input | Normalized | Garmin | Hevy |
| ----- | ---------- | ------ | ---- |
| `BARBELL_BENCH_PRESS` | `BARBELL_BENCH_PRESS` | Found | Bench Press (Barbell) |
| `barbell_bench_press` | `BARBELL_BENCH_PRESS` | Found | Bench Press (Barbell) |
| `Barbell Bench Press` | `BARBELL_BENCH_PRESS` | Found | Bench Press (Barbell) |
| `barbell bench press` | `BARBELL_BENCH_PRESS` | Found | Bench Press (Barbell) |
| `Bench Press (Barbell)` | `BENCH_PRESS_(BARBELL)` | Not found | Bench Press (Barbell) |
| `Bench Press` | `BENCH_PRESS` | Found (category) | Bench Press (Barbell) via alias |
| `My Custom Exercise` | `MY_CUSTOM_EXERCISE` | Not found | Custom exercise created |

## Hevy Lookup Path

Garmin names work for Hevy too. Hevy tries, in order:

1. Exact Hevy display name (e.g. `Squat (Barbell)`).
2. Short name alias (e.g. `Bench Press` maps to `Bench Press (Barbell)`).
3. Garmin-style normalized name via the shared metadata registry.

## When a Name Is Not Found

**Garmin:**

- A coercion warning is returned.
- The exercise name and category are omitted from the Garmin workout.
- Weight data is preserved.
- The step is still created.

**Hevy:**

- A custom exercise template is created automatically on the user's Hevy account.
- Muscle group and equipment are inferred from the name where possible (via the Garmin exercise→category mapping, e.g. "Bench Press" → BENCH_PRESS → chest).
- A coercion warning is returned only if the user's custom exercise limit is reached (a 403 per exercise; the routine is still created with the remaining exercises).

**Other providers:** the name is displayed as Title Case With Spaces Instead Of Underscores, regardless of input format.

## Tips

1. Confirm a name exists before using it on Garmin: fetch https://docs.tryterra.co/planned-workouts-api/overview/garmin-exercise-reference.md and search it.
2. If one variation fails, try another (common variations often resolve).
3. Check coercion warnings; they tell you when a lookup failed.
4. Use descriptive fallbacks: non-Garmin providers show your text as-is.
