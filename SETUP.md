# Nimbus – Complete setup guide

This guide walks you through setting up every value in your `.env` file from scratch. No prior setup required.

---

## 1. PORT and HTTPS (Teams)

**What it is:** The port your Node.js process listens on. **Teams does not insist on port 443** for your app code; it insists that the **tab content URL is HTTPS**.

**Local development:** Use `PORT=3000` and open `http://localhost:3000`. No HTTPS needed.

**Teams / production:** The tab URL must be **HTTPS**. You have two options:

- **Option A (recommended):** Keep `PORT=3000`. Run Node on 3000 and put a reverse proxy (IIS, nginx, etc.) in front that listens on **port 443** with an SSL certificate and forwards requests to `localhost:3000`. Then your public URL is `https://your-server/` (port 443 is default for HTTPS). Set `BASE_URL=https://your-server` and `TRUST_PROXY=1` in `.env`.
- **Option B:** Run Node directly on port 443 with HTTPS (e.g. using a certificate and `https` module). Then set `PORT=443` and use the same certificate.

So: **443** is the usual port for **HTTPS traffic**; your Node app can still listen on 3000 and be reached over 443 via a proxy.

```env
PORT=3000
```

If port 3000 is already in use, change it (e.g. `3001`) and use `http://localhost:3001` and update `REDIRECT_URI` to match.

---

## 2. Azure DevOps: ORG, PROJECT, PIPELINE_ID

These identify **which pipeline** the “Trigger Pipeline” task will run.

### 2.1 Find your organization and project

1. Go to [https://dev.azure.com](https://dev.azure.com) and sign in.
2. In the top-left you’ll see something like: **`MyOrg` > `MyProject`**.
   - **ORG** = the first part (e.g. `MyOrg`). It’s also in the URL: `https://dev.azure.com/MyOrg`.
   - **PROJECT** = the second part (e.g. `MyProject`).

**If you don’t have a project yet:** Click **“New project”**, give it a name (e.g. `Nimbus`), choose visibility, and create it. Then use that project name as **PROJECT** and your org name as **ORG**.

### 2.2 Find (or create) a pipeline and get PIPELINE_ID

1. In Azure DevOps, open your **project**.
2. In the left menu click **Pipelines** → **Pipelines**.
3. Either:
   - **Use an existing pipeline:** Click the pipeline name. Look at the browser URL; it will look like:
     - `https://dev.azure.com/MyOrg/MyProject/_build?definitionId=**123**`
     - The number at the end (**123** in this example) is your **PIPELINE_ID**.
   - **Create a new pipeline:** Click **“New pipeline”** → choose your repo (or “Use the classic editor” and pick “Empty job”) → create the pipeline. Then open it and get the **definitionId** from the URL as above.

**Add to .env:**

```env
ORG=YourOrgName
PROJECT=YourProjectName
PIPELINE_ID=123
```

Use your real org name, project name, and pipeline ID number (no quotes).

---

## 3. Azure AD app: CLIENT_ID, CLIENT_SECRET, TENANT_ID, REDIRECT_URI

These are for **“Sign in with Microsoft”** so users can authenticate once and the app can call Azure DevOps on their behalf.

You need an **App registration** in Azure Active Directory (Microsoft Entra).  
**For detailed step-by-step from scratch (every parameter and permission), see [APP_REGISTRATION.md](APP_REGISTRATION.md).**  
Below is a short summary; follow APP_REGISTRATION.md for the full walkthrough.

### 3.1 Open Azure Portal and create an app registration

1. Go to [https://portal.azure.com](https://portal.azure.com) and sign in.
2. In the search bar at the top, type **“Microsoft Entra ID”** (or **“Azure Active Directory”**) and open it.
3. In the left menu click **App registrations**.
4. Click **+ New registration**.
5. Fill in:
   - **Name:** e.g. `Nimbus` (any name you like).
   - **Supported account types:** choose **“Accounts in this organizational directory only”** (single tenant) unless you need multi-tenant.
   - **Redirect URI:** leave blank for now (we’ll add it in the next step).
6. Click **Register**.

### 3.2 Get CLIENT_ID and TENANT_ID

On the app’s **Overview** page you’ll see:

- **Application (client) ID** → this is **CLIENT_ID**
- **Directory (tenant) ID** → this is **TENANT_ID**

Copy both. Example:

```env
CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
TENANT_ID=11111111-2222-3333-4444-555555555555
```

### 3.3 Set REDIRECT_URI (and add it in Azure)

Your app will send users to Microsoft to sign in, then Microsoft will send them back to your app at a specific URL. That URL is **REDIRECT_URI**.

**For local development:**

1. In the Azure app registration, go to **Authentication** in the left menu.
2. Under **Platform configurations** click **Add a platform** → **Web**.
3. Under **Redirect URIs** add exactly:
   - `http://localhost:3000/auth/callback`
4. Under **Implicit grant and hybrid flows** leave everything unchecked.
5. Click **Configure** / **Save**.

In your `.env`:

```env
REDIRECT_URI=http://localhost:3000/auth/callback
```

If you use a different **PORT** (e.g. 3001), use `http://localhost:3001/auth/callback` both in Azure and in **REDIRECT_URI**.

### 3.4 Create a client secret (CLIENT_SECRET)

1. In the app registration, click **Certificates & secrets** in the left menu.
2. Under **Client secrets** click **+ New client secret**.
3. Add a description (e.g. `Nimbus local`) and choose an expiry (e.g. 24 months).
4. Click **Add**.
5. **Copy the secret Value immediately** (you won’t see it again). This is **CLIENT_SECRET**.

**Add to .env:**

```env
CLIENT_SECRET=the-long-secret-value-you-just-copied
```

Do not share this value or commit it to git. `.env` should already be in `.gitignore`.

### 3.5 Give the app permission to call Azure DevOps

1. In the app registration, click **API permissions**.
2. Click **+ Add a permission**.
3. Choose **APIs my organization uses**.
4. Search for **Azure DevOps** (or **Visual Studio Team Services**).
5. Select **Azure DevOps** and choose **Delegated permissions**.
6. Check **user_impersonation** (or the scope that matches “access Azure DevOps on behalf of the user”).
7. Click **Add permissions**.
8. (Optional but recommended) Click **Grant admin consent for [Your org]** so users don’t have to consent themselves.

---

## 4. Put it all together in `.env`

Open the `.env` file in the Nimbus project root and set every value. No quotes needed. Example:

```env
PORT=3000
ORG=YourOrgName
PROJECT=YourProjectName
PIPELINE_ID=123
CLIENT_ID=a1b2c4-d4-e5f6-7890-abcd-ef1234567890
CLIENT_SECRET=your~secret~value~from~Azure
TENANT_ID=11111111-2222-3333-4444-555555555555
REDIRECT_URI=http://localhost:3000/auth/callback
```

Replace every placeholder with your real values.

**Optional (recommended for production):** Add a random string for session encryption:

```env
SESSION_SECRET=any-long-random-string-you-make-up
```

---

## 5. Run the app

1. In the project folder run:
   ```bash
   npm start
   ```
2. Open a browser and go to: **http://localhost:3000**
3. Click **Sign in with Microsoft** and sign in with an account that has access to your Azure DevOps org/project.
4. After sign-in you should see the task board with **Trigger Pipeline** and **Run Report** tiles.

---

## 6. If something doesn’t work

| Problem | What to check |
|--------|----------------|
| “Auth configuration error” or redirect errors | **REDIRECT_URI** in `.env` must match **exactly** what you added in Azure (Authentication → Web → Redirect URIs). Include `http://` and `/auth/callback`. |
| “Invalid or missing access token” | Make sure you completed sign-in (popup closed after “You’re signed in”). Refresh the page and try again. |
| Pipeline trigger fails (401/403 from Azure DevOps) | The signed-in user must have permission to run that pipeline in the Azure DevOps project. In Azure AD, ensure **API permissions** include Azure DevOps and **user_impersonation**, and that admin consent was granted if required. |
| “Missing OAuth config” | Ensure **CLIENT_ID**, **CLIENT_SECRET**, and **TENANT_ID** are all set in `.env` and that the file is in the project root (same folder as `package.json`). |

---

## 7. Later: using the app in Microsoft Teams (HTTPS)

When you host the app for Teams:

1. Host it over **HTTPS** (e.g. on a Windows VM with IIS or nginx in front of Node, or Node with a certificate).
2. In Azure AD, add a **second** Redirect URI under the same app: `https://your-public-url/auth/callback`.
3. In `.env` set:
   - `REDIRECT_URI=https://your-public-url/auth/callback`
   - Optionally `BASE_URL=https://your-public-url`
   - `SESSION_SECRET` to a strong random value.
4. In your Teams app manifest, set the tab content URL to `https://your-public-url/`.

Use this guide for the initial values; change only **REDIRECT_URI** (and **BASE_URL**) when you switch from localhost to your real URL.
