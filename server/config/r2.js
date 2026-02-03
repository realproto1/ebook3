/**
 * Cloudflare R2 클라이언트 설정
 */

import { S3Client } from '@aws-sdk/client-s3';
import { config } from './env.js';

/**
 * R2 클라이언트 인스턴스 생성
 */
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

/**
 * R2 설정 정보 출력
 */
export function logR2Config() {
  console.log('✅ Cloudflare R2 initialized:', {
    bucket: config.r2.bucketName,
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    publicUrl: config.r2.publicUrl
  });
}
