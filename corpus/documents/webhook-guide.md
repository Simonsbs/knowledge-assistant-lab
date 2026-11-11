<!-- {"id":"webhook-guide","title":"Webhook delivery and verification guide","owner":"Integrations Engineering","updatedAt":"2026-09-15","status":"current","roles":["support","admin"]} -->

## Delivery retries

Webhook delivery uses exponential backoff: retry after 1 minute, 5 minutes and 30 minutes. After the final failed retry, the event moves to the dead-letter queue. A workspace administrator can inspect and replay a dead-letter event.

## Signature verification

Verify webhook signatures using HMAC-SHA256 over the raw request body and the workspace signing secret. Compare the result to the X-Alder-Signature header using a constant-time comparison. Reject a webhook timestamp older than five minutes.

## Duplicate events

The Idempotency-Key header identifies duplicate webhook events. Store processed idempotency keys for 24 hours and return the previous delivery result for a duplicate. Do not apply a duplicate event a second time.
