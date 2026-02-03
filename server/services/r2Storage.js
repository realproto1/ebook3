/**
 * Cloudflare R2 스토리지 서비스
 * R2 업로드/다운로드/삭제 기능을 제공합니다.
 */

import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '../config/r2.js';
import { config } from '../config/env.js';

const R2_BUCKET_NAME = config.r2.bucketName;
const R2_PUBLIC_URL = config.r2.publicUrl;

/**
 * 이미지 URL을 R2에 업로드
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
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: 'image/png',
    });
    
    await r2Client.send(command);
    
    const publicUrl = `${R2_PUBLIC_URL}/${filename}`;
    console.log(`✅ Uploaded to R2: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ R2 upload failed:', error);
    return imageUrl; // fallback
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
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: 'image/png',
    });
    
    await r2Client.send(command);
    
    const publicUrl = `${R2_PUBLIC_URL}/${filename}`;
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
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    });
    
    await r2Client.send(command);
    
    const publicUrl = `${R2_PUBLIC_URL}/${filename}`;
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
    console.log(`📤 Uploading JSON to R2: ${filename}`);
    
    const buffer = Buffer.from(JSON.stringify(jsonData, null, 2));
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: 'application/json',
    });
    
    await r2Client.send(command);
    
    const publicUrl = `${R2_PUBLIC_URL}/${filename}`;
    console.log(`✅ Uploaded JSON to R2: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ R2 JSON upload failed:', error);
    throw error;
  }
}

/**
 * R2에서 JSON 데이터 가져오기
 */
export async function getJSONFromR2(filename) {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
    });
    
    const response = await r2Client.send(command);
    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * R2에서 이미지 삭제
 */
export async function deleteImageFromR2(imageUrl) {
  if (!imageUrl || !imageUrl.includes(R2_PUBLIC_URL)) {
    console.log('⏭️ Skip cleanup: invalid URL or not in R2');
    return;
  }
  
  try {
    const key = imageUrl.replace(`${R2_PUBLIC_URL}/`, '');
    
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key
    });
    
    await r2Client.send(command);
    console.log(`🗑️ Deleted from R2: ${key}`);
  } catch (error) {
    console.warn(`⚠️ Failed to delete from R2:`, error.message);
  }
}
