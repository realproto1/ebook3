import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { config } from '../config/index.js';

// R2 클라이언트 초기화
const r2Client = new S3Client({
  region: 'auto',
  endpoint: config.R2.ENDPOINT,
  credentials: {
    accessKeyId: config.R2.ACCESS_KEY_ID,
    secretAccessKey: config.R2.SECRET_ACCESS_KEY,
  },
});

console.log('✅ Cloudflare R2 initialized');
console.log(`   Bucket: ${config.R2.BUCKET_NAME}`);
console.log(`   Endpoint: ${config.R2.ENDPOINT}`);
console.log(`   Public URL: ${config.R2.PUBLIC_URL}`);

/**
 * 이미지 URL을 다운로드하여 R2에 업로드
 */
export async function uploadImageToR2(imageUrl, filename) {
  try {
    console.log(`📤 Uploading to R2: ${filename}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const command = new PutObjectCommand({
      Bucket: config.R2.BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: 'image/png',
    });
    
    await r2Client.send(command);
    
    const publicUrl = `${config.R2.PUBLIC_URL}/${filename}`;
    console.log(`✅ Uploaded to R2: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ R2 upload failed:', error);
    return imageUrl; // Fallback
  }
}

/**
 * Base64 이미지를 R2에 업로드
 */
export async function uploadBase64ToR2(base64Data, filename) {
  try {
    console.log(`📤 Uploading Base64 to R2: ${filename}`);
    
    const buffer = Buffer.from(base64Data, 'base64');
    
    const command = new PutObjectCommand({
      Bucket: config.R2.BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: 'image/png',
    });
    
    await r2Client.send(command);
    
    const publicUrl = `${config.R2.PUBLIC_URL}/${filename}`;
    console.log(`✅ Uploaded Base64 to R2: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ R2 Base64 upload failed:', error);
    throw error;
  }
}

/**
 * Buffer를 R2에 업로드
 */
export async function uploadBufferToR2(buffer, filename, contentType) {
  try {
    console.log(`📤 Uploading Buffer to R2: ${filename}`);
    
    const command = new PutObjectCommand({
      Bucket: config.R2.BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    });
    
    await r2Client.send(command);
    
    const publicUrl = `${config.R2.PUBLIC_URL}/${filename}`;
    console.log(`✅ Uploaded Buffer to R2: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ R2 Buffer upload failed:', error);
    throw error;
  }
}

/**
 * JSON 데이터를 R2에 업로드
 */
export async function uploadJSONToR2(jsonData, filename) {
  try {
    const jsonString = JSON.stringify(jsonData, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    
    const command = new PutObjectCommand({
      Bucket: config.R2.BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: 'application/json',
    });
    
    await r2Client.send(command);
    
    const publicUrl = `${config.R2.PUBLIC_URL}/${filename}`;
    console.log(`✅ JSON uploaded to R2: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ R2 JSON upload failed:', error);
    throw error;
  }
}

/**
 * R2에서 JSON 데이터 다운로드
 */
export async function downloadJSONFromR2(filename) {
  try {
    const command = new GetObjectCommand({
      Bucket: config.R2.BUCKET_NAME,
      Key: filename,
    });
    
    const response = await r2Client.send(command);
    const bodyString = await response.Body.transformToString();
    
    return JSON.parse(bodyString);
  } catch (error) {
    console.error('❌ R2 JSON download failed:', error);
    throw error;
  }
}

/**
 * R2에서 이미지 삭제
 */
export async function deleteImageFromR2(imageUrl) {
  try {
    if (!imageUrl || !imageUrl.includes(config.R2.PUBLIC_URL)) {
      console.log('⏭️ Skipping deletion (not an R2 URL)');
      return;
    }
    
    const filename = imageUrl.split('/').pop();
    console.log(`🗑️ Deleting from R2: ${filename}`);
    
    const command = new DeleteObjectCommand({
      Bucket: config.R2.BUCKET_NAME,
      Key: filename,
    });
    
    await r2Client.send(command);
    console.log(`✅ Deleted from R2: ${filename}`);
  } catch (error) {
    console.error('❌ R2 delete failed:', error);
  }
}

/**
 * R2에서 파일 목록 조회
 */
export async function listR2Files(prefix = '') {
  try {
    const command = new ListObjectsV2Command({
      Bucket: config.R2.BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 1000,
    });
    
    const response = await r2Client.send(command);
    return response.Contents || [];
  } catch (error) {
    console.error('❌ R2 list failed:', error);
    return [];
  }
}

export default {
  uploadImageToR2,
  uploadBase64ToR2,
  uploadBufferToR2,
  uploadJSONToR2,
  downloadJSONFromR2,
  deleteImageFromR2,
  listR2Files,
};
