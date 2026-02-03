/**
 * Gemini AI 서비스
 * Gemini API 호출을 담당합니다.
 * 
 * TODO: server.js에서 Gemini 관련 함수들을 이동
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

let genAI = null;

/**
 * Gemini AI 클라이언트 초기화
 */
export function initializeGemini() {
  if (config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    console.log('✅ Gemini AI initialized');
  }
}

/**
 * Gemini 클라이언트 가져오기
 */
export function getGeminiClient() {
  return genAI;
}
