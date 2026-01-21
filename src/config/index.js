import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // 서버 설정
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Gemini API
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  
  // Cloudflare R2
  R2: {
    ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    BUCKET_NAME: process.env.R2_BUCKET_NAME || 'storybook-images',
    PUBLIC_URL: process.env.R2_PUBLIC_URL || 'https://pub-554d78bf0f2346cfb850060ac23280a7.r2.dev',
    ENDPOINT: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  }
};

// API 키 검증
if (!config.GEMINI_API_KEY) {
  console.warn('⚠️ WARNING: GEMINI_API_KEY environment variable is not set!');
  console.warn('Please set GEMINI_API_KEY in Vercel Environment Variables.');
}

// R2 설정 검증
if (!config.R2.ACCOUNT_ID || !config.R2.ACCESS_KEY_ID || !config.R2.SECRET_ACCESS_KEY) {
  console.warn('⚠️ WARNING: Cloudflare R2 credentials not fully configured!');
}

export default config;
