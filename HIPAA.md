# HIPAA Posture — NextUS CSM

Personal-injury case files contain **PHI** (medical records status, providers, treatment
dates). This document describes what the application enforces today and what the
deploying organization must add operationally. *Software alone cannot be "HIPAA
compliant" — compliance is a property of the whole program (people, process, and
infrastructure).*

## Technical safeguards built in

| Safeguard | Implementation |
|---|---|
| Access control (unique user IDs) | Per-user accounts, bcrypt-hashed passwords (cost 12), no shared logins |
| Role-based access | 8 roles enforced server-side (`src/lib/rbac.ts`); minimum-necessary views per role |
| Tenant isolation | Every query is scoped through `tenantScope()`; firm users cannot reach other firms' data even by crafted requests |
| Automatic logoff | JWT sessions expire after 30 min idle (`SESSION_IDLE_MINUTES`), sliding renewal on activity |
| Audit controls | Append-only `AuditLog` of logins (incl. failures), views/exports, and every data change, with user, IP, timestamp, and tenant |
| Integrity | All mutations go through validated server actions; no client-side database access |
| Transmission security headers | HSTS, X-Frame-Options DENY, nosniff, referrer policy (see `next.config.mjs`) |

## Required for production (deployment checklist)

1. **Encryption in transit** — serve exclusively over TLS (HTTPS); redirect HTTP.
2. **Encryption at rest** — use PostgreSQL with disk/volume encryption (or a managed
   service with encryption enabled). Switch the Prisma datasource provider.
3. **Business Associate Agreements** — sign BAAs with your hosting provider, database
   provider, email vendor, and any subprocessor that can touch PHI.
4. **Backups & disaster recovery** — encrypted automated backups, tested restores.
5. **Audit log retention** — export `AuditLog` to immutable storage (e.g. S3 Object
   Lock) on a schedule; HIPAA expects 6-year retention of policies/records.
6. **Password & MFA policy** — enforce strong passwords and add MFA (e.g. TOTP or an
   SSO/IdP in front of the app) before real PHI enters the system.
7. **Secrets** — set a strong `AUTH_SECRET`; never commit `.env`.
8. **Workforce controls** — deactivate users immediately on departure (Users admin
   page), review the audit trail periodically, and train staff.
9. **Risk analysis** — perform and document a security risk assessment (required by
   the Security Rule) covering this app and the surrounding infrastructure.
10. **State bar rules** — legal-operations data may also be subject to state bar
    confidentiality rules; have counsel review data-sharing between the management
    company and each firm (the tenant model supports this separation).

## Data handled

- Client name/phone/email, incident dates, statute-of-limitations dates
- Medical **status** flags (records/bills received, provider names, appointment dates,
  MRI/surgery-consult status) — the app tracks document *status*; storing the medical
  documents themselves would additionally require encrypted object storage with
  per-tenant keys and signed, expiring URLs.
