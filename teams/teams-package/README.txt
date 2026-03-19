Nimbus / CloudOps — Teams app package (ready to zip)
=====================================================

ZIP ONLY THESE THREE FILES (Teams rejects packages with extra files in some tenants):
  - manifest.json
  - icon-outline.png
  - icon-color.png

Do NOT include README.txt, generate-icons.ps1, or this zip inside the zip.

In Windows: Ctrl+click the three files → Right-click → Send to → Compressed (zipped) folder.

To recreate placeholder icons:  powershell -ExecutionPolicy Bypass -File .\generate-icons.ps1
Upload the .zip in Teams: Apps → Upload a customised app.

Before publishing broadly:
  - Replace ngrok URLs in manifest.json with your production HTTPS URL when you deploy.
  - Bump "version" when you change the manifest.
  - Swap placeholder icons for final brand assets (keep 32x32 and 192x192 PNG).

See PUBLISH_TEAMS.md in the project root for full steps.
