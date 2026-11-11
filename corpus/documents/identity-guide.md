<!-- {"id":"identity-guide","title":"Identity and API access guide","owner":"Platform Security","updatedAt":"2026-10-12","status":"current","roles":["support","admin"]} -->

## Single sign-on

Only the Enterprise plan supports SAML 2.0 single sign-on (SSO). A workspace administrator configures the identity provider from Settings > Identity. The Starter plan does not include SAML single sign-on.

## Multi-factor authentication

Multi-factor authentication (MFA) is required for all administrators and support staff. A workspace administrator can require MFA for other workspace users.

## User provisioning

SCIM user provisioning is available on the Enterprise plan. Provisioning creates and deactivates workspace users through the configured identity provider.

## API key rotation

API keys must be rotated every 90 days. Keep the previous API key active for no more than 24 hours during a planned rotation, then revoke it. Never include actual keys in support tickets.
