/**
 * DownloadService.js
 * 다운로드 관련 기능 모듈
 */

(function() {
    'use strict';
    
    class DownloadService {
        /**
         * 이미지 다운로드
         * @param {string} imageUrl - 이미지 URL
         * @param {string} filename - 파일명
         */
        static async downloadImage(imageUrl, filename) {
            if (!imageUrl) {
                throw new Error('다운로드할 이미지가 없습니다.');
            }
            
            try {
                const response = await axios.get(imageUrl, {
                    responseType: 'blob',
                    timeout: 60000
                });
                
                const blob = new Blob([response.data], { type: response.headers['content-type'] });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || 'image.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('✅ 이미지 다운로드 완료:', filename);
                return true;
            } catch (error) {
                console.error('❌ 이미지 다운로드 실패:', error);
                throw error;
            }
        }
        
        /**
         * 오디오 다운로드
         * @param {string} audioUrl - 오디오 URL
         * @param {string} filename - 파일명
         */
        static async downloadAudio(audioUrl, filename) {
            if (!audioUrl) {
                throw new Error('다운로드할 오디오가 없습니다.');
            }
            
            try {
                const response = await axios.get(audioUrl, {
                    responseType: 'blob',
                    timeout: 60000
                });
                
                const blob = new Blob([response.data], { type: 'audio/mpeg' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || 'audio.mp3';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('✅ 오디오 다운로드 완료:', filename);
                return true;
            } catch (error) {
                console.error('❌ 오디오 다운로드 실패:', error);
                throw error;
            }
        }
        
        /**
         * 텍스트 파일 다운로드
         * @param {string} content - 텍스트 내용
         * @param {string} filename - 파일명
         */
        static downloadText(content, filename) {
            if (!content) {
                throw new Error('다운로드할 텍스트가 없습니다.');
            }
            
            try {
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || 'text.txt';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('✅ 텍스트 다운로드 완료:', filename);
                return true;
            } catch (error) {
                console.error('❌ 텍스트 다운로드 실패:', error);
                throw error;
            }
        }
        
        /**
         * ZIP 파일 다운로드 (서버에서 생성)
         * @param {string} storybookId - 동화책 ID
         * @param {string} type - 다운로드 타입 (illustrations, characters, vocabulary, etc.)
         */
        static async downloadZip(storybookId, type) {
            if (!storybookId) {
                throw new Error('동화책 ID가 없습니다.');
            }
            
            try {
                const response = await axios.get(`/api/download-zip/${storybookId}/${type}`, {
                    responseType: 'blob',
                    timeout: 300000  // 5분
                });
                
                const blob = new Blob([response.data], { type: 'application/zip' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${storybookId}_${type}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('✅ ZIP 다운로드 완료:', `${storybookId}_${type}.zip`);
                return true;
            } catch (error) {
                console.error('❌ ZIP 다운로드 실패:', error);
                throw error;
            }
        }
        
        /**
         * JSON 파일 다운로드
         * @param {Object} data - JSON 데이터
         * @param {string} filename - 파일명
         */
        static downloadJSON(data, filename) {
            if (!data) {
                throw new Error('다운로드할 데이터가 없습니다.');
            }
            
            try {
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || 'data.json';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('✅ JSON 다운로드 완료:', filename);
                return true;
            } catch (error) {
                console.error('❌ JSON 다운로드 실패:', error);
                throw error;
            }
        }
        
        /**
         * 다중 파일 다운로드 헬퍼
         * @param {Array} items - 다운로드할 항목 배열 [{url, filename, type}]
         * @param {Function} progressCallback - 진행 상황 콜백
         */
        static async downloadMultiple(items, progressCallback = null) {
            if (!items || items.length === 0) {
                throw new Error('다운로드할 항목이 없습니다.');
            }
            
            let successCount = 0;
            let failCount = 0;
            
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: items.length,
                        status: 'downloading',
                        filename: item.filename
                    });
                }
                
                try {
                    if (item.type === 'image') {
                        await this.downloadImage(item.url, item.filename);
                    } else if (item.type === 'audio') {
                        await this.downloadAudio(item.url, item.filename);
                    } else if (item.type === 'text') {
                        this.downloadText(item.content, item.filename);
                    }
                    
                    successCount++;
                    
                    if (progressCallback) {
                        progressCallback({
                            current: i + 1,
                            total: items.length,
                            status: 'success',
                            filename: item.filename
                        });
                    }
                    
                    // 다음 다운로드 전 500ms 대기 (브라우저 부담 감소)
                    if (i < items.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.error(`❌ ${item.filename} 다운로드 실패:`, error);
                    failCount++;
                    
                    if (progressCallback) {
                        progressCallback({
                            current: i + 1,
                            total: items.length,
                            status: 'error',
                            filename: item.filename,
                            error: error.message
                        });
                    }
                }
            }
            
            console.log(`✅ 다운로드 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
            
            return {
                success: true,
                successCount: successCount,
                failCount: failCount,
                totalCount: items.length
            };
        }
    }
    
    // 브라우저 환경에서 전역으로 노출
    if (typeof window !== 'undefined') {
        window.DownloadService = DownloadService;
        console.log('✅ DownloadService.js 로드 완료');
    }
})();
