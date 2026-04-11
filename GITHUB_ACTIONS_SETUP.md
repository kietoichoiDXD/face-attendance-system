# GitHub Actions Deploy Setup

This repository deploys with the workflow in .github/workflows/firebase-deploy.yml.

Current CI behavior:
- Deploys Firebase Hosting (frontend) from frontend/dist.
- Does not deploy backend Python service through firebase deploy.

## Required GitHub Secrets

Add these secrets in one of the two places below:

- Preferred for current workflow:
  Settings -> Environments -> bdien-muonmay -> Add environment secret
- Alternative:
  Settings -> Secrets and variables -> Actions -> New repository secret

1. GCP_SA_KEY
- Value: full JSON content of a Google Cloud service account key.
- Minimum roles recommended:
  - Firebase Admin (or Firebase Hosting Admin + Cloud Functions Admin if split)
  - Service Account User
  - Cloud Run Admin (if deploying backend services)
  - Storage Admin (if required by your deploy path)

2. FIREBASE_PROJECT_ID
- Value: your Firebase project id, for example bdien-muonmay.

3. FIREBASE_PROJECT_NUMBER (optional)
- Value: your Google Cloud project number, for example 228457572181.
- This is not required for key-based auth, but useful to keep project metadata explicit in CI.

## Values For This Project

Use these values for this repository:

- FIREBASE_PROJECT_ID: bdien-muonmay
- FIREBASE_PROJECT_NUMBER: 228457572181

## Trigger Deploy

1. Push to main or feature/update-20260403.
2. Or run manually from Actions tab using workflow_dispatch.

## Common Failure and Fix

Error:
- google-github-actions/auth failed with missing credentials_json

Fix:
- Ensure GCP_SA_KEY secret exists and is not empty.
- Ensure workflow runs in this repository context, not from forks without secrets.
- Secret name must be exactly: GCP_SA_KEY
- Paste raw JSON content (starts with { and ends with }), do not wrap in quotes.
- This workflow is configured with environment: bdien-muonmay, so Environment secrets are supported.

Error:
- Authenticate to Google Cloud failed

Fix:
- Replace GCP_SA_KEY with the newest rotated key JSON.
- Ensure GCP_SA_KEY project_id equals FIREBASE_PROJECT_ID.
- Ensure the secret is set in Environment: bdien-muonmay.

Error:
- Cannot understand what targets to deploy/serve.

Fix:
- Ensure firebase.json has a valid hosting section.
- Ensure frontend build output exists at frontend/dist in CI.
