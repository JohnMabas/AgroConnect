# Environment variables

`backend/.env.example` is authoritative. Production secrets belong in Render environment variables/secret files, never Git or `NEXT_PUBLIC_*`. Production requires `DATABASE_URL`, verified PostgreSQL TLS (`DB_SSL=true` and `DB_SSL_CA_PATH`), JWT secrets, `FRONTEND_URL`, and credentials for each enabled provider.
