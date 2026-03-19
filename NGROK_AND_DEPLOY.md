# Local HTTPS (ngrok vs Node cert) + deploy on Cloudflare / astera.com

Use this when you need **HTTPS** for Microsoft Teams tabs and SSO, then later for a stable hostname like **`nimbus.astera.com`**.

---

## Which is easier for *right now*?

| Approach | Effort | Best for |
|----------|--------|----------|
| **ngrok** (recommended) | Low | Quick Teams testing; no certificate files; works on Windows easily |
| **Node.js + dev certificate** (e.g. mkcert) | Medium | You want everything on `https://localhost` without a third-party tunnel |

**Recommendation:** use **ngrok** first. You avoid browser/Teams trust issues with self-signed certs, and you get a real public HTTPS URL in minutes.

---

## Option A: ngrok (recommended for local Teams)

### 1. Install and sign in

1. Create a free account at [ngrok](https://ngrok.com/).
2. Install the ngrok agent ([download / docs](https://ngrok.com/download)).
3. Add your authtoken (from the ngrok dashboard) once:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

### 2. Run Nimbus, then tunnel

1. Start the app: `npm start` (default **port 3000**).
2. In another terminal:
   ```bash
   ngrok http 3000
   ```
3. Copy the **HTTPS** forwarding URL, e.g. `https://abc123.ngrok-free.app` (yours will differ).

### 3. Update `.env` (use your real ngrok host, no trailing slash)

```env
PORT=3000
BASE_URL=https://abc123.ngrok-free.app
TRUST_PROXY=1
```

**`REDIRECT_URI`:** You can set `REDIRECT_URI=https://abc123.ngrok-free.app/auth/callback` explicitly, or rely on **`BASE_URL`**: the server **sets `REDIRECT_URI` from `BASE_URL`** when `BASE_URL` is `https://…`, so OAuth always matches your ngrok host (avoids leftover `http://localhost:3000/auth/callback` from Windows env or old `.env` lines).

**`BASE_URL`:** If unset, the server uses **`X-Forwarded-Proto`** (ngrok sends `https`) for `/api/config` only; for a reliable OAuth redirect, **set `BASE_URL` to your ngrok HTTPS origin** as above.

Restart `npm start` after saving.

**If Microsoft still redirects to `http://localhost:3000/auth/callback`:**

1. **Only one `REDIRECT_URI=` line** should be active in `.env` (not commented). It must be **`https://YOUR-NGROK-HOST/auth/callback`**, not localhost.
2. **Azure Portal** → your app → **Authentication** → **Redirect URIs** must include that **exact** HTTPS URL.
3. **Windows environment variables:** If `REDIRECT_URI` (or `CLIENT_ID`) is set under *User* or *System* environment variables to localhost, it used to override `.env` until we enabled `override: true` in `server.js`. If problems persist, **delete** `REDIRECT_URI` from Windows env so only `.env` controls it.
4. After `npm start`, check the console line **`[Nimbus] OAuth REDIRECT_URI loaded:`** — it must show your **https** ngrok callback, not localhost.

### 4. Microsoft Entra ID (same app: CloudOps Teams App)

1. **Authentication** → **Web** → **Redirect URIs**  
   Add: `https://abc123.ngrok-free.app/auth/callback`  
   (Keep or remove `http://localhost:3000/...` depending on whether you still test in the browser only.)

2. **Expose an API** → **Application ID URI** must use the **same host** as the tab (lowercase host):  
   `api://abc123.ngrok-free.app/<YOUR_CLIENT_ID>`

3. **Authorized client applications** for Teams (see **TEAMS_SSO.md**) — unchanged except you’re now using a stable-enough host for testing.

### 5. Teams manifest

- **`staticTabs` → `contentUrl`**: `https://abc123.ngrok-free.app/`
- **`validDomains`**: `abc123.ngrok-free.app`
- **`webApplicationInfo`**:
  - `"id"`: your Application (client) ID  
  - `"resource"`: **exactly** the Application ID URI, e.g. `api://abc123.ngrok-free.app/<YOUR_CLIENT_ID>`

### 6. Free ngrok URLs change

Each time you restart ngrok on the free tier, the subdomain may change. Then you must update:

- `.env` → `BASE_URL`, `REDIRECT_URI`
- Entra → redirect URI + Application ID URI
- Teams manifest → `contentUrl`, `validDomains`, `webApplicationInfo.resource`

**Paid ngrok** can reserve a fixed domain to avoid this.

---

## Option B: Node.js + developer certificate (localhost HTTPS)

Use this if you prefer not to use ngrok and are OK managing trust.

1. Install **[mkcert](https://github.com/FiloSottile/mkcert)** and run `mkcert -install` (installs a local CA).
2. Generate certs for localhost, e.g.  
   `mkcert localhost 127.0.0.1`
3. Run Node with **`https.createServer`** using those `.pem` files, **or** put **IIS/nginx** in front with the cert and proxy to port 3000.

**Caveats:**

- **Teams** may still prefer a **public** HTTPS URL for tabs; `https://localhost` can be awkward in Teams clients.
- Everyone’s machine must trust your CA if you share URLs.

Nimbus today ships **HTTP-only** `backend/server.js`. For HTTPS in Node you’d add a small `https` entry script or a reverse proxy—ngrok avoids that code change.

---

## Later: production on **astera.com** with Cloudflare

Assume a hostname like **`nimbus.astera.com`** (pick any subdomain you control).

### High-level architecture

1. **Run Nimbus** on a VM or server (Windows with Node is fine).
2. **DNS in Cloudflare** (zone **astera.com**):
   - **A** (or **AAAA**) record: `nimbus` → your server’s **public IP**, **Proxied** (orange cloud),  
     **or** use **Cloudflare Tunnel** (`cloudflared`) so you don’t open inbound ports—good for home/locked-down networks.

### SSL between users and Cloudflare

- Cloudflare terminates HTTPS for `https://nimbus.astera.com` automatically when the record is proxied.

### SSL between Cloudflare and your origin

| Mode | When to use |
|------|-------------|
| **Full** | Origin speaks HTTPS with any cert (even self-signed). |
| **Full (strict)** | Origin has a **valid** cert (e.g. Let’s Encrypt on the VM, or **Cloudflare Origin Certificate** installed on the server). **Preferred for production.** |

Install/configure HTTPS on the origin (IIS + cert, or nginx/Caddy terminating TLS) **or** run Tunnel so Cloudflare connects outbound to your app.

### Reverse proxy (typical)

- **IIS** or **nginx** on the VM: listen **443**, forward to `http://127.0.0.1:3000` where Node runs.
- Set **`.env`** on the server:

```env
NODE_ENV=production
PORT=3000
BASE_URL=https://nimbus.astera.com
REDIRECT_URI=https://nimbus.astera.com/auth/callback
TRUST_PROXY=1
SESSION_SECRET=<long-random-secret>
```

- Session cookie: `secure: true` is already tied to `NODE_ENV=production` in `server.js`.

### Microsoft Entra ID

1. **Redirect URI**: `https://nimbus.astera.com/auth/callback`
2. **Application ID URI** (Expose an API):  
   `api://nimbus.astera.com/<CLIENT_ID>`  
   (Host must match your tab’s domain; use lowercase for the host part per Microsoft guidance.)

### Teams manifest

- `contentUrl`: `https://nimbus.astera.com/`
- `validDomains`: `nimbus.astera.com`
- `webApplicationInfo.resource`: same as Application ID URI

### Cloudflare settings to double-check

- **SSL/TLS** → **Full (strict)** once origin cert is valid.
- **Always Use HTTPS** (optional but common).
- If the Teams tab or OAuth breaks with **Bot Fight / JS challenges**, you may need a **WAF rule** to be gentler on paths like `/auth/callback` (only if you see issues).

### Cloudflare Tunnel (optional)

If the app runs on a machine **without** a public IP:

1. Install `cloudflared` on that machine.
2. Create a tunnel in Cloudflare Zero Trust and map **`nimbus.astera.com`** → `http://localhost:3000`.
3. DNS for `nimbus.astera.com` is created by the tunnel (proxied).
4. Same Entra + Teams URLs as above, using **`https://nimbus.astera.com`**.

---

## Checklist summary

| Step | ngrok (now) | astera.com (later) |
|------|-------------|---------------------|
| HTTPS URL | ngrok gives you one | `https://nimbus.astera.com` |
| `.env` | `BASE_URL`, `REDIRECT_URI`, `TRUST_PROXY` | Same pattern + `NODE_ENV=production` |
| Entra redirect | `https://<host>/auth/callback` | Same |
| Application ID URI | `api://<host>/<CLIENT_ID>` | `api://nimbus.astera.com/<CLIENT_ID>` |
| Teams manifest | Match host + `webApplicationInfo` | Same |

For Teams SSO details (scopes, authorized clients), keep using **[TEAMS_SSO.md](TEAMS_SSO.md)**.
