# Provider Details

Per-provider behavior for Terra API Routes (pre-release). Only Garmin, COROS, and Wahoo are supported. When an operation is not supported by a provider, the API still returns a success response, so absence of an error does not prove the route changed on the device. Source: [provider compatibility](https://docs.tryterra.co/routes-api-pre-release/provider-compatibility).

## Garmin

Most complete support; design routes for Garmin first.

- **Wire format**: JSON.
- **Sports**: every sport type maps to a native Garmin course activity type.
- **Features**: course points (all 10 POI types), `speed_meters_per_second` speed target, and `description` are all supported here and nowhere else.
- **Re-sync**: a re-sync issues a `PUT`, and falls back to `POST` if the route is missing on Garmin's side. This makes cascade re-pushes resilient to a route that was deleted on the device.
- **Elevation normalization**: Garmin requires elevation on all waypoints or none. If waypoint elevation is mixed, Terra API drops all elevation values and lets Garmin's elevation model fill them in. Elevation inconsistencies are normalised automatically.
- **Hard error**: an unsupported course-point type returns an error (not a warning), and the push fails. Restrict types to `generic`, `summit`, `valley`, `water`, `food`, `danger`, `first_aid`, `sprint`, `segment_start`, `segment_end`.
- **Delete**: supported; removes the route from the device.

## COROS

Good for endurance routes, but the most limited provider.

- **Wire format**: GPX. Elevation is carried via the GPX `<ele>` element.
- **Sports collapse to two internal types**: type 2 covers `running`, `trail_running`, and `hiking`; type 1 covers all cycling sports plus `other`. The device display may not differentiate between sports inside the same internal type.
- **No in-place update**: a re-sync re-POSTs a fresh GPX file rather than editing the existing one. Each push generates a unique GPX file specifically to avoid provider-side deduplication (identical GPX could otherwise be dropped).
- **`provider_route_id` meaning**: for COROS, `provider_route_id` is Terra API's own pushed route ID (there is no distinct COROS-side identifier to return). The value stays stable across re-syncs.
- **No delete**: deleting a route removes it from Terra API's database only; the route remains on the user's device. The delete call still returns success.
- **No retrieve**: pushed routes cannot be fetched back from COROS.
- **Unsupported features**: course points, speed target, and description are silently ignored.

## Wahoo

Focused on cycling and running use cases, with fuller lifecycle support than COROS.

- **Wire format**: base64-encoded FIT files.
- **Stable external ID**: Wahoo uses `terra-{pushed_route_id}` as the external identifier, so the same pushed route maps to a stable ID on Wahoo's side across updates and deletes.
- **Sport mapping**: more granular sport-family mapping than COROS (it does not collapse everything into two buckets), though still coarser than Garmin's native course types.
- **Elevation**: supported via FIT.
- **Update and delete**: both fully supported; delete removes the route from the device.
- **Unsupported features**: course points, speed target, and description are silently ignored. No retrieve support.

## Best Practices

- Design for Garmin first; it has the most complete feature support.
- Avoid relying on course points, speed targets, or descriptions unless every target user is on Garmin.
- Expect sport coercion on COROS, and coarser mapping on Wahoo.
- Keep waypoint data consistent, especially elevation (all waypoints or none, for Garmin's sake).
- Test on real devices to verify rendering, since a success response does not guarantee the route changed on the device.
