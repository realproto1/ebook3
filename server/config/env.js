/**
 * 환경 변수 관리
 * 모든 환경 변수를 중앙에서 관리합니다.
 */

export const config = {
  // 서버 설정
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // API 키
  geminiApiKey: process.env.GEMINI_API_KEY,

  // Cloudflare R2 설정
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || 'ad0cc40df8e41b561442058f198278ea',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '764805a6659844bc5b989f14e1d7408c',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'fa1a1d55c9278d758d2f3a4da79cc28584bf0521792d3d2cb249958cb1eeada5',
    bucketName: process.env.R2_BUCKET_NAME || 'storybook-images',
    publicUrl: 'https://pub-554d78bf0f2346cfb850060ac23280a7.r2.dev'
  }
};

/**
 * API 키 검증
 */
export function validateApiKeys() {
  if (!config.geminiApiKey) {
    console.warn('⚠️ WARNING: GEMINI_API_KEY environment variable is not set!');
    console.warn('Please set GEMINI_API_KEY in Vercel Environment Variables.');
    console.warn('Visit: https://makersuite.google.com/app/apikey to get a new API key');
    console.warn('Server will start but API calls will fail until key is set.');
  }
}

/**
 * 설정 정보 출력
 */
export function logConfig() {
  console.log('✅ Server Configuration:');
  console.log(`   Port: ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Gemini API: ${config.geminiApiKey ? '✅ Configured' : '❌ Not set'}`);
  console.log(`   R2 Bucket: ${config.r2.bucketName}`);
  console.log(`   R2 Public URL: ${config.r2.publicUrl}`);
}
