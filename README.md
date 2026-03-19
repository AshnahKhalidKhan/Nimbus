# Nimbus
_All your cloud needs, simplified._

**Bringing every team together, effortlessly.**
Nimbus is an agent that centralizes all cloud operations, support, and development tasks for your organization on a singular Microsoft Teams app. It empowers internal teams to submit queries, request tasks, report bugs, fix errors and access cloud resources from a single interface, streamlining workflows, improving collaboration, and making cloud management faster, easier, and more efficient.

#### Anything beyond this point, you don't need to read in case you don't want to know how I did what I did.
- Cloned repository on laptop.
- Entered this `npm init -y`
- Then this `npm install express axios body-parser cors dotenv`
- Then created these folders in root and within them:
```
mkdir backend
cd backend
mkdir routes
mkdir controllers
mkdir services
mkdir utils
mkdir middlewares
cd ..
mkdir frontend
cd backend
echo > server.js
echo > routes/triggerPipeline.js
echo > controllers/pipelineController.js
echo > services/azureDevOpsService.js
echo > utils/auth.js
echo > utils/logger.js
echo > middlewares/errorHandler.js
cd ../frontend
echo > index.html
cd ..
echo > .env
cd backend
npm install msal @azure/msal-node
```
- In .env file, add:
```
CLIENT_ID=YOUR_AZURE_AD_APP_ID
TENANT_ID=YOUR_TENANT_ID
PIPELINE_ID=YOUR_PIPELINE_ID
ORG=YOUR_DEVOPS_ORG
PROJECT=YOUR_PROJECT
PORT=443
```
- In .gitignore file, add at end:
```
# SSL / HTTPS files
*.pem
*.key
*.crt

# Temporary frontend/dev files
frontend/tmp/
frontend/temp/

# Debug / backup
*.dump
*.bak
*.tmp

# Windows OS files
Thumbs.db
ehthumbs.db
Desktop.ini

# Safety for secrets
*.secret
```

------------------------------------------------------------------------------------------------------------------

## Teams multi-task platform (current app)

This app is a **Teams tab–ready task board**: one Microsoft sign-in, then run multiple tasks (e.g. trigger Azure DevOps pipeline, run a report) without logging in again.

**First-time setup?** See **[SETUP.md](SETUP.md)** for step-by-step configuration. For **Azure AD App Registration from scratch** (every parameter and permission), see **[APP_REGISTRATION.md](APP_REGISTRATION.md)**. For **Teams Tab SSO** (no extra popup when already signed into Teams), see **[TEAMS_SSO.md](TEAMS_SSO.md)** and **`teams/manifest.example.json`**.

**HTTPS for Teams (ngrok now, Cloudflare / astera.com later):** **[NGROK_AND_DEPLOY.md](NGROK_AND_DEPLOY.md)**. **Verify everything works:** **[TESTING.md](TESTING.md)**. **Publish in Microsoft Teams (zip, sideload, org catalog):** **[PUBLISH_TEAMS.md](PUBLISH_TEAMS.md)**.

### Quick start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure `.env`** (see below). Required: `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `REDIRECT_URI`, `ORG`, `PROJECT`, `PIPELINE_ID`. Optional: `SESSION_SECRET`, `BASE_URL`, `TRUST_PROXY`.

3. **Run the server**
   ```bash
   npm start
   ```
   Open `http://localhost:3000`. Sign in with Microsoft, then use the task tiles.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default `3000`) |
| `CLIENT_ID` | Yes | Azure AD app (client) ID |
| `CLIENT_SECRET` | Yes | Azure AD app secret |
| `TENANT_ID` | Yes | Azure AD tenant ID |
| `REDIRECT_URI` | Yes | Exact redirect URL (e.g. `http://localhost:3000/auth/callback` or your HTTPS URL for Teams) |
| `ORG` | Yes | Azure DevOps organization |
| `PROJECT` | Yes | Azure DevOps project |
| `PIPELINE_ID` | Yes | Pipeline to trigger |
| `SESSION_SECRET` | Recommended | Random string for session cookies (use a strong secret in production) |
| `BASE_URL` | Optional | Full app URL (e.g. `https://your-server/auth/callback`) when behind a proxy |
| `TRUST_PROXY` | Optional | Set to `1` when behind HTTPS reverse proxy |

### Azure AD app setup (for OAuth)

1. In Azure Portal → Azure Active Directory → App registrations → New registration.
2. Set **Redirect URI** to: `Web` → `https://your-domain/auth/callback` (or `http://localhost:3000/auth/callback` for local).
3. Create a **Client secret** and put it in `CLIENT_SECRET`.
4. Under **API permissions**, add: Azure DevOps → `user_impersonation` (or the scope your app uses).

### Running as a Teams tab

1. Host the app on **HTTPS** (required for Teams). Use a reverse proxy (e.g. IIS, nginx) or run Node with TLS.
2. In Teams manifest, set the tab content URL to your app’s root (e.g. `https://your-server/`).
3. In Azure AD, set the app’s **Redirect URI** to `https://your-server/auth/callback`.
4. Set `REDIRECT_URI` and optionally `BASE_URL` in `.env` to that same base URL.

### Adding a new task

To add another tile and task:

1. **Backend**
   - Add a **controller** in `backend/controllers/` (e.g. `myTaskController.js`).
   - Add a **service** in `backend/services/` for the actual logic (reuse `req.session.accessToken`).
   - Add a **route** in `backend/routes/` using `requireAuth` and the new controller.
   - Register the route in `backend/server.js` (e.g. `app.use('/api/myTask', myTaskRoute)`).

2. **Frontend**
   - In `frontend/index.html`, add a new tile with `data-task="myTask"`.
   - In the `taskSchemas` object, add an entry for `myTask` with `title`, `endpoint`, `method`, and `fields` (form definition).

No extra login step is needed; the same session token is used for all tasks.