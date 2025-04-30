# AWS Image Processor

A cloud-based image processing application demonstrating AWS services integration.

## Project Structure
```
aws-image-processor/
├── frontend/           # React frontend application
├── backend/           # Node.js Lambda functions
├── infrastructure/    # AWS CDK/CloudFormation templates
└── README.md
```

## AWS Services Used
- **Amazon S3**: Static website hosting and image storage
- **AWS Lambda**: Serverless backend processing
- **Amazon DynamoDB**: Database for storing image metadata
- **Amazon API Gateway**: REST API endpoints
- **Amazon CloudFront**: CDN for content delivery
- **AWS IAM**: Security and permissions

## Setup Instructions

1. Install AWS CLI and configure credentials
2. Install Node.js and npm
3. Install AWS CDK
4. Deploy infrastructure using CDK
5. Deploy frontend to S3
6. Configure API Gateway endpoints

## Features
- Image upload and storage
- Image processing (resize, filter, etc.)
- Metadata management
- Secure access control
- CDN distribution

## Security
- IAM roles and policies
- S3 bucket policies
- API Gateway authentication
- CORS configuration 