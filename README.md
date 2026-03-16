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