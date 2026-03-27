# Face Attendance System 🚀

A modern, cloud-native attendance tracking system that leverages Artificial Intelligence for face recognition. This system allows schools or organizations to manage student registrations, process attendance from class photos, and export attendance records seamlessly.

![Overview Screenshot](https://raw.githubusercontent.com/kietoichoiDXD/face-attendance-system/main/frontend/public/dashboard-preview.png) *(Placeholder: Replace with actual screenshot link)*

## ✨ Key Features

-   **👤 Student Registration**: Register students with their face data stored securely in AWS Rekognition.
-   **📸 Intelligent Attendance**: Upload a photo of the entire class; the system automatically recognizes students and draws bounding boxes.
-   **📊 Analytics Dashboard**: Real-time visualization of attendance rates, total students, and recent trends.
-   **📥 CSV Export**: Export attendance reports for any class with one click.
-   **☁️ Serverless Platform**: Built on AWS Lambda for high scalability and low cost.

## 🛠️ Technology Stack

-   **Frontend**: React 18, TailwindCSS, Shadcn/UI, Recharts, Vite.
-   **Backend**: Python 3.12, Serverless Framework, AWS Lambda.
-   **Cloud Infrastructure**: AWS Rekognition (AI/ML), AWS DynamoDB (Database), AWS S3 (Storage), AWS API Gateway.

## 📐 System Architecture

1.  **Student Image Registration**: Faculty uploads student info + face image -> Lambda -> Stored in S3 + Face indexed in Rekognition Collection.
2.  **Attendance Processing**: Teacher uploads class photo -> Lambda -> Rekognition detects all faces -> Search faces in Collection -> Matches returned with metadata -> Results stored in DynamoDB.
3.  **Visualization**: Frontend fetches analytics via API Gateway and shows interactive charts.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+) & Python (v3.12+)
-   AWS Account & AWS CLI configured
-   Serverless Framework (`npm install -g serverless`)

### Backend Setup (AWS)

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Deploy the infrastructure:
    ```bash
    serverless deploy
    ```
3.  Copy the generated **API Gateway URL**.

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
