#!/usr/bin/env pwsh
<#
.SYNOPSIS
Automated GCP deployment script for Face Attendance System
.DESCRIPTION
One-command GCP infrastructure setup including:
- Service enablement (Firestore, Cloud Storage, Vision API, Cloud Run, Cloud Functions)
- Bucket creation with lifecycle policies
- Firestore database initialization
- Cloud Run deployment
- Cloud Functions Gen2 deployment with GCS trigger
- IAM role binding
.PARAMETER ProjectId
GCP Project ID (required)
.PARAMETER Region
GCP region (default: asia-southeast1)
.PARAMETER StudentBucket
Cloud Storage bucket for student images (default: {ProjectId}-students)
.PARAMETER ClassBucket
Cloud Storage bucket for class attendance images (default: {ProjectId}-classes)
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,
    [string]$Region = "asia-southeast1",
    [string]$StudentBucket = "",
    [string]$ClassBucket = ""
)

# Colors for output
$success = "`e[32m✓`e[0m"
$error = "`e[91m✗`e[0m"
$info = "`e[36mℹ`e[0m"
$warn = "`e[93m⚠`e[0m"

function Write-Step([string]$message) {
    Write-Host "$info $message" -ForegroundColor Cyan
}

function Write-Success([string]$message) {
    Write-Host "$success $message" -ForegroundColor Green
}

function Write-Error-Custom([string]$message) {
    Write-Host "$error $message" -ForegroundColor Red
}

function Write-Warn([string]$message) {
    Write-Host "$warn $message" -ForegroundColor Yellow
}

if ($StudentBucket -eq "") { $StudentBucket = "$ProjectId-students" }
if ($ClassBucket -eq "") { $ClassBucket = "$ProjectId-classes" }

Write-Host "`n=== Face Attendance System - GCP Deployment ===" -ForegroundColor Magenta

# 1. Validate prerequisites
Write-Step "Checking prerequisites..."
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Success "gcloud CLI installed: $gcloudVersion"
}
catch {
    Write-Error-Custom "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# 2. Set project
Write-Step "Setting GCP project to $ProjectId..."
gcloud config set project $ProjectId 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to set project. Verify project ID exists."
    exit 1
}
Write-Success "Project set to $ProjectId"

# 3. Enable required services
Write-Step "Enabling required GCP services..."
$services = @(
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "vision.googleapis.com",
    "run.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "logging.googleapis.com"
)

foreach ($service in $services) {
    Write-Step "  Enabling $service..."
    gcloud services enable $service --quiet 2>&1 | Out-Null
    Write-Success "  Enabled $service"
}

# 4. Create Cloud Storage buckets
Write-Step "`nSetting up Cloud Storage buckets..."

foreach ($bucket in @($StudentBucket, $ClassBucket)) {
    $bucketExists = gcloud storage buckets describe "gs://$bucket" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Warn "  Bucket gs://$bucket already exists"
    }
    else {
        Write-Step "  Creating bucket gs://$bucket..."
        gcloud storage buckets create "gs://$bucket" --location=$Region --uniform-bucket-level-access 2>&1 | Out-Null
        Write-Success "  Created bucket gs://$bucket"
        
        # Set lifecycle policy (delete old images after 90 days)
        $lifecyclePolicy = @{
            lifecycle = @{
                rule = @(
                    @{
                        action = @{ type = "Delete" }
                        condition = @{ age = 90 }
                    }
                )
            }
        } | ConvertTo-Json
        
        $lifecycleFile = New-TemporaryFile
        Set-Content -Path $lifecycleFile -Value $lifecyclePolicy -Encoding UTF8
        gcloud storage buckets update "gs://$bucket" --lifecycle-file=$lifecycleFile 2>&1 | Out-Null
        Remove-Item $lifecycleFile
        Write-Success "  Applied lifecycle policy (90-day retention)"
    }
}

# 5. Create Firestore database
Write-Step "`nSetting up Firestore database..."
$firestoreExists = gcloud firestore databases list --format="value(name)" 2>&1 | Select-Object -First 1
if ($firestoreExists) {
    Write-Warn "  Firestore database already exists"
}
else {
    Write-Step "  Creating Firestore database in Native mode..."
    gcloud firestore databases create --region=$Region --type=firestore-native 2>&1 | Out-Null
    Write-Success "  Created Firestore database"
}

# 6. Prepare Cloud Run deployment
Write-Step "`nPreparing Cloud Run deployment..."
$artifactRepo = "face-attendance"
$repoExists = gcloud artifacts repositories describe $artifactRepo --repository-format=docker --location=$Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Step "  Creating Artifact Registry repository..."
    gcloud artifacts repositories create $artifactRepo --repository-format=docker --location=$Region --quiet 2>&1 | Out-Null
    Write-Success "  Created Artifact Registry repository"
}
else {
    Write-Warn "  Artifact Registry repository already exists"
}

# 7. Build and deploy to Cloud Run
Write-Step "`nBuilding and deploying to Cloud Run..."
$imageUri = "$Region-docker.pkg.dev/$ProjectId/$artifactRepo/face-attendance:latest"

Write-Step "  Building Docker image..."
gcloud builds submit --tag=$imageUri 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to build Docker image. Check Dockerfile and logs."
    exit 1
}
Write-Success "  Built Docker image"

Write-Step "  Deploying to Cloud Run..."
gcloud run deploy face-attendance `
    --image=$imageUri `
    --region=$Region `
    --platform=managed `
    --allow-unauthenticated `
    --set-env-vars="USE_GCP=true,STUDENT_BUCKET=$StudentBucket,CLASS_BUCKET=$ClassBucket,FIRESTORE_STUDENTS_COLLECTION=students,FIRESTORE_ATTENDANCE_COLLECTION=attendance" `
    --memory=2Gi `
    --cpu=2 `
    --timeout=3600 `
    --quiet 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to deploy to Cloud Run"
    exit 1
}

$serviceUrl = gcloud run services describe face-attendance --region=$Region --format="value(status.url)"
Write-Success "Deployed to Cloud Run: $serviceUrl"

# 8. Deploy Cloud Functions for GCS trigger
Write-Step "`nDeploying Cloud Functions for GCS trigger..."

# Create Functions Gen2 wrapper
$functionDir = "./cloud-function"
$null = New-Item -ItemType Directory -Path $functionDir -Force
$null = New-Item -ItemType Directory -Path "$functionDir/src" -Force

# Copy main.py to Cloud Functions directory
Copy-Item -Path "./src/main.py" -Destination "$functionDir/src/main.py" -Force
Copy-Item -Path "./src/config.py" -Destination "$functionDir/src/config.py" -Force
Copy-Item -Path "./src/data_store.py" -Destination "$functionDir/src/data_store.py" -Force
Copy-Item -Path "./src/embedding.py" -Destination "$functionDir/src/embedding.py" -Force
Copy-Item -Path "./src/vision.py" -Destination "$functionDir/src/vision.py" -Force
Copy-Item -Path "./src/mock_data.py" -Destination "$functionDir/src/mock_data.py" -Force
Copy-Item -Path "./requirements.txt" -Destination "$functionDir/requirements.txt" -Force

# Create main.py for Cloud Functions entry point
$cfMain = @"
import functions_framework
from src.main import process_uploaded_attendance_gcs

@functions_framework.cloud_event
def process_attendance(cloud_event):
    """Cloud Function entry point for GCS object finalize events"""
    return process_uploaded_attendance_gcs(cloud_event)
"@

Set-Content -Path "$functionDir/main.py" -Value $cfMain -Encoding UTF8

Write-Step "  Deploying Cloud Function..."
gcloud functions deploy process-attendance `
    --gen2 `
    --runtime=python311 `
    --region=$Region `
    --source=$functionDir `
    --entry-point=process_attendance `
    --event-provider=storage `
    --event-trigger=storage.googleapis.com/`(projects/_/buckets/$ClassBucket`) `
    --event-trigger-filter="eventType=google.storage.object.finalize" `
    --set-env-vars="USE_GCP=true,STUDENT_BUCKET=$StudentBucket,CLASS_BUCKET=$ClassBucket,FIRESTORE_STUDENTS_COLLECTION=students,FIRESTORE_ATTENDANCE_COLLECTION=attendance" `
    --memory=2Gi `
    --timeout=540 `
    --quiet 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to deploy Cloud Function"
    Write-Warn "You may need to deploy Cloud Function manually or check roles"
}
else {
    Write-Success "Deployed Cloud Function"
}

# 9. Setup IAM bindings
Write-Step "`nConfiguring IAM roles..."
$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$cloudFunctionSA = "service-$projectNumber@gcp-sa-cloud-functions.iam.gserviceaccount.com"
$cloudRunSA = "$ProjectId@appspot.gserviceaccount.com"

Write-Step "  Binding Cloud Functions service account..."
foreach ($bucket in @($StudentBucket, $ClassBucket)) {
    gcloud storage buckets add-iam-policy-binding "gs://$bucket" `
        --member="serviceAccount:$cloudFunctionSA" `
        --role="roles/storage.objectViewer" `
        --quiet 2>&1 | Out-Null
    gcloud storage buckets add-iam-policy-binding "gs://$bucket" `
        --member="serviceAccount:$cloudFunctionSA" `
        --role="roles/storage.objectCreator" `
        --quiet 2>&1 | Out-Null
}
Write-Success "  Configured Cloud Functions IAM"

Write-Step "  Binding Cloud Run service account..."
foreach ($bucket in @($StudentBucket, $ClassBucket)) {
    gcloud storage buckets add-iam-policy-binding "gs://$bucket" `
        --member="serviceAccount:$cloudRunSA" `
        --role="roles/storage.admin" `
        --quiet 2>&1 | Out-Null
}

# Grant Firestore permissions
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$cloudRunSA" `
    --role="roles/datastore.user" `
    --quiet 2>&1 | Out-Null

gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$cloudFunctionSA" `
    --role="roles/datastore.user" `
    --quiet 2>&1 | Out-Null

# Grant Vision API permissions
gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$cloudRunSA" `
    --role="roles/ml.viewer" `
    --quiet 2>&1 | Out-Null

gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$cloudFunctionSA" `
    --role="roles/ml.viewer" `
    --quiet 2>&1 | Out-Null

Write-Success "Configured IAM roles"

# 10. Summary
Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host @"
`nDeployment Summary:
  Project: $ProjectId
  Region: $Region
  
Cloud Run API:
  URL: $serviceUrl
  Env: USE_GCP=true
  
Cloud Storage:
  Student bucket: gs://$StudentBucket
  Class bucket: gs://$ClassBucket
  Lifecycle: Delete after 90 days
  
Firestore:
  Collections: students, attendance
  Region: $Region
  
Cloud Functions:
  Trigger: GCS finalize on $ClassBucket
  Entry point: process_attendance

Next steps:
  1. Deploy Firestore security rules:
     gcloud firestore deploy --project=$ProjectId < firestore-rules.yaml
  
  2. Deploy Firestore indexes:
     gcloud firestore indexes composite create --project=$ProjectId < firestore-indexes.yaml
  
  3. Update frontend .env.production:
     VITE_API_URL=$serviceUrl
  
  4. Deploy frontend to Cloud Storage + Cloud CDN
"@

Write-Success "All done! Your infrastructure is ready."
