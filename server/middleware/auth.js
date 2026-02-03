/**
 * 인증 미들웨어
 * API 키 검증을 담당합니다.
 */

import { config } from '../config/env.js';

/**
 * API 키 검증 미들웨어
 */
export function requireAPIKey(req, res, next) {
  if (!config.geminiApiKey) {
    return res.status(403).json({ 
      success: false,
      error: '⚠️ GEMINI_API_KEY가 설정되지 않았습니다.\n\n' +
             'Vercel Dashboard → Settings → Environment Variables에서\n' +
             'GEMINI_API_KEY를 추가하고 재배포해주세요.\n\n' +
             'API 키 발급: https://makersuite.google.com/app/apikey'
    });
  }
  next();
}
