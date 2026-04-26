# AI Resume and Job Description Matcher

This project is a full-stack AI Resume and Job Description Matcher web application using AWS serverless architecture. It evaluates how well a resume matches a given job description, returning a match score, missing skills, and suggestions.

It features two matching modes:
1. **AI Matcher**: Uses Google's Gemini AI to semantically compare the resume and JD for intelligent insights.
2. **Fallback Matcher**: A robust ATS-style keyword-matching logic that operates locally without API dependencies.

## Project Structure

- `frontend/`: React + Vite + Tailwind CSS web application.
- `backend/`: Node.js AWS Lambda function handling PDF parsing, S3 uploading, and matching logic.

---

## Local Setup

### 1. Backend (Node.js)
The backend can be run locally using a simple Express wrapper if needed, but the provided `index.js` is built specifically for AWS Lambda. To test it locally, you can use AWS SAM CLI or a local API Gateway mock. 

To just install dependencies:
```bash
cd backend
npm install
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

> **Note**: For local development, the frontend will fallback to generating a dummy response if the backend API is not running at `http://localhost:3000/analyze-resume`.

---

## AWS Deployment Guide (Serverless Architecture)

The backend is designed to be deployed as an AWS Lambda function fronted by API Gateway. 

### Step 1: Create an S3 Bucket (Optional, for Resume Storage)
1. Go to the AWS S3 Console.
2. Click **Create bucket**.
3. Name your bucket (e.g., `resume-matcher-uploads-<your-id>`).
4. Ensure public access is blocked.
5. Create the bucket.

### Step 2: Create IAM Role for Lambda
1. Go to IAM Console -> Roles -> **Create role**.
2. Select **AWS service** -> **Lambda** as the use case.
3. Attach policies:
   - `AWSLambdaBasicExecutionRole` (for CloudWatch logs).
   - If using S3, create an inline policy allowing `s3:PutObject` on your bucket ARN.
4. Name the role `ResumeMatcherLambdaRole` and create it.

### Step 3: Deploy the Lambda Function
1. In the `backend/` directory, package your code:
   ```bash
   cd backend
   npm install
   zip -r function.zip .
   ```
2. Go to the AWS Lambda Console -> **Create function**.
3. Choose **Author from scratch**, name it `AnalyzeResumeFunction`, and select **Node.js 20.x**.
4. Set the Execution Role to `ResumeMatcherLambdaRole`.
5. Click **Create function**.
6. Under the "Code" tab, select **Upload from -> .zip file** and upload the `function.zip`.
7. Under "Configuration" -> "Environment variables", add:
   - `GEMINI_API_KEY`: Your Google Gemini API Key (optional, removes fallback).
   - `S3_BUCKET_NAME`: Your S3 bucket name from Step 1 (optional).

### Step 4: Configure API Gateway
1. Go to API Gateway Console -> **Create API** -> **REST API** (Build).
2. Name it `ResumeMatcherAPI`.
3. Create a **Resource** called `/analyze-resume`.
4. Create a **POST Method** under `/analyze-resume`.
5. Select **Lambda Function** integration, check "Use Lambda Proxy integration", and select your `AnalyzeResumeFunction`.
6. **Important for PDF Uploads**:
   - Go to API Settings -> **Binary Media Types**.
   - Add `multipart/form-data`.
7. Enable **CORS**:
   - Select the `/analyze-resume` resource.
   - Click **Enable CORS**.
   - Allow headers: `Content-Type`. Allow Methods: `OPTIONS, POST`.
8. Click **Deploy API**, create a new stage (e.g., `prod`), and deploy.

### Step 5: Connect Frontend to Backend
1. Copy the **Invoke URL** from your deployed API Gateway stage.
2. In the `frontend/` directory, create a `.env` file:
   ```env
   VITE_API_URL=https://<your-api-id>.execute-api.<region>.amazonaws.com/prod/analyze-resume
   ```
3. Deploy the frontend to Vercel:
   ```bash
   cd frontend
   npm i -g vercel
   vercel
   ```
   *Make sure to add the `VITE_API_URL` to Vercel's environment variables.*
