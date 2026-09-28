# Tea_Estate_MS – security-hardened (SE4030 Group 55)

This is the Secure Software Development (SE4030) assignment version of our Year 2 Tea Estate Management System.
The original project is [icy-r/Tea_Estate_MS](https://github.com/icy-r/Tea_Estate_MS) (last commit `d086ea5`, 16 Oct 2024).

**Video walkthrough (unlisted):** https://youtu.be/cybdwp76OXs

| | |
|---|---|
| Vulnerabilities fixed | 13 (OWASP Top 10 2021, A01–A07), one commit each, plus follow-up fixes for V1 (trusted server-built queries) and V4 (leave-request access control) |
| OAuth / OpenID Connect | "Sign in with Google": Authorization Code grant with PKCE, `state`, `nonce` and ID-token validation |
| Evidence | `security-tests/poc.sh` (15 checks, 2/15 before → 15/15 after), `poc-janukshan.sh` (7), `poc-samudith.sh` (3) |
| CI | Build, `npm audit --audit-level=high` and gitleaks on every push |

**Security notes by owner:** [V2, V3, V12 and OIDC](docs/security/V2-V3-V12-OIDC.md) ·
[V5, V6, V7](docs/security/V5-V6-V7.md) · [V8, V9, V10, V13](docs/security/V8-V9-V10-V13.md)

**Group 55:** Asath M M (IT22633422) · Janukshan S (IT22635266) · Herath D M S T (IT22639776) · De Silva R K D H (IT22001252)

### Run the security checks
```bash
docker run -d --name tea-mongo -p 27017:27017 mongo:7
cd backend && cp .env.example .env   # set DATABASE_URL, SECRET (openssl rand -hex 32), CLOUDINARY_URL
npm install
DATABASE_URL=mongodb://127.0.0.1:27017/tea node scripts/seed-security.js
node bin/www.js &
cd .. && for s in security-tests/poc*.sh; do bash "$s"; done
```

---

## Original project README

![image](https://github.com/user-attachments/assets/3be7b2b8-3d6b-472e-bfeb-05461b6d4b60)
