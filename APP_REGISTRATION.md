# Azure AD App Registration – Step-by-step (from scratch)

This guide creates the **App registration** in Microsoft Entra ID (Azure AD) that Nimbus uses for “Sign in with Microsoft” and for calling Azure DevOps. Do this once; then copy **Application (client) ID**, **Directory (tenant) ID**, and a **client secret** into your `.env` file.

---

## Before you start

- You need access to **Azure Portal** (https://portal.azure.com) with permission to create app registrations (e.g. Application administrator or Global administrator).
- Your **organization** in Azure DevOps is the first part of the URL: e.g. `https://dev.azure.com/astera` → **organization = `astera`**.
- Your **projects** (e.g. Astera Cloud, Enterprise) and **pipeline definition IDs** (e.g. `295` from `definitionId=295`) are used in `.env` and optionally in the pipeline form; they are **not** configured in the App registration.

---

## Step 1: Open Microsoft Entra ID (Azure AD)

1. Go to **https://portal.azure.com** and sign in.
2. In the top search bar, type **Microsoft Entra ID** (or **Azure Active Directory**).
3. Click **Microsoft Entra ID** in the results.
4. You should see the overview page for your tenant (e.g. “Contoso” or your org name).

---

## Step 2: Create a new app registration

1. In the left menu, click **App registrations**.
2. Click **+ New registration** at the top.
3. Fill in the form:

   | Field | What to enter |
   |-------|-------------------------------|
   | **Name** | A display name for the app, e.g. `Nimbus` or `Nimbus Teams`. Users may see this on the consent screen. |
   | **Supported account types** | **Accounts in this organizational directory only (Single tenant)** — so only your organization’s Microsoft accounts can sign in. Use “Accounts in any organizational directory” only if you need other tenants. |
   | **Redirect URI** | Leave blank for now. We will add it in the next section. |

4. Click **Register**.

---

## Step 3: Copy Application (client) ID and Directory (tenant) ID

After the app is created, you land on the app’s **Overview** page.

1. Find **Application (client) ID**  
   - Copy this value.  
   - In `.env` this is **CLIENT_ID**.

2. Find **Directory (tenant) ID**  
   - Copy this value.  
   - In `.env` this is **TENANT_ID**.

Example (use your own values):

```env
CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
TENANT_ID=11111111-2222-3333-4444-555555555555
```

---

## Step 4: Add a Web redirect URI (Authentication)

The redirect URI is where Microsoft sends the user after they sign in. It **must match exactly** what you put in `.env` as **REDIRECT_URI**.

1. In the left menu of the app, click **Authentication**.
2. Under **Platform configurations**, click **Add a platform**.
3. Select **Web**.
4. Under **Redirect URIs**:
   - **Local development:** add `http://localhost:3000/auth/callback`  
     (If your app runs on a different port, use that port, e.g. `http://localhost:3001/auth/callback`.)
   - **Teams / production:** add your HTTPS URL, e.g. `https://your-server.example.com/auth/callback`.
5. Under **Implicit grant and hybrid flows**: leave **Access tokens** and **ID tokens** **unchecked** (we use the authorization-code flow only).
6. Under **Advanced settings** → **Allow public client flows**: set to **No**.
7. Click **Configure** or **Save**.

Your **REDIRECT_URI** in `.env` must be **exactly** one of these URLs (same scheme, host, port, and path).

---

## Step 5: Create a client secret (Certificates & secrets)

The app uses a **client secret** to prove its identity when exchanging the authorization code for tokens. This value goes in **CLIENT_SECRET** in `.env**.

1. In the left menu, click **Certificates & secrets**.
2. Under **Client secrets**, click **+ New client secret**.
3. **Description:** e.g. `Nimbus local` or `Nimbus production`.
4. **Expires:** choose a duration (e.g. 24 months). You will need to create a new secret before it expires and update `.env`.
5. Click **Add**.
6. In the **Value** column, click **Copy** to copy the secret.  
   - **You can only see and copy it once.** Paste it into `.env` as **CLIENT_SECRET** immediately.  
   - Do not commit this value to git; keep `.env` in `.gitignore`.

Example (value is fake):

```env
CLIENT_SECRET=abc123~.LongRandomString.From.Azure
```

---

## Step 6: API permissions (Azure DevOps)

The app must have permission to call Azure DevOps on behalf of the signed-in user.

1. In the left menu, click **API permissions**.
2. You may see a default “Microsoft Graph” permission; you can leave it or remove it. We need **Azure DevOps**.
3. Click **+ Add a permission**.
4. Under **APIs my organization uses**, search for **Azure DevOps** (or **Visual Studio Team Services**).
5. Click **Azure DevOps**.
6. Select **Delegated permissions**.
7. Check **user_impersonation** (allows the app to act as the user when calling Azure DevOps).
8. Click **Add permissions**.
9. (Recommended) Click **Grant admin consent for [Your organization]** so users don’t have to consent themselves. Confirm if prompted.

You should see **Azure DevOps** with **user_impersonation** and status **Granted for [Your org]**.

---

## Step 7: Optional – Token configuration (optional claims)

You can leave the default token configuration. If you need more claims (e.g. for debugging), use **Token configuration** → **Add optional claim** and choose the appropriate token type and claims. Not required for Nimbus.

**Does this affect “already signed into Teams, don’t sign in again”?** **No.** Optional claims only add extra fields inside tokens; they do **not** control whether the user sees a second login. Avoiding a separate sign-in when the user is already in Teams is done with **Teams tab SSO** (e.g. the Teams JavaScript SDK `getAuthToken()` and a backend token exchange / On-Behalf-Of flow to get an Azure DevOps token). That is separate from Step 7. The current Nimbus flow uses a browser redirect/popup OAuth; upgrading to Teams SSO is an app-code change, not something you fix under Token configuration.

---

## Step 8: Summary – what goes in `.env`

| `.env` variable | Where you got it |
|------------------|-------------------|
| **CLIENT_ID** | App registration → **Overview** → Application (client) ID |
| **TENANT_ID** | App registration → **Overview** → Directory (tenant) ID |
| **CLIENT_SECRET** | App registration → **Certificates & secrets** → New client secret → **Value** (copy once) |
| **REDIRECT_URI** | Must match **exactly** one of the URIs under **Authentication** → **Web** → Redirect URIs (e.g. `http://localhost:3000/auth/callback` or `https://your-server/auth/callback`) |

**ORG**, **PROJECT**, **PIPELINE_ID**, and **PORT** are **not** configured in the App registration; they come from Azure DevOps and your server setup (see main SETUP.md and the comments in `.env`).

---

## Troubleshooting

| Problem | What to check |
|--------|----------------|
| **AADSTS7000215 – Invalid client secret** | Azure is rejecting what your app sends. See checklist below. |
| “AADSTS50011: Redirect URI mismatch” | The **REDIRECT_URI** in `.env` must match **exactly** (including `http` vs `https`, port, and `/auth/callback`) one of the Redirect URIs in **Authentication** → **Web**. |
| “Invalid client secret” | Ensure you copied the **Value** of the client secret (not the Secret ID). Create a new secret if the old one was never saved. |

### AADSTS7000215 – Invalid client secret (detailed)

Microsoft expects the **secret Value**, not the **Secret ID**:

1. Open **App registrations** → **CloudOps Teams App** (or your app) → **Certificates & secrets**.
2. Under **Client secrets** you see two columns:
   - **Secret ID** – a UUID like `a1b2c3d4-e5f6-...` → **do not** put this in `.env`.
   - **Value** – shown **only once** when the secret is created (often contains `~` and mixed characters) → this is **CLIENT_SECRET**.
3. If you only have Secret ID visible, **create a new client secret** → **Add** → copy **Value** immediately → paste into `.env` as `CLIENT_SECRET=...` with **no spaces** around `=` and **no quotes** unless the whole value is quoted correctly.
4. **Restart** the Node server after changing `.env` (env is read at startup).
5. Confirm the secret belongs to the **same** app as **Application (client) ID** in `.env` (not a secret from another registration).
6. If someone **rotated** the secret in Azure, old values stop working immediately—use the newest **Value** only.

The Nimbus backend trims spaces and strips accidental surrounding quotes from `CLIENT_SECRET` to avoid paste mistakes; if it still fails after the steps above, create a **new** secret and try again.

7. **Windows:** If `CLIENT_SECRET` is set in **System / User environment variables**, it can override your `.env` file (dotenv does not replace existing variables by default). Check **Settings → System → About → Advanced system settings → Environment Variables** and remove or fix any `CLIENT_SECRET` there, or run the app in a clean shell.
| “Need admin approval” / consent | Have an admin click **Grant admin consent for [Your org]** under **API permissions**. |
| 401/403 when calling Azure DevOps | Ensure **user_impersonation** is added and consented. The signed-in user must also have permission to run pipelines in the Azure DevOps project. |
