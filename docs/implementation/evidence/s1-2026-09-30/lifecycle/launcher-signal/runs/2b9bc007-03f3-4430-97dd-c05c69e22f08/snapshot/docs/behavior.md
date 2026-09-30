# Reference service behavior

This is a local qualification application, not a production service.

`PUT /settings` accepts a JSON object whose theme is `light` or `dark`. An unsupported theme returns HTTP 400 and must not change the stored settings. Valid writes return HTTP 200 and persist to the service's isolated data directory.

`GET /settings` returns the persisted theme, defaulting to `light` if no write has occurred. A successful change to `dark` must survive closing and restarting the service using the same data directory.

No authentication, deployment identity, distributed writes, crash consistency or cross-device synchronization is promised by these methods.
