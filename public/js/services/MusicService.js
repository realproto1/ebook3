/**
 * MusicService.js
 * 배경음악 관리 서비스
 */

(function() {
    'use strict';
    
    class MusicService {
        /**
         * 배경음악 목록 로드
         */
        static async loadMusicList() {
            try {
                const response = await axios.get('/api/background-music');
                if (response.data.success) {
                    return response.data.musicList || [];
                }
                return [];
            } catch (error) {
                console.error('❌ 배경음악 목록 로드 실패:', error);
                throw error;
            }
        }
        
        /**
         * 배경음악 업로드
         * @param {FormData} formData - 업로드할 파일 데이터
         */
        static async uploadMusic(formData) {
            try {
                const response = await axios.post('/api/upload-background-music', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 300000  // 5분
                });
                
                if (response.data.success) {
                    return response.data;
                }
                throw new Error(response.data.error || '업로드 실패');
            } catch (error) {
                console.error('❌ 배경음악 업로드 실패:', error);
                throw error;
            }
        }
        
        /**
         * 배경음악 삭제
         * @param {string} musicId - 음악 ID
         */
        static async deleteMusic(musicId) {
            try {
                const response = await axios.delete(`/api/background-music/${musicId}`);
                if (response.data.success) {
                    return true;
                }
                throw new Error(response.data.error || '삭제 실패');
            } catch (error) {
                console.error('❌ 배경음악 삭제 실패:', error);
                throw error;
            }
        }
        
        /**
         * 동화책에 배경음악 설정
         * @param {Object} storybook - 동화책 객체
         * @param {string} musicId - 음악 ID
         * @param {string} musicUrl - 음악 URL
         * @param {string} musicTitle - 음악 제목
         */
        static selectMusic(storybook, musicId, musicUrl, musicTitle) {
            if (!storybook) {
                throw new Error('동화책이 선택되지 않았습니다.');
            }
            
            storybook.backgroundMusic = {
                id: musicId,
                url: musicUrl,
                title: musicTitle
            };
            
            console.log('✅ 배경음악 설정:', musicTitle);
            return true;
        }
        
        /**
         * 배경음악 제거
         * @param {Object} storybook - 동화책 객체
         */
        static removeMusic(storybook) {
            if (!storybook) {
                throw new Error('동화책이 선택되지 않았습니다.');
            }
            
            storybook.backgroundMusic = null;
            console.log('✅ 배경음악 제거 완료');
            return true;
        }
    }
    
    // 브라우저 환경에서 전역으로 노출
    if (typeof window !== 'undefined') {
        window.MusicService = MusicService;
        console.log('✅ MusicService.js 로드 완료');
    }
})();
