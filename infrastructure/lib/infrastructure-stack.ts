import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for image storage
    const imageBucket = new s3.Bucket(this, 'ImageBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Create DynamoDB table for image metadata
    const imageTable = new dynamodb.Table(this, 'ImageTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda function for image processing
    const imageProcessor = new lambda.Function(this, 'ImageProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('backend'),
      environment: {
        BUCKET_NAME: imageBucket.bucketName,
        TABLE_NAME: imageTable.tableName,
      },
    });

    // Grant permissions
    imageBucket.grantReadWrite(imageProcessor);
    imageTable.grantReadWriteData(imageProcessor);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'ImageApi', {
      restApiName: 'Image Processing Service',
      description: 'API for image processing operations',
    });

    // Create API Gateway integration
    const integration = new apigateway.LambdaIntegration(imageProcessor);

    // Add resources and methods
    const images = api.root.addResource('images');
    images.addMethod('POST', integration); // Upload image
    images.addMethod('GET', integration);  // List images

    const image = images.addResource('{id}');
    image.addMethod('GET', integration);   // Get specific image
    image.addMethod('DELETE', integration); // Delete image

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'ImageDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(imageBucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
    });

    // Output the API endpoint
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
    });

    // Output the CloudFront distribution domain
    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
    });
  }
} 