# Semantic answer review

Source-by-source agent review: 46/46 accepted answers passed. Human review: Pending. No human sign-off is claimed.

Reviewer: Codex (AI coding agent). Reviewed 2026-11-11T11:50:35.006738+00:00. This is a finite qualitative review, not independent human evaluation or proof of general model quality.

Rubric: answer the requested question, support each factual part with the cited text, preserve negation, permissions, obligations and exceptions, and add no unsupported facts.

Live report SHA-256: 9d951b2db942f54c65c2134f14d70567f318ee41ae93b5fff9eef8c59718e270

Corpus SHA-256: a291225685becc13d711f482248048188369c42b7232eed9863544ab4c58914d

## Q01: What is the initial P1 incident response target?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The initial P1 incident response target is 15 minutes, available 24 hours a day, seven days a week. [support-handbook/priority-one]

**support-handbook/priority-one:** For a priority one (P1) incident, the initial response target is 15 minutes, available 24 hours a day, seven days a week. A priority one incident means the production service is unavailable for all users. This is a fictional support target, not a measured service result.

**Review:** Correct 15-minute P1 target; the 24/7 qualification is retained.

## Q02: What is the initial P2 incident response target?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The initial P2 incident response target is four business hours, which are defined as Monday to Friday, 09:00 to 17:00 UTC, excluding the fictional company's published holidays. [support-handbook/priority-two]

**support-handbook/priority-two:** For a priority two (P2) incident, the initial response target is four business hours. Business hours are Monday to Friday, 09:00 to 17:00 UTC, excluding the fictional company's published holidays.

**Review:** Four business hours, weekday hours, timezone and holiday exclusion all agree with the source.

## Q03: What are the support business hours?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The support business hours are Monday to Friday, 09:00 to 17:00 UTC, excluding the fictional company's published holidays. [support-handbook/priority-two]

**support-handbook/priority-two:** For a priority two (P2) incident, the initial response target is four business hours. Business hours are Monday to Friday, 09:00 to 17:00 UTC, excluding the fictional company's published holidays.

**Review:** The weekday schedule, UTC timezone and holiday exclusion are correctly preserved.

## Q04: When must the support lead open an incident bridge?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The support lead must open an incident bridge if a priority one incident has no assigned owner after 30 minutes. [support-handbook/incident-escalation]

**support-handbook/incident-escalation:** If a priority one incident has no assigned owner after 30 minutes, the support lead must open an incident bridge and page the duty incident commander.

**Review:** Correct trigger: a P1 incident with no assigned owner after 30 minutes. Paging is not asked for and its omission does not change the trigger.

## Q05: How often does the incident commander send a customer status update?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The incident commander sends a customer status update every 30 minutes during an active priority one incident. [support-handbook/customer-updates]

**support-handbook/customer-updates:** During an active priority one incident, the incident commander sends a customer status update every 30 minutes. Updates state the known impact, current investigation and time of the next update.

**Review:** The 30-minute cadence remains explicitly limited to an active P1 incident.

## Q06: Which plan supports SAML single sign-on?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Only the Enterprise plan supports SAML 2.0 single sign-on (SSO). [identity-guide/single-sign-on]

**identity-guide/single-sign-on:** Only the Enterprise plan supports SAML 2.0 single sign-on (SSO). A workspace administrator configures the identity provider from Settings > Identity. The Starter plan does not include SAML single sign-on.

**Review:** SAML support is restricted to Enterprise; version and SSO wording agree with the source.

## Q07: Who requires multi-factor authentication?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Multi-factor authentication is required for all administrators and support staff. A workspace administrator can require MFA for other workspace users. [identity-guide/multi-factor-authentication]

**identity-guide/multi-factor-authentication:** Multi-factor authentication (MFA) is required for all administrators and support staff. A workspace administrator can require MFA for other workspace users.

**Review:** Mandatory MFA for administrators and support staff is distinguished from the administrator permission to require it for others.

## Q08: Which plan supports SCIM user provisioning?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The Enterprise plan supports SCIM user provisioning. [identity-guide/user-provisioning]

**identity-guide/user-provisioning:** SCIM user provisioning is available on the Enterprise plan. Provisioning creates and deactivates workspace users through the configured identity provider.

**Review:** SCIM provisioning is attributed to the Enterprise plan without adding another plan.

## Q09: How often must API keys be rotated?

Role: support. Set: development. Verdict: pass.

**Actual answer:** API keys must be rotated every 90 days. [identity-guide/api-key-rotation]

**identity-guide/api-key-rotation:** API keys must be rotated every 90 days. Keep the previous API key active for no more than 24 hours during a planned rotation, then revoke it. Never include actual keys in support tickets.

**Review:** The API key rotation interval is correctly stated as every 90 days.

## Q10: How long can the previous API key stay active during rotation?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The previous API key must be kept active for no more than 24 hours during a planned rotation. [identity-guide/api-key-rotation]

**identity-guide/api-key-rotation:** API keys must be rotated every 90 days. Keep the previous API key active for no more than 24 hours during a planned rotation, then revoke it. Never include actual keys in support tickets.

**Review:** The maximum 24-hour overlap and planned-rotation qualification are preserved; no exact 24-hour minimum is asserted.

## Q11: What is the webhook delivery retry schedule?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Webhook delivery uses exponential backoff: retry after 1 minute, 5 minutes and 30 minutes. After the final failed retry, the event moves to the dead-letter queue. [webhook-guide/delivery-retries]

**webhook-guide/delivery-retries:** Webhook delivery uses exponential backoff: retry after 1 minute, 5 minutes and 30 minutes. After the final failed retry, the event moves to the dead-letter queue. A workspace administrator can inspect and replay a dead-letter event.

**Review:** All three retry intervals are correct; the additional dead-letter outcome is present in the same cited passage.

## Q12: Which algorithm verifies webhook signatures?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Verify webhook signatures using HMAC-SHA256 over the raw request body and the workspace signing secret. [webhook-guide/signature-verification]

**webhook-guide/signature-verification:** Verify webhook signatures using HMAC-SHA256 over the raw request body and the workspace signing secret. Compare the result to the X-Alder-Signature header using a constant-time comparison. Reject a webhook timestamp older than five minutes.

**Review:** HMAC-SHA256, the raw request body and workspace signing secret are supported by the cited verification passage.

## Q13: When should an old webhook timestamp be rejected?

Role: support. Set: development. Verdict: pass.

**Actual answer:** An old webhook timestamp should be rejected if it is older than five minutes. [webhook-guide/signature-verification]

**webhook-guide/signature-verification:** Verify webhook signatures using HMAC-SHA256 over the raw request body and the workspace signing secret. Compare the result to the X-Alder-Signature header using a constant-time comparison. Reject a webhook timestamp older than five minutes.

**Review:** The rejection boundary is older than five minutes, rather than equal to five minutes.

## Q14: How are duplicate webhook events identified?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The Idempotency-Key header identifies duplicate webhook events. Store processed idempotency keys for 24 hours and return the previous delivery result for a duplicate. Do not apply a duplicate event a second time. [webhook-guide/duplicate-events]

**webhook-guide/duplicate-events:** The Idempotency-Key header identifies duplicate webhook events. Store processed idempotency keys for 24 hours and return the previous delivery result for a duplicate. Do not apply a duplicate event a second time.

**Review:** The header, 24-hour retention and no-second-application instruction all follow from the duplicate-event passage.

## Q15: How long are processed idempotency keys stored?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Processed idempotency keys are stored for 24 hours. [webhook-guide/duplicate-events]

**webhook-guide/duplicate-events:** The Idempotency-Key header identifies duplicate webhook events. Store processed idempotency keys for 24 hours and return the previous delivery result for a duplicate. Do not apply a duplicate event a second time.

**Review:** Processed idempotency-key retention is correctly stated as 24 hours.

## Q16: What happens after the final failed webhook retry?

Role: support. Set: development. Verdict: pass.

**Actual answer:** After the final failed webhook retry, the event moves to the dead-letter queue. [webhook-guide/delivery-retries]

**webhook-guide/delivery-retries:** Webhook delivery uses exponential backoff: retry after 1 minute, 5 minutes and 30 minutes. After the final failed retry, the event moves to the dead-letter queue. A workspace administrator can inspect and replay a dead-letter event.

**Review:** The event enters the dead-letter queue only after the final failed retry.

## Q17: What is the recovery point objective?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The recovery point objective (RPO) is four hours. [backup-policy/recovery-objectives]

**backup-policy/recovery-objectives:** The recovery point objective (RPO) is four hours. The recovery time objective (RTO) is eight hours. These are fictional planning objectives, not recovery performance measurements or a contractual uptime guarantee.

**Review:** RPO is correctly distinguished from RTO and stated as four hours.

## Q18: What is the recovery time objective?

Role: support. Set: development. Verdict: pass.

**Actual answer:** The recovery time objective (RTO) is eight hours. These are fictional planning objectives, not recovery performance measurements or a contractual uptime guarantee. [backup-policy/recovery-objectives]

**backup-policy/recovery-objectives:** The recovery point objective (RPO) is four hours. The recovery time objective (RTO) is eight hours. These are fictional planning objectives, not recovery performance measurements or a contractual uptime guarantee.

**Review:** RTO is eight hours, and the answer preserves the planning-objective and non-guarantee qualifications.

## Q19: Where are primary data and encrypted backups stored?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Primary data is stored in Dublin, Ireland, and encrypted backups are stored in Frankfurt, Germany. Both locations are within the European Union. [backup-policy/data-location]

**backup-policy/data-location:** The primary data location is Dublin, Ireland. Encrypted backups are stored in Frankfurt, Germany. Both locations are within the European Union.

**Review:** Primary data and encrypted backups are assigned to the correct cities and countries; the EU statement is sourced.

## Q20: What file format and encoding do workspace exports use?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Workspace exports use CSV files encoded as UTF-8. [export-guide/export-format]

**export-guide/export-format:** Workspace exports use CSV files encoded as UTF-8. An export includes records that the requesting user is authorised to access in the selected workspace.

**Review:** Both requested parts, CSV format and UTF-8 encoding, are supplied without unrelated log-retention claims.

## Q21: When does an export download link expire?

Role: support. Set: development. Verdict: pass.

**Actual answer:** An export download link expires after 48 hours. Request a new export if the download link has expired. Download links cannot be extended. [export-guide/download-expiry]

**export-guide/download-expiry:** An export download link expires after 48 hours. Request a new export if the download link has expired. Download links cannot be extended.

**Review:** The 48-hour expiry, need for a new export and prohibition on extension are all supported.

## Q22: Who can export the audit history?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Only a workspace owner can export the audit history. Support staff cannot export a customer's audit history on the customer's behalf. [export-guide/audit-history]

**export-guide/audit-history:** Only a workspace owner can export the audit history. Open Settings > Audit > Export and choose the required date range. Support staff cannot export a customer's audit history on the customer's behalf.

**Review:** The workspace-owner restriction and prohibition on support acting for the customer are retained.

## Q23: When is active workspace data deleted after an approved deletion request?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Active workspace data is deleted within 30 days after an approved deletion request, provided the workspace owner confirms the request before deletion begins. [privacy-policy/workspace-deletion]

**privacy-policy/workspace-deletion:** After a workspace deletion request is approved, active workspace data is deleted within 30 days. The workspace owner must confirm the request before deletion begins.

**Review:** The 30-day window is conditional on approval and owner confirmation. No uncited backup-retention statement is added.

## Q24: How long can deleted workspace data remain in encrypted backups?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Deleted workspace data can remain in encrypted backups for up to 90 days before backup expiry removes it. [privacy-policy/backup-deletion]

**privacy-policy/backup-deletion:** Deleted workspace data can remain in encrypted backups for up to 90 days before backup expiry removes it. Backup data is not restored into an active workspace except through an approved recovery process.

**Review:** The upper limit of 90 days is retained, rather than stated as an exact or minimum retention period.

## Q25: When is scheduled maintenance?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Scheduled maintenance occurs on Tuesdays from 02:00 to 03:00 UTC, and customers receive at least seven days of advance notice. Emergency maintenance can occur without the normal notice period, with updates on the status page. [maintenance-guide/advance-notice] [maintenance-guide/maintenance-window]

**maintenance-guide/advance-notice:** Customers receive at least seven days of advance notice for scheduled maintenance. Emergency maintenance can occur without the normal notice period, with updates on the status page.

**maintenance-guide/maintenance-window:** Scheduled maintenance takes place on Tuesdays from 02:00 to 03:00 UTC. The status page lists each approved maintenance window and its expected impact.

**Review:** Tuesday 02:00-03:00 UTC, normal notice and emergency exception are all supported; both source passages are cited.

## Q26: What advance notice is given for scheduled maintenance?

Role: support. Set: development. Verdict: pass.

**Actual answer:** Customers receive at least seven days of advance notice for scheduled maintenance. [maintenance-guide/advance-notice]

**maintenance-guide/advance-notice:** Customers receive at least seven days of advance notice for scheduled maintenance. Emergency maintenance can occur without the normal notice period, with updates on the status page.

**Review:** At least seven days is correctly stated for scheduled maintenance; this does not claim emergency maintenance has that requirement.

## Q33: What is the emergency recovery code?

Role: admin. Set: development. Verdict: pass.

**Actual answer:** The emergency recovery code is ALDER-DEMO-042. This code is synthetic and grants access to nothing. [admin-runbook/emergency-recovery]

**admin-runbook/emergency-recovery:** Emergency recovery access requires two administrators and a recorded change ticket. The illustrative emergency recovery code is ALDER-DEMO-042. This code is synthetic and grants access to nothing.

**Review:** The exact illustrative code is correct, exposed only under the admin role, and clearly described as synthetic.

## Q34: Who is the internal key custodian?

Role: admin. Set: development. Verdict: pass.

**Actual answer:** The internal key custodian is the Security Operations team. [admin-runbook/internal-key-custody]

**admin-runbook/internal-key-custody:** The internal key custodian is the Security Operations team. Encryption key rotation approval requires the security lead. No real encryption keys are included in this demonstration.

**Review:** Internal key custody is correctly assigned to Security Operations under the admin role.

## V01: Which signature algorithm is used to verify a webhook?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** HMAC-SHA256 is used to verify a webhook signature. [webhook-guide/signature-verification]

**webhook-guide/signature-verification:** Verify webhook signatures using HMAC-SHA256 over the raw request body and the workspace signing secret. Compare the result to the X-Alder-Signature header using a constant-time comparison. Reject a webhook timestamp older than five minutes.

**Review:** The requested signature algorithm is correctly identified as HMAC-SHA256.

## V02: At what age must a webhook timestamp be rejected?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** A webhook timestamp must be rejected if it is older than five minutes. [webhook-guide/signature-verification]

**webhook-guide/signature-verification:** Verify webhook signatures using HMAC-SHA256 over the raw request body and the workspace signing secret. Compare the result to the X-Alder-Signature header using a constant-time comparison. Reject a webhook timestamp older than five minutes.

**Review:** The five-minute timestamp rejection boundary is preserved.

## V03: What header carries the webhook signature?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** The X-Alder-Signature header carries the webhook signature. [webhook-guide/signature-verification]

**webhook-guide/signature-verification:** Verify webhook signatures using HMAC-SHA256 over the raw request body and the workspace signing secret. Compare the result to the X-Alder-Signature header using a constant-time comparison. Reject a webhook timestamp older than five minutes.

**Review:** The exact X-Alder-Signature header is returned; it is not confused with Idempotency-Key.

## V04: For how many hours are processed idempotency keys retained?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** Processed idempotency keys are retained for 24 hours. [webhook-guide/duplicate-events]

**webhook-guide/duplicate-events:** The Idempotency-Key header identifies duplicate webhook events. Store processed idempotency keys for 24 hours and return the previous delivery result for a duplicate. Do not apply a duplicate event a second time.

**Review:** The inflected retention question is answered with the documented 24-hour duration.

## V05: What must I do after the last failed webhook delivery retry?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** After the last failed webhook delivery retry, the event moves to the dead-letter queue, and a workspace administrator can inspect and replay a dead-letter event. [webhook-guide/delivery-retries]

**webhook-guide/delivery-retries:** Webhook delivery uses exponential backoff: retry after 1 minute, 5 minutes and 30 minutes. After the final failed retry, the event moves to the dead-letter queue. A workspace administrator can inspect and replay a dead-letter event.

**Review:** Both the immediate dead-letter-queue outcome and the administrator inspection/replay permission are included.

## V06: Where are encrypted backups stored, and where is primary data located?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** Encrypted backups are stored in Frankfurt, Germany, and primary data is located in Dublin, Ireland. Both locations are within the European Union. [backup-policy/data-location]

**backup-policy/data-location:** The primary data location is Dublin, Ireland. Encrypted backups are stored in Frankfurt, Germany. Both locations are within the European Union.

**Review:** Both requested locations are correct despite the reversed question order; the added EU statement is sourced.

## V07: Does the Starter plan include SAML single sign-on?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** The Starter plan does not include SAML single sign-on. [identity-guide/single-sign-on]

**identity-guide/single-sign-on:** Only the Enterprise plan supports SAML 2.0 single sign-on (SSO). A workspace administrator configures the identity provider from Settings > Identity. The Starter plan does not include SAML single sign-on.

**Review:** The negative Starter-plan answer is explicit and agrees with the source restriction.

## V08: Who may require MFA for other workspace users?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** A workspace administrator can require MFA for other workspace users. [identity-guide/multi-factor-authentication]

**identity-guide/multi-factor-authentication:** Multi-factor authentication (MFA) is required for all administrators and support staff. A workspace administrator can require MFA for other workspace users.

**Review:** Only a workspace administrator receives the permission to require MFA. The earlier unsupported support-staff permission is absent.

## V09: How frequently must an API key be rotated?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** API keys must be rotated every 90 days. [identity-guide/api-key-rotation]

**identity-guide/api-key-rotation:** API keys must be rotated every 90 days. Keep the previous API key active for no more than 24 hours during a planned rotation, then revoke it. Never include actual keys in support tickets.

**Review:** The API key rotation interval is correctly stated as 90 days.

## V10: Can support staff export a customer's audit history?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** Support staff cannot export a customer's audit history on the customer's behalf. [export-guide/audit-history]

**export-guide/audit-history:** Only a workspace owner can export the audit history. Open Settings > Audit > Export and choose the required date range. Support staff cannot export a customer's audit history on the customer's behalf.

**Review:** The prohibition on support exporting customer audit history is preserved.

## V11: Is backup data restored to an active workspace without an approved recovery process?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** Backup data is not restored into an active workspace except through an approved recovery process. [privacy-policy/backup-deletion]

**privacy-policy/backup-deletion:** Deleted workspace data can remain in encrypted backups for up to 90 days before backup expiry removes it. Backup data is not restored into an active workspace except through an approved recovery process.

**Review:** The approved-recovery exception remains attached to the prohibition on restoring backup data.

## V12: What confirmation is required before workspace deletion begins?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** The workspace owner must confirm the request before deletion begins. [privacy-policy/workspace-deletion]

**privacy-policy/workspace-deletion:** After a workspace deletion request is approved, active workspace data is deleted within 30 days. The workspace owner must confirm the request before deletion begins.

**Review:** Owner confirmation of the request is correctly required before deletion begins.

## V13: What is the scheduled Tuesday maintenance window in UTC?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** Scheduled maintenance takes place on Tuesdays from 02:00 to 03:00 UTC. [maintenance-guide/maintenance-window]

**maintenance-guide/maintenance-window:** Scheduled maintenance takes place on Tuesdays from 02:00 to 03:00 UTC. The status page lists each approved maintenance window and its expected impact.

**Review:** Tuesday, both endpoints of the maintenance window and UTC are correct.

## V14: May emergency maintenance happen without seven days of notice?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** Emergency maintenance can happen without seven days of notice, as stated in the maintenance guide, but customers receive updates on the status page. [maintenance-guide/advance-notice]

**maintenance-guide/advance-notice:** Customers receive at least seven days of advance notice for scheduled maintenance. Emergency maintenance can occur without the normal notice period, with updates on the status page.

**Review:** Emergency maintenance is correctly exempted from the normal seven-day notice, while status-page updates remain included.

## V17: How many administrators and what record are required for emergency recovery access?

Role: admin. Set: verification. Verdict: pass.

**Actual answer:** Emergency recovery access requires two administrators and a recorded change ticket. [admin-runbook/emergency-recovery]

**admin-runbook/emergency-recovery:** Emergency recovery access requires two administrators and a recorded change ticket. The illustrative emergency recovery code is ALDER-DEMO-042. This code is synthetic and grants access to nothing.

**Review:** Both requested recovery prerequisites, two administrators and a recorded change ticket, are preserved.

## V18: Who approves encryption key rotation?

Role: admin. Set: verification. Verdict: pass.

**Actual answer:** The security lead approves encryption key rotation. [admin-runbook/internal-key-custody]

**admin-runbook/internal-key-custody:** The internal key custodian is the Security Operations team. Encryption key rotation approval requires the security lead. No real encryption keys are included in this demonstration.

**Review:** The security lead approves rotation; this is correctly distinguished from the Security Operations key custodian.

## V27: What is the P1 response target in the current handbook?

Role: support. Set: verification. Verdict: pass.

**Actual answer:** The P1 response target in the current handbook is 15 minutes, available 24 hours a day, seven days a week. [support-handbook/priority-one]

**support-handbook/priority-one:** For a priority one (P1) incident, the initial response target is 15 minutes, available 24 hours a day, seven days a week. A priority one incident means the production service is unavailable for all users. This is a fictional support target, not a measured service result.

**Review:** The current 15-minute P1 target is used, with no archived or draft values.

## V28: Which team is the internal key custodian?

Role: admin. Set: verification. Verdict: pass.

**Actual answer:** The internal key custodian is the Security Operations team. [admin-runbook/internal-key-custody]

**admin-runbook/internal-key-custody:** The internal key custodian is the Security Operations team. Encryption key rotation approval requires the security lead. No real encryption keys are included in this demonstration.

**Review:** The key-custodian question is correctly answered by Security Operations rather than the rotation approver.
