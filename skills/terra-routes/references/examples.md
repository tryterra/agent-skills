# Examples

Copy-paste curl for Terra API Routes (pre-release). Every example follows the two-step flow: create the template, then push it to a user. Base URL is `https://access.tryterra.co/api/v2`; all requests need the `dev-id` and `x-api-key` headers. Source: [sport-specific examples](https://docs.tryterra.co/routes-api-pre-release/sport-specific-examples).

Push any created template with:

```bash
curl -X POST "https://access.tryterra.co/api/v2/routes/{route_id}/push?user_id=USER_ID" \
  -H "dev-id: YOUR_DEV_ID" \
  -H "x-api-key: YOUR_API_KEY"
```

## Running: city loop with elevation

```bash
curl -X POST "https://access.tryterra.co/api/v2/routes" \
  -H "Content-Type: application/json" \
  -H "dev-id: YOUR_DEV_ID" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "name": "London 5K Loop",
    "sport": "running",
    "elevation_gain_meters": 45,
    "elevation_loss_meters": 45,
    "waypoints": [
      { "latitude": 51.5074, "longitude": -0.1278, "elevation_meters": 12 },
      { "latitude": 51.5100, "longitude": -0.1240, "elevation_meters": 20 },
      { "latitude": 51.5130, "longitude": -0.1200, "elevation_meters": 35 },
      { "latitude": 51.5150, "longitude": -0.1160, "elevation_meters": 50 },
      { "latitude": 51.5120, "longitude": -0.1130, "elevation_meters": 42 },
      { "latitude": 51.5090, "longitude": -0.1160, "elevation_meters": 28 },
      { "latitude": 51.5074, "longitude": -0.1278, "elevation_meters": 12 }
    ]
  }'
```

## Trail running: mountain trail with course points (Garmin only)

Course points render on Garmin and are silently ignored by COROS and Wahoo.

```bash
curl -X POST "https://access.tryterra.co/api/v2/routes" \
  -H "Content-Type: application/json" \
  -H "dev-id: YOUR_DEV_ID" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "name": "Alpine Trail Loop",
    "sport": "trail_running",
    "elevation_gain_meters": 650,
    "elevation_loss_meters": 650,
    "waypoints": [
      { "latitude": 46.0000, "longitude": 7.0000, "elevation_meters": 1200 },
      { "latitude": 46.0100, "longitude": 7.0100, "elevation_meters": 1350 },
      {
        "latitude": 46.0200,
        "longitude": 7.0200,
        "elevation_meters": 1600,
        "course_point": { "type": "summit", "name": "Col du Sommet" }
      },
      { "latitude": 46.0300, "longitude": 7.0300, "elevation_meters": 1500 },
      {
        "latitude": 46.0350,
        "longitude": 7.0350,
        "elevation_meters": 1400,
        "course_point": { "type": "water", "name": "Stream Crossing" }
      },
      { "latitude": 46.0300, "longitude": 7.0400, "elevation_meters": 1300 },
      { "latitude": 46.0000, "longitude": 7.0000, "elevation_meters": 1200 }
    ]
  }'
```

## Hiking: day hike with food and water stops

```bash
curl -X POST "https://access.tryterra.co/api/v2/routes" \
  -H "Content-Type: application/json" \
  -H "dev-id: YOUR_DEV_ID" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "name": "Peak District Day Hike",
    "sport": "hiking",
    "elevation_gain_meters": 480,
    "elevation_loss_meters": 480,
    "waypoints": [
      { "latitude": 53.3700, "longitude": -1.8300, "elevation_meters": 280 },
      { "latitude": 53.3780, "longitude": -1.8200, "elevation_meters": 380 },
      {
        "latitude": 53.3850,
        "longitude": -1.8100,
        "elevation_meters": 450,
        "course_point": { "type": "food", "name": "Lunch Spot" }
      },
      {
        "latitude": 53.3920,
        "longitude": -1.8000,
        "elevation_meters": 510,
        "course_point": { "type": "summit", "name": "Kinder Scout" }
      },
      { "latitude": 53.3870, "longitude": -1.7900, "elevation_meters": 430 },
      {
        "latitude": 53.3800,
        "longitude": -1.8000,
        "elevation_meters": 350,
        "course_point": { "type": "water", "name": "Edale Stream" }
      },
      { "latitude": 53.3700, "longitude": -1.8300, "elevation_meters": 280 }
    ]
  }'
```

## Road biking: sportive with a speed target (Garmin only)

`speed_meters_per_second` is honored on Garmin and silently ignored elsewhere. Recommended range is 0-15 m/s.

```bash
curl -X POST "https://access.tryterra.co/api/v2/routes" \
  -H "Content-Type: application/json" \
  -H "dev-id: YOUR_DEV_ID" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "name": "Surrey Hills 80K",
    "sport": "road_biking",
    "elevation_gain_meters": 1200,
    "elevation_loss_meters": 1200,
    "speed_meters_per_second": 9.0,
    "waypoints": [
      { "latitude": 51.2300, "longitude": -0.3500, "elevation_meters": 50 },
      { "latitude": 51.2200, "longitude": -0.3200, "elevation_meters": 120 },
      {
        "latitude": 51.2100,
        "longitude": -0.2900,
        "elevation_meters": 220,
        "course_point": { "type": "danger", "name": "Sharp Descent" }
      },
      { "latitude": 51.2000, "longitude": -0.2600, "elevation_meters": 180 },
      {
        "latitude": 51.1900,
        "longitude": -0.2800,
        "elevation_meters": 250,
        "course_point": { "type": "summit", "name": "Box Hill" }
      },
      { "latitude": 51.2100, "longitude": -0.3100, "elevation_meters": 130 },
      { "latitude": 51.2300, "longitude": -0.3500, "elevation_meters": 50 }
    ]
  }'
```

## Minimal route (2 waypoints)

The smallest valid route: 2 waypoints, no elevation. Elevation is auto-computed when absent, with provider-dependent handling.

```bash
curl -X POST "https://access.tryterra.co/api/v2/routes" \
  -H "Content-Type: application/json" \
  -H "dev-id: YOUR_DEV_ID" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "name": "Quick Out-and-Back",
    "sport": "running",
    "waypoints": [
      { "latitude": 51.5074, "longitude": -0.1278 },
      { "latitude": 51.5150, "longitude": -0.1200 }
    ]
  }'
```

## Cascade update to all devices

Update the template metadata and re-push to every device it was sent to. Returns `202 Accepted`; the re-push runs asynchronously and any per-device failures are logged, not returned.

```bash
curl -X PUT "https://access.tryterra.co/api/v2/routes/295581149349019648?cascade" \
  -H "Content-Type: application/json" \
  -H "dev-id: YOUR_DEV_ID" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "name": "London 5K Loop (revised)", "elevation_gain_meters": 60 }'
```
