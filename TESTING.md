# How to verify Nimbus is working

Follow these checks in order. Replace `YOUR_NGROK_HOST` with your real ngrok hostname (e.g. `6c1d-103-244-175-114.ngrok-free.app`) and use **HTTPS** for anything you configured for Teams.

---

## 1. Server is running

1. In the project folder: `npm start`
2. You should see: `Backend running on port 3000` (or your `PORT`).

---

## 2. `.env` matches your public URL (ngrok)

If you use ngrok, confirm (no trailing slash on `BASE_URL` is best; redirect URI must include `/auth/callback`):

```env
BASE_URL=https://YOUR_NGROK_HOST
REDIRECT_URI=https://YOUR_NGROK_HOST/auth/callback
TRUST_PROXY=1
```

Restart the server after any `.env` change.

---

## 3. Browser: app loads over HTTPS

1. Open: `https://YOUR_NGROK_HOST/`
2. You should see **Nimbus Task Board** and either the task tiles or a sign-in prompt.

If the page does not load, check: Node is running, ngrok is forwarding to the correct port, firewall.

---

## 4. Sign-in (redirect / popup flow)

1. Click **Sign in with Microsoft** (or the prompt button).
2. Complete Microsoft sign-in in the popup/redirect.
3. After success, you should see **Signed in as …** and the **Trigger Pipeline** / **Run Report** tiles (no “Sign in” wall).

**Quick API check (optional):** In the same browser session, open:

`https://YOUR_NGROK_HOST/auth/session`

You should see JSON like: `{"authenticated":true,"user":"user@domain.com"}` (or similar).

---

## 5. Task APIs (session + token)

### Run Report (safe, no Azure DevOps call to pipelines)

1. Open **Run Report**, fill the form, **Submit**.
2. You should get a success message (placeholder response from the backend).

### Trigger Pipeline (calls real Azure DevOps)

1. Open **Trigger Pipeline**, fill required fields, **Submit**.
2. Success: message says pipeline triggered; check **Azure DevOps** → **Pipelines** → latest run for that definition.
3. Failure: read the alert/error — often **403/401** if the signed-in user cannot run that pipeline, or wrong org/project/pipeline ID.

---

## 6. Microsoft Teams (tab + optional SSO)

### 6.1 Install / update the app

1. **Teams** → **Apps** → **Manage your apps** → **Upload a custom app** (or your org’s process).
2. Upload the **zip** that contains `manifest.json` + icons.

### 6.2 Open the tab

1. Pin/open your app’s tab.
2. The tab should load `https://YOUR_NGROK_HOST/` (same UI as the browser).

### 6.3 Teams SSO (if you configured Expose an API + manifest `webApplicationInfo`)

1. Open the tab **inside Teams** (desktop or web).
2. You should land **already signed in** or with **no extra Microsoft login popup** (first time may still ask for consent depending on tenant policy).

If you still see **Sign in with Microsoft** only, SSO is not active yet — compare **TEAMS_SSO.md** (Application ID URI, authorized Teams clients, `webApplicationInfo.resource`).

### 6.4 Run a task from Teams

Repeat **section 5** from the tab. Session cookies must be sent to the **same** origin (`YOUR_NGROK_HOST`).

---

## 7. Entra (Azure AD) alignment (if something fails)

| Check | Where |
|--------|--------|
| Redirect URI | App registration → **Authentication** → includes `https://YOUR_NGROK_HOST/auth/callback` |
| API permissions | **Azure DevOps** → `user_impersonation` → **Granted** |
| Tab SSO | **Expose an API** URI = `api://YOUR_NGROK_HOST/<CLIENT_ID>`; **Authorized clients** for Teams; manifest **`resource`** matches exactly |

---

## 8. “You’re signed in” in the popup, but the main page still says Sign in

**Current behavior:** Sign-in uses a **full-page redirect**: Microsoft → `/auth/callback` → **302 redirect to `/`** (always, including Microsoft Teams). You should land on the task board signed in.

If you still see issues:

- **Same origin:** Open the app only at **`https://YOUR-NGROK-HOST/`** (same host as `REDIRECT_URI`). Do not mix **`http://localhost`** and ngrok.
- **Yellow “Wrong URL” banner:** Fix `BASE_URL` / forwarded headers (see **NGROK_AND_DEPLOY.md**) or open the linked correct URL.

Older popup-only flows could fail with ngrok/HTTPS; full-page OAuth avoids that.

---

## 9. Quick problem → what to try

| Symptom | What to try |
|---------|-------------|
| Blank tab / connection error | Node running, ngrok running, `BASE_URL` / tunnel port correct |
| `Sign-in failed` / `invalid_client` | `CLIENT_SECRET`, `REDIRECT_URI`, restart server |
| Session not sticking | Same browser, cookies allowed, **same origin as `REDIRECT_URI`** (don’t use localhost if OAuth is on ngrok), HTTPS URL stable (ngrok URL changes break cookies until you update `.env` + Entra) |
| 401 on API after login | Sign in again; check `/auth/session` |
| Pipeline 403 | User permissions in Azure DevOps project; pipeline ID / project correct |

---

## 10. Optional: health from command line

Replace the host:

```bash
curl -s "https://YOUR_NGROK_HOST/api/config"
```

Expect JSON with `authLoginUrl` and `apiBase` pointing at your ngrok host.

---

When all of **3 → 4 → 5** work in the browser and **6** works in Teams, your setup is good. If sign-in looks stuck after the popup, see **section 8**; for other issues use **section 9**.
