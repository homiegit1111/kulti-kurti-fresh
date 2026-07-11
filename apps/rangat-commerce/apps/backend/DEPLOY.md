# Deploying to a DigitalOcean droplet

Self-hosted alternative to `railway.toml` (kept for reference / as a fallback
path — nothing here removes Railway support, `medusa-config.ts` just reads
plain env vars so either works). Uses the `Dockerfile` + `docker-compose.yml`
in this directory: one droplet running Postgres + Redis + a Medusa "web"
container + a Medusa "worker" container.

Sizing: pick the **2GB RAM / 1 vCPU droplet** ($12/mo on-demand, or ~16 months
covered by a $200 credit). The 1GB tier is a real OOM risk — Postgres, Redis,
and two Node processes all have to fit in it. Medusa's own docs recommend
2GB minimum for the server process alone.

## 1. Create the droplet

- Image: Ubuntu 24.04 LTS
- Size: Basic, 2GB RAM / 1 vCPU
- Region: pick the one nearest your customers (Bangalore, if using DO's
  India datacenter)
- Add your SSH key at creation — don't use password auth

## 2. Install Docker

SSH in, then:

```sh
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
```

## 3. Get the code onto the droplet

Simplest path — clone the repo directly on the droplet (adjust for private
repo auth if needed):

```sh
git clone <your-repo-url> rangat
cd rangat/apps/rangat-commerce/apps/backend
```

## 4. Create `.env`

Copy `.env.example` as a starting point, but note **the compose file
overrides `DATABASE_URL` and `REDIS_URL` itself** (pointing at the
`postgres`/`redis` service names) — don't set those two in `.env`, they'll be
ignored anyway. What `.env` actually needs:

```sh
# Postgres container credentials (compose reads these to build DATABASE_URL)
POSTGRES_USER=rangat
POSTGRES_PASSWORD=<generate a strong random value>
POSTGRES_DB=rangat

# Medusa secrets — generate with: openssl rand -hex 32
JWT_SECRET=<generated>
COOKIE_SECRET=<generated>

# CORS — real Vercel storefront + admin origins, not localhost
STORE_CORS=https://your-storefront.vercel.app
ADMIN_CORS=https://<droplet-ip>:9000
AUTH_CORS=https://your-storefront.vercel.app,https://<droplet-ip>:9000

# Shared secret with the Next.js storefront's customer-link route — must
# match RANGAT_MEDUSA_INTERNAL_SECRET on the Vercel side exactly.
RANGAT_MEDUSA_INTERNAL_SECRET=<generated>
```

`chmod 600 .env` once written. Never commit it — it's already covered by the
backend's `.gitignore` (`.env`).

## 5. Build and start

```sh
docker compose up -d --build
docker compose logs -f web   # confirm it comes up clean, migrations ran
```

The `web` container runs `medusa db:migrate` before `medusa start` on every
boot (same `predeploy` script Railway uses) — schema is always current. Only
`web` runs migrations; `worker` just starts, so two containers never race
the same migration.

## 6. Seed the catalog (once)

```sh
docker compose exec web pnpm seed
```

## 7. Point the storefront at it

On Vercel, set the storefront's Medusa base URL env var to
`http://<droplet-ip>:9000` for initial testing. **This is plaintext HTTP —
fine to confirm things work, not for real traffic** (admin session cookies,
payment-adjacent Medusa calls would cross the wire unencrypted).

## 8. Before real traffic: add TLS

Not done yet — deliberately deferred until the HTTP path is confirmed
working. When ready:

1. Point a domain/subdomain at the droplet's IP (A record).
2. Put Caddy or nginx in front of the `web` container as a reverse proxy;
   Caddy is the simpler choice — it gets a Let's Encrypt cert automatically
   just from the Caddyfile listing the domain, no separate certbot step.
3. Stop publishing port 9000 directly (remove the `ports:` mapping on `web`
   in docker-compose.yml, or firewall it to only accept from the reverse
   proxy container) and swap the storefront's base URL to the HTTPS domain.

## What's NOT covered here (do before relying on this in production)

- **Backups**: no automated Postgres backup is configured. At minimum, cron
  a nightly `pg_dump` from inside the `postgres` container to somewhere off
  the droplet (DO Spaces, S3, etc.) before trusting this with real orders.
- **Monitoring/restart alerting**: `restart: unless-stopped` keeps
  containers up across crashes/reboots, but nothing pages you if a container
  is stuck crash-looping. Worth wiring in DO's monitoring alerts or something
  like Sentry/Uptime Kuma before this is customer-facing.
- **Firewall**: DO droplets are publicly reachable by default beyond the
  ports you publish — use DO's Cloud Firewall (or `ufw`) to restrict SSH to
  known IPs and, once TLS is in front, drop the direct 9000 exposure.
- **This compose file has not been run/tested in this environment** — no
  Docker available in the sandbox that authored it. Validate step 5 for real
  on the actual droplet before assuming it's correct; if `medusa db:migrate`
  or the build step errors, that's the first place to look.
