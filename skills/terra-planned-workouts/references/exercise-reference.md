# Exercise Reference

How `strength.exercise_name` is resolved. For the complete catalog of names (49 categories, 1,624 exercises), fetch the live page: https://docs.tryterra.co/planned-workouts-api/overview/garmin-exercise-reference.md

Live docs: https://docs.tryterra.co/planned-workouts-api/overview/exercise-reference

## Overview

For strength workouts on Garmin, exercise names are matched against Garmin's catalog of 1,600+ exercises (1,624 across 49 categories), which drives categorization and display on the device. The lookup matches full exercise names only; there is no fallback to category-level names like `BENCH_PRESS`. Providers that accept custom names (e.g. Hevy custom exercises) receive your input name verbatim.

## Name Normalization

Garmin lookup is flexible. The normalization process is:

1. Replace spaces with underscores.
2. Convert to UPPERCASE.
3. Look up in the exercise catalog.

Examples of how inputs resolve:

| Input | Normalized | Garmin | Hevy |
| ----- | ---------- | ------ | ---- |
| `BARBELL_BENCH_PRESS` | `BARBELL_BENCH_PRESS` | Found | Bench Press (Barbell) |
| `barbell_bench_press` | `BARBELL_BENCH_PRESS` | Found | Bench Press (Barbell) |
| `Barbell Bench Press` | `BARBELL_BENCH_PRESS` | Found | Bench Press (Barbell) |
| `barbell bench press` | `BARBELL_BENCH_PRESS` | Found | Bench Press (Barbell) |
| `Bench Press (Barbell)` | `BENCH_PRESS_(BARBELL)` | Not found | Bench Press (Barbell) |
| `Bench Press` | `BENCH_PRESS` | Not found (category names are not looked up) | Bench Press (Barbell) via alias |
| `Dumbbell Bench Press` | `DUMBBELL_BENCH_PRESS` | Found | Built-in Hevy template |
| `My Custom Exercise` | `MY_CUSTOM_EXERCISE` | Not found | Custom exercise created |

## Hevy Lookup Path

Garmin names work for Hevy too. Hevy tries, in order:

1. Garmin-style normalized name via the shared metadata registry (spaces to underscores, uppercased) – covers Garmin catalog names with built-in Hevy template IDs.
2. Hevy built-in lookup, which resolves exact display names (e.g. `Squat (Barbell)`) and short aliases (e.g. `Bench Press` maps to `Bench Press (Barbell)`) in one pass.
3. No match: a custom exercise is created.

## When a Name Is Not Found

**Garmin:**

- A coercion warning is returned.
- The exercise name and category are omitted from the Garmin workout.
- Weight data is preserved.
- The step is still created.

**Hevy:**

- A custom exercise template is created automatically on the user's Hevy account, titled with your raw input name.
- Muscle group and equipment are inferred from the shared metadata registry when the Garmin-normalized name is found there (e.g. a Garmin catalog name without a built-in Hevy template); otherwise they default to "other".
- A coercion warning is returned only if the user's custom exercise limit is reached (a 403 per exercise; the routine is still created with the remaining exercises).

**Other providers:** the name you send is used as-is. (Title-casing with spaces instead of underscores happens only on the read path, when importing workouts FROM Garmin and formatting its UPPER_CASE names for display.)

## Tips

1. Confirm a name exists before using it on Garmin: fetch https://docs.tryterra.co/planned-workouts-api/overview/garmin-exercise-reference.md and search it.
2. If one variation fails, try another (common variations often resolve).
3. Check coercion warnings; they tell you when a lookup failed.
4. Use descriptive fallbacks: non-Garmin providers show your text as-is.
