const Busboy = require('busboy');
const pdfParse = require('pdf-parse');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { fallbackMatch, aiMatch } = require('./matcher');
const https = require('https');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {

    const method =
        event.requestContext?.http?.method ||
        event.httpMethod ||
        "POST";

    // CORS
    if (method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            body: ""
        };
    }

    if (method !== 'POST') {
        return {
            statusCode: 405,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Method Not Allowed" })
        };
    }

    try {
        let fileBuffer = null;
        let filename = null;
        let jobDescription = "";

        const contentType =
            event.headers?.['content-type'] ||
            event.headers?.['Content-Type'] ||
            "";

        // 🔥 CASE 1: MULTIPART (file upload)
        if (contentType && contentType.includes('multipart/form-data')) {
            const result = await parseMultipart(event);
            fileBuffer = result.fileBuffer;
            filename = result.filename;
            jobDescription = result.jobDescription;
        }

        // 🔥 CASE 2: JSON (fileUrl or fileBase64)
        else {
            let body = {};
            if (event.body) {
                body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } else {
                body = event; // For API Gateway without Lambda Proxy Integration
            }

            jobDescription = body.jobDescription;
            const fileUrl = body.fileUrl;
            const fileBase64 = body.fileBase64;

            if (fileBase64) {
                fileBuffer = Buffer.from(fileBase64, 'base64');
                filename = body.filename || "resume.pdf";
            } else if (fileUrl) {
                fileBuffer = await downloadFile(fileUrl);
                filename = "resume.pdf";
            }
        }

        if (!fileBuffer || !jobDescription) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Missing file or jobDescription" })
            };
        }

        // 🔥 Upload to S3
        let s3Url = null;
        if (process.env.S3_BUCKET_NAME) {
            // Temporarily comment out S3 upload to test if it's the cause of the 504 Timeout
            // const key = `resumes/${Date.now()}-${filename}`;
            // console.log("Uploading to S3:", key);
            // 
            // await s3Client.send(new PutObjectCommand({
            //     Bucket: process.env.S3_BUCKET_NAME,
            //     Key: key,
            //     Body: fileBuffer,
            //     ContentType: 'application/pdf'
            // }));
            //
            // s3Url = `s3://${process.env.S3_BUCKET_NAME}/${key}`;
        }

        // 🔥 Parse PDF
        const pdfData = await pdfParse(fileBuffer);
        const resumeText = pdfData.text;

        // 🔥 Matching
        let result;
        if (process.env.GEMINI_API_KEY) {
            result = await aiMatch(resumeText, jobDescription, process.env.GEMINI_API_KEY);
        } else {
            result = fallbackMatch(resumeText, jobDescription);
        }

        if (s3Url) result.s3Url = s3Url;

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(result)
        };

    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: err.message })
        };
    }
};



// 🔽 FILE DOWNLOAD (for JSON mode)
function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const data = [];

            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
            res.on('error', reject);
        });
    });
}



// 🔽 MULTIPART PARSER
function parseMultipart(event) {
    return new Promise((resolve, reject) => {

        const contentType =
            event.headers?.['content-type'] ||
            event.headers?.['Content-Type'] ||
            "";
        const busboy = Busboy({ headers: { 'content-type': contentType } });

        let result = {
            fileBuffer: null,
            filename: null,
            jobDescription: ''
        };

        const fileChunks = [];

        busboy.on('file', (name, file, info) => {
            if (name === 'file') {
                result.filename = info.filename;

                file.on('data', (data) => fileChunks.push(data));
                file.on('end', () => {
                    result.fileBuffer = Buffer.concat(fileChunks);
                });
            }
        });

        busboy.on('field', (name, val) => {
            if (name === 'jobDescription') {
                result.jobDescription = val;
            }
        });

        busboy.on('finish', () => resolve(result));
        busboy.on('error', reject);

        const encoding = event.isBase64Encoded ? 'base64' : 'binary';
        const bodyBuffer = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64')
            : Buffer.from(event.body);

        busboy.end(bodyBuffer);

    });
}