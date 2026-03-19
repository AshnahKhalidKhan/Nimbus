# Publish Nimbus as a Microsoft Teams app

Your tab is already a valid **Teams app** once you have a **manifest** + **icons** + **zip**. Below: test on your machine, share in your org, or list in the Store.

Official overview: [Distribute your Microsoft Teams app](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-publish-overview).

---

## 1. What you ship

| Item | Purpose |
|------|---------|
| **`manifest.json`** | Teams app definition (tabs, URLs, Entra app id, domains). |
| **`icon-outline.png`** | Outline icon, **32×32** px (PNG). |
| **`icon-color.png`** | Color icon, **192×192** px (PNG). |

Put **`manifest.json` at the root** of the zip (not inside a subfolder). Names must match the `"icons"` section in the manifest.

**Ready-to-zip folder:** **`teams/teams-package/`** contains `manifest.json` + `icon-outline.png` + `icon-color.png`. Zip **only those three files** and upload (see `README.txt` inside that folder). Regenerate icons with `generate-icons.ps1` if needed.

---

## 2. Before packaging

1. **Stable HTTPS URL** for production (e.g. `https://nimbus.astera.com/`), not a temporary ngrok URL, unless you only demo briefly.
2. **Entra (Azure AD)** — redirect URI, **Expose an API**, **webApplicationInfo** in the manifest aligned with **`TEAMS_SSO.md`**.
3. **Update the manifest** — `contentUrl`, `websiteUrl`, `validDomains`, `webApplicationInfo.resource`, version bump when you change behavior.
4. **`developer` URLs** — `websiteUrl`, `privacyUrl`, `termsOfUseUrl` must be real HTTPS pages (can be simple placeholders for internal apps).

---

## 3. Build the `.zip` (manual)

1. Create a folder, e.g. `teams-package/`.
2. Copy **`manifest.json`** (final name must be exactly `manifest.json`).
3. Add **`icon-outline.png`** (32×32) and **`icon-color.png`** (192×192).
4. Select **only** those three files → **Send to → Compressed (zipped) folder**  
   - Do **not** zip the parent folder in a way that adds an extra directory layer; Teams expects `manifest.json` at the **root** of the zip.

Validate (optional): [Teams developer portal](https://dev.teams.microsoft.com/) → **Apps** → **Import app** / validation tools.

---

## 4. Install for yourself (sideload / upload custom app)

Use this to **test** before publishing widely.

1. Open **Microsoft Teams** (desktop or web).
2. **Apps** (left rail) → **Manage your apps** (bottom) → **Upload an app**  
   - Or: **Apps** → **Built for your org** / search **Upload** — UI varies slightly by tenant.
3. Choose **Upload a customised app** (wording may be “Upload custom app”).
4. Select your **`.zip`**.

If you don’t see upload:

- Your tenant may block custom apps. An admin must allow it:  
  [Manage custom app policies](https://learn.microsoft.com/en-us/microsoftteams/teams-custom-app-policies-and-settings)  
  (Teams admin center → **Teams apps** → **Setup policies** / **Permission policies**).

---

## 5. Publish to your organization (recommended for internal)

So **everyone in your company** can install from the catalog without sideloading:

1. **Teams admin center** — [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com)  
   (requires **Global admin** or **Teams administrator** with app permission).
2. **Teams apps** → **Manage apps** → **Upload** (or **Upload new app**).
3. Upload the same **`.zip`**.
4. After approval (if your org uses an approval flow), the app appears under **Built for your org** in Teams for allowed users.

More detail: [Upload your app in Teams admin center](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload).

---

## 6. Microsoft Teams Store (public / multi-tenant)

To list the app in the **public Store**:

- Requires **Microsoft Partner Center** submission, validation, privacy terms, support contact, etc.
- Start here: [Publish your app to the Microsoft Teams Store](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/publish).

This is a larger process; internal rollout usually uses **section 5** first.

---

## 7. Checklist

- [ ] Tab opens over **HTTPS** with a URL you control long-term.  
- [ ] Manifest **`id`** is a **unique GUID** per app package (new GUID if you fork a new product).  
- [ ] **`version`** incremented when you release updates.  
- [ ] **`validDomains`** includes the host of `contentUrl` only (no `https://`).  
- [ ] Icons present and sizes correct.  
- [ ] Zip structure: `manifest.json` + icons at **root** of zip.  
- [ ] Tenant allows custom / org-uploaded apps as needed.

---

## 8. After you change the app

1. Bump **`version`** in `manifest.json` (e.g. `1.0.1`).  
2. Rebuild the zip and **upload again** (sideload or admin center) so Teams picks up the new package.

For day-to-day **code** changes on your server, you often **only redeploy the website**; users get updates on next load. You **must** repackage/reupload only when **manifest** (tabs, domains, app id, etc.) changes.
