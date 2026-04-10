# Face Attendance System 🚀

A modern, cloud-native attendance tracking system that leverages Artificial Intelligence for face recognition. This system allows schools or organizations to manage student registrations, process attendance from class photos, and export attendance records seamlessly.

![Overview Screenshot](https://raw.githubusercontent.com/kietoichoiDXD/face-attendance-system/main/frontend/public/dashboard-preview.png) *(Placeholder: Replace with actual screenshot link)*

## ✨ Key Features

-   **👤 Student Registration**: Register students with face embeddings stored in Google Cloud Storage + Firestore.
-   **📸 Intelligent Attendance**: Upload a photo of the entire class; the system automatically recognizes students and draws bounding boxes.
-   **📊 Analytics Dashboard**: Real-time visualization of attendance rates, total students, and recent trends.
-   **📥 CSV Export**: Export attendance reports for any class with one click.
-   **☁️ Serverless Platform**: Built on Google Cloud Functions / Cloud Run Functions for high scalability and low cost.

## 🛠️ Technology Stack

-   **Frontend**: React 18, TailwindCSS, Shadcn/UI, Recharts, Vite.
-   **Backend**: Python 3.13, Google Cloud Functions / Cloud Run Functions.
-   **Cloud Infrastructure**: Google Cloud Vision (AI), Cloud Firestore (NoSQL), Cloud Storage (Object Storage), API Gateway/HTTP.

## 📐 System Architecture

1.  **Student Image Registration**: Faculty uploads student info + face image -> serverless function -> stored in Cloud Storage + embedding stored in Firestore.
2.  **Attendance Processing**: Teacher uploads class photo -> serverless function -> Google Vision detects faces -> embeddings are compared with registered students -> results stored in Firestore.
3.  **Visualization**: Frontend fetches analytics API and shows interactive charts.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+) & Python (v3.13+)
-   Google Cloud project configured
-   gcloud CLI authenticated

### Backend Setup (GCP)

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Set environment variables for GCP project and storage buckets (optional if defaults fit your project).

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file and add your API URL:
    ```env
    VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev
    ```
4.  Run in development mode:
    ```bash
    npm run dev
    ```

## 📝 Usage

1.  **Register Students**: Go to the "Register Student" page to add individuals to the database.
2.  **Process Attendance**: Upload a photo of your classroom on the "Attendance" page.
3.  **Check Analytics**: View the main dashboard for attendance stats.

## 📄 License

MIT License - feel free to use and modify for your own projects!
