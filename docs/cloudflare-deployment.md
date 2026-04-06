# Cloudflare Pages Deployment Guide

How to deploy the Lulin Bakery site to Cloudflare Pages using Wrangler CLI and the Cloudflare API. Includes custom subdomain setup.

## Prerequisites

- Node.js installed
- Wrangler authenticated: `npx wrangler login` (opens browser OAuth flow)
- For API calls: a Cloudflare API token and your Account ID

## Quick Deploy (Common Workflow)

```bash
npx wrangler pages deploy . --project-name lulin-bakery
```

That's it for deploying. The site is live at `lulin-bakery.pages.dev` and any configured custom domains.

Use `--commit-dirty=true` to suppress the warning about uncommitted changes.

---

## Full Setup From Scratch

### 1. Create the Pages Project

```bash
npx wrangler pages project create lulin-bakery --production-branch=main
```

The project is now at `lulin-bakery.pages.dev` (returns 404 until first deploy).

### 2. Deploy

```bash
npx wrangler pages deploy . --project-name lulin-bakery
```

### 3. Add a Custom Subdomain (e.g., `lulin.damoiseau.xyz`)

This is a **two-step process** — register the domain with Pages, then add a DNS record.

**Important:** Register the domain with Pages *before* adding the DNS record, or you'll get 522 errors.

#### Step A: Register domain with Pages

Wrangler has no command for this. Use either the **dashboard** or the **API**.

**Option 1 — Dashboard (simplest):**

1. Go to **Workers & Pages** in Cloudflare dashboard
2. Click the project (e.g., `lulin-bakery`)
3. Go to **Custom domains** tab
4. Click **Set up a custom domain**
5. Enter `lulin.damoiseau.xyz`
6. If the zone is on Cloudflare, the CNAME is created automatically

**Option 2 — API:**

```bash
# Set these first
export ACCOUNT_ID="your-account-id"       # Found in dashboard sidebar
export CF_API_TOKEN="your-api-token"       # See "API Token Setup" section below

# Register the custom domain
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/lulin-bakery/domains" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "lulin.damoiseau.xyz"}'
```

#### Step B: Add DNS CNAME record

If `damoiseau.xyz` is a Cloudflare zone and you used the dashboard method, this is done automatically. Otherwise:

**Dashboard:**

1. Go to **DNS** for the `damoiseau.xyz` zone
2. Click **Add record**
3. Set:
   - Type: `CNAME`
   - Name: `lulin`
   - Target: `lulin-bakery.pages.dev`
   - Proxy status: Proxied (orange cloud)

**API:**

```bash
export ZONE_ID="your-zone-id"   # Zone ID for damoiseau.xyz

curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "lulin",
    "content": "lulin-bakery.pages.dev",
    "proxied": true
  }'
```

#### Step C: Verify domain is active

The domain goes through: `initializing` → `pending` → `active`. Check status:

```bash
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/lulin-bakery/domains/lulin.damoiseau.xyz" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

Usually activates within 1-2 minutes for Cloudflare-managed zones.

---

## Useful Commands Reference

### Projects

```bash
# List all Pages projects
npx wrangler pages project list

# Create a project
npx wrangler pages project create <name> --production-branch=main

# Delete a project (destructive!)
npx wrangler pages project delete <name>
```

### Deployments

```bash
# Deploy current directory
npx wrangler pages deploy . --project-name lulin-bakery

# Deploy to a preview branch
npx wrangler pages deploy . --project-name lulin-bakery --branch=staging

# List deployments
npx wrangler pages deployment list --project-name lulin-bakery
```

### Custom Domains (API only)

```bash
# List domains on a project
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/lulin-bakery/domains" \
  -H "Authorization: Bearer $CF_API_TOKEN"

# Add domain
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/lulin-bakery/domains" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "lulin.damoiseau.xyz"}'

# Retry validation
curl -X PATCH \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/lulin-bakery/domains/lulin.damoiseau.xyz" \
  -H "Authorization: Bearer $CF_API_TOKEN"

# Remove domain
curl -X DELETE \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/lulin-bakery/domains/lulin.damoiseau.xyz" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

---

## CLI vs API vs Dashboard

| Task | Wrangler CLI | REST API | Dashboard |
|------|-------------|----------|-----------|
| Create project | Yes | Yes | Yes |
| Deploy static files | Yes | Yes | Yes |
| List deployments | Yes | Yes | Yes |
| Add custom domain | **No** | Yes | Yes |
| Check domain status | **No** | Yes | Yes |
| Delete custom domain | **No** | Yes | Yes |
| Add DNS record | **No** | Yes (DNS API) | Yes |

Custom domain management is the main gap in the CLI — you must use the API or dashboard for that.

---

## API Token Setup

Create at https://dash.cloudflare.com/profile/api-tokens:

1. Click **Create Token**
2. Use **Custom token** template
3. Add permissions:
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Zone** → **DNS** → **Edit** (if managing DNS via API too)
4. Scope to your account and the relevant zone

Store the token securely. Never commit it to the repo.

---

## Current Setup

| Item | Value |
|------|-------|
| Project name | `lulin-bakery` |
| Default URL | `lulin-bakery.pages.dev` |
| Custom domain | `lulin.damoiseau.xyz` |
| DNS zone | `damoiseau.xyz` (Cloudflare-managed) |
