/**
 * 업로드 미들웨어
 * Multer 설정을 담당합니다.
 */

import multer from 'multer';

/**
 * 이미지 업로드 설정 (메모리 저장)
 */
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  }
});

/**
 * 오디오 업로드 설정
 */
const audioStorage = multer.memoryStorage();

export const audioUpload = multer({
  storage: audioStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 제한
  }
});
