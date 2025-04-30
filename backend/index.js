const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const sharp = require('sharp');

const BUCKET_NAME = process.env.BUCKET_NAME;
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    try {
        const { httpMethod, path, pathParameters, body } = event;
        
        switch (httpMethod) {
            case 'POST':
                return await uploadImage(JSON.parse(body));
            case 'GET':
                if (pathParameters && pathParameters.id) {
                    return await getImage(pathParameters.id);
                }
                return await listImages();
            case 'DELETE':
                return await deleteImage(pathParameters.id);
            default:
                return {
                    statusCode: 405,
                    body: JSON.stringify({ message: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
};

async function uploadImage(body) {
    const { imageData, fileName } = body;
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // Process image with sharp
    const processedImage = await sharp(imageBuffer)
        .resize(800, 800, { fit: 'inside' })
        .toBuffer();
    
    const id = Date.now().toString();
    const key = `${id}/${fileName}`;
    
    // Upload to S3
    await s3.putObject({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: processedImage,
        ContentType: 'image/jpeg'
    }).promise();
    
    // Save metadata to DynamoDB
    await dynamodb.put({
        TableName: TABLE_NAME,
        Item: {
            id,
            fileName,
            uploadDate: new Date().toISOString(),
            size: processedImage.length
        }
    }).promise();
    
    return {
        statusCode: 200,
        body: JSON.stringify({ id, key })
    };
}

async function getImage(id) {
    const result = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: { id }
    }).promise();
    
    if (!result.Item) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Image not found' })
        };
    }
    
    const url = await s3.getSignedUrlPromise('getObject', {
        Bucket: BUCKET_NAME,
        Key: `${id}/${result.Item.fileName}`,
        Expires: 3600
    });
    
    return {
        statusCode: 200,
        body: JSON.stringify({ ...result.Item, url })
    };
}

async function listImages() {
    const result = await dynamodb.scan({
        TableName: TABLE_NAME
    }).promise();
    
    return {
        statusCode: 200,
        body: JSON.stringify(result.Items)
    };
}

async function deleteImage(id) {
    const result = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: { id }
    }).promise();
    
    if (!result.Item) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Image not found' })
        };
    }
    
    await s3.deleteObject({
        Bucket: BUCKET_NAME,
        Key: `${id}/${result.Item.fileName}`
    }).promise();
    
    await dynamodb.delete({
        TableName: TABLE_NAME,
        Key: { id }
    }).promise();
    
    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Image deleted successfully' })
    };
} 