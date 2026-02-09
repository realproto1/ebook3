const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// config.json 로드
const config = require('../../config.json');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

async function uploadVideo() {
  console.log('📤 R2에 동영상 업로드 중...');
  
  const fileContent = fs.readFileSync('redhood_final.mp4');
  const filename = 'redhood-story-video-' + Date.now() + '.mp4';
  
  const command = new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: filename,
    Body: fileContent,
    ContentType: 'video/mp4'
  });
  
  await r2Client.send(command);
  
  const publicUrl = config.r2.publicUrl + '/' + filename;
  
  console.log('');
  console.log('✅ 업로드 완료!');
  console.log('📁 파일명:', filename);
  console.log('📊 크기:', (fileContent.length / 1024 / 1024).toFixed(2) + ' MB');
  console.log('🌐 다운로드 URL:');
  console.log('   ', publicUrl);
  console.log('');
  
  return publicUrl;
}

uploadVideo().catch(error => {
  console.error('❌ 업로드 실패:', error.message);
  process.exit(1);
});
