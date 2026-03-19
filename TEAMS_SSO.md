# Teams Tab SSO (single sign-on)

When this is configured, users **do not need a separate browser popup** to sign in: the tab uses the identity they already used in Teams. The tab calls `getAuthToken()`, your server runs an **On-Behalf-Of (OBO)** exchange to get an **Azure DevOps** access token, and stores it in the session (same as the redirect flow).

Official background: [Configure tab app in Microsoft Entra ID](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-register-aad), [Add code for tab SSO](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-code).

---

## What Nimbus does

| Step | Where |
|------|--------|
| 1 | Tab loads `MicrosoftTeams.min.js` and calls `microsoftTeams.app.initialize()` then `microsoftTeams.authentication.getAuthToken()`. |
| 2 | Frontend `POST /auth/teams-sso` with `{ token: "<JWT>" }` (same origin + cookies). |
| 3 | Backend uses MSAL **On-Behalf-Of** with that JWT to acquire `499b84ac-1321-427f-aa17-267ca6975798/.default` (Azure DevOps). |
| 4 | Session stores the Azure DevOps access token; tasks use it as before. |
| 5 | Outside Teams (browser), `getAuthToken()` fails → app falls back to **Sign in with Microsoft** (redirect/popup). |

---

## Local development: is HTTPS required?

**Yes, for testing inside Microsoft Teams.** Teams loads tab content from a **HTTPS** URL. The host in that URL should match what you put in Entra **Application ID URI** (`api://<host>/<CLIENT_ID>`) and in the Teams manifest **`webApplicationInfo.resource`**.

| What you’re doing | Typical setup |
|-------------------|-----------------|
| **App on `http://localhost:3000` only** | Fine for browser dev and **Sign in with Microsoft** (redirect flow). **Teams Tab SSO is not realistically testable** against plain HTTP localhost as the tab URL. |
| **Testing the tab + SSO in Teams** | Use an **HTTPS tunnel** to your machine (ngrok, Cloudflare Tunnel, **Visual Studio Dev Tunnels**, Azure Dev Tunnels, etc.). Example: tab URL `https://abc123.ngrok-free.app` → use `api://abc123.ngrok-free.app/<CLIENT_ID>`. **Update Entra + manifest** when the tunnel URL changes. |
| **HTTPS on localhost** | Possible with a dev certificate (e.g. `https://localhost:3443`). Some setups use `api://localhost/<CLIENT_ID>`—confirm in Entra and Teams that the host matches your tab URL. |

So **`<your-https-tab-host>`** means the hostname of the **HTTPS** URL where the tab is hosted in Teams—not optional for real Teams + SSO validation, even while you’re still developing on your laptop.

**Practical guide:** **[NGROK_AND_DEPLOY.md](NGROK_AND_DEPLOY.md)** (ngrok vs Node dev cert, then **astera.com** + Cloudflare).

---

## 1. Microsoft Entra ID (same app as Nimbus: **CloudOps Teams App**)

### 1.1 Access token version

1. **App registrations** → your app → **Manifest**.
2. Set **`requestedAccessTokenVersion`** to **`2`**.
3. **Save**.

### 1.2 Expose an API

1. **Expose an API** → **Add** (set Application ID URI).

   Format (must match how the tab is hosted — **domain must match your HTTPS tab URL**, lowercase domain):

   ```text
   api://<your-tab-host>/<CLIENT_ID>
   ```

   Examples:

   - Tab served at `https://nimbus.contoso.com/` →  
     `api://nimbus.contoso.com/9abcda82-2fc0-424c-b6b3-d493c5677685`
   - Using ngrok: `api://abc123.ngrok-free.app/<CLIENT_ID>` (update when the tunnel URL changes).

   `<CLIENT_ID>` is **Application (client) ID** (same as in `.env` `CLIENT_ID`).

2. **Add a scope**

   - **Scope name:** `access_as_user` (full scope will be `api://.../access_as_user`).
   - Fill **Who can consent**, **Admin consent**, **User consent** display names/descriptions as required.
   - **State:** Enabled.

### 1.3 Authorize Teams to call your API

Still under **Expose an API** → **Authorized client applications** → **Add a client application**.

Add these Microsoft client IDs and tick your **`access_as_user`** scope for each (names from [Microsoft docs](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-register-aad#to-configure-authorized-client-application)):

| Use | Client ID |
|-----|-----------|
| Teams desktop, mobile | `1fec8e78-bce4-4aaf-ab1b-5451cc387264` |
| Teams web | `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` |

(You can add Microsoft 365 clients too if you host the same UI in Outlook/M365.)

### 1.4 API permissions (Azure DevOps) — already required for pipeline tasks

Under **API permissions**, ensure **Azure DevOps** → **Delegated** → **user_impersonation** is added and **admin consent** granted (same as the redirect login flow).

---

## 2. Teams app manifest (`manifest.json`)

Your Teams package must tell the client which Entra app and **resource** string to use for `getAuthToken()`. The **`resource`** must match the **Application ID URI** exactly (from **Expose an API**).

Example snippet (replace placeholders):

```json
"webApplicationInfo": {
  "id": "9abcda82-2fc0-424c-b6b3-d493c5677685",
  "resource": "api://your-tab-host/9abcda82-2fc0-424c-b6b3-d493c5677685"
}
```

- **`id`:** Application (client) ID (GUID).
- **`resource`:** Same string as Entra **Application ID URI** (no trailing slash).

Also set **valid domains** to your tab’s host (see [Teams manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)).

A starter file is in this repo: **`teams/manifest.example.json`** (copy and fill in URLs, IDs, and icons).

---

## 3. Hosting

- Tab content URL must be **HTTPS** and match the **domain** used in `api://.../<CLIENT_ID>`.
- If you use a **reverse proxy**, set in `.env`: `BASE_URL`, `TRUST_PROXY=1` (see `SETUP.md`).

---

## 4. Troubleshooting

| Symptom | What to check |
|--------|----------------|
| `Teams SSO failed` / 401 from `/auth/teams-sso` | Application ID URI, scope, and **Authorized client applications**; manifest **`webApplicationInfo.resource`** matches URI exactly. |
| Works on desktop but not web (or the reverse) | Add the missing Teams client ID under **Authorized client applications**. |
| OBO / `invalid_grant` | **user_impersonation** for Azure DevOps granted; user allowed to use DevOps. |
| SSO works locally but not with ngrok | Update Entra **Application ID URI** and manifest **resource** whenever the tunnel host changes. |
| Outside Teams, still need button | Expected: SSO only runs inside Teams; browser keeps **Sign in with Microsoft**. |

---

## 5. Security note

The Teams token is sent once to your backend over HTTPS; only the **Azure DevOps** access token is stored in the **server session**, not in `localStorage`.
