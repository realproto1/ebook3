import { config } from '../config/index.js';

/**
 * API 키 검증 미들웨어
 */
export function requireAPIKey(req, res, next) {
  if (!config.GEMINI_API_KEY) {
    return res.status(503).json({
      success: false,
      error: '서버 설정 오류: API 키가 설정되지 않았습니다.',
      details: 'GEMINI_API_KEY 환경 변수를 설정해주세요.'
    });
  }
  
  next();
}

export default { requireAPIKey };
