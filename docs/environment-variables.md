# Environment variables

`backend/.env.example` is authoritative. Production secrets belong in Render environment variables/secret files, never Git or `NEXT_PUBLIC_*`. Production requires `DATABASE_URL`, verified PostgreSQL TLS (`DB_SSL=true` and `DB_SSL_CA_PATH`), JWT secrets, `FRONTEND_URL`, and credentials for each enabled provider.

## Phase 17 telecom and localization

- Channel switches: `TELECOM_ENABLED`, `USSD_ENABLED`, `VOICE_ENABLED`. Keep disabled until the provider approves the short code or voice number.
- Africa's Talking: `AFRICASTALKING_ENVIRONMENT`, `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, `AFRICASTALKING_SENDER_ID`.
- USSD: `USSD_SERVICE_CODE`, `USSD_CALLBACK_SECRET`, `USSD_MAX_RESPONSE_LENGTH`.
- Voice: `VOICE_NUMBER`, `VOICE_CALLBACK_URL`, `VOICE_CALLBACK_SECRET`.
- Callback security: `TELECOM_CALLBACK_SECRET`, `TELECOM_CALLBACK_IP_ALLOWLIST`. Africa's Talking does not sign USSD/voice callbacks, so configure a secret and/or allowlist in production.
- Session and abuse controls: `TELECOM_SESSION_TTL_SECONDS`, `TELECOM_DUPLICATE_WINDOW_SECONDS`, `TELECOM_MAX_MENU_OPTIONS`, `TELECOM_SUPPORT_MESSAGE_MAX_LENGTH`, `TELECOM_RATE_LIMIT_PER_MINUTE`.
- Localization: `LOCALIZATION_DEFAULT_LANGUAGE`, `LOCALIZATION_SUPPORTED_LANGUAGES`, `LOCALIZATION_REVIEWED_LANGUAGES`. Only reviewed languages are used for critical payment, consent, approval and safety messages; all others fall back to English.

See [`phase17-telecom-localization.md`](./phase17-telecom-localization.md) for callback contracts, menus and sandbox/production notes.
