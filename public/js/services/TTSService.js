/**
 * TTSService
 * - TTS (Text-to-Speech) 생성 API 통합
 * - 페이지 오디오, 배경음악 관리
 * - 오디오 업로드 및 일괄 처리
 */

class TTSService {
    constructor() {
        this.uploadHistory = {
            pages: {},
            backgroundMusic: []
        };
    }

    /**
     * 단일 페이지 TTS 생성
     * @param {Object} page
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async generatePageTTS(page, options = {}) {
        try {
            const {
                model = DEFAULT_IMAGE_SETTINGS.geminiTTSModel,
                voice = DEFAULT_IMAGE_SETTINGS.ttsModel,
                voiceConfig = DEFAULT_IMAGE_SETTINGS.ttsVoiceConfig,
                language = 'ko'
            } = options;

            const response = await api.post('/api/generate-tts', {
                text: page.audio_text || page.text,
                model,
                voice,
                voiceConfig,
                language
            }, {
                errorMessage: 'TTS를 생성할 수 없습니다.'
            });

            // 히스토리 저장
            const pageId = page.id || page.order;
            if (!this.uploadHistory.pages[pageId]) {
                this.uploadHistory.pages[pageId] = [];
            }
            this.uploadHistory.pages[pageId].unshift({
                url: response.audioUrl,
                text: page.audio_text || page.text,
                timestamp: new Date().toISOString()
            });

            return response;
        } catch (error) {
            console.error('generatePageTTS error:', error);
            throw error;
        }
    }

    /**
     * 모든 페이지 TTS 생성 (병렬)
     * @param {Array} pages
     * @param {Object} options
     * @returns {Promise<Array>}
     */
    async generateAllTTSParallel(pages, options = {}) {
        try {
            const promises = pages.map((page, index) => 
                this.generatePageTTS(page, options)
                    .catch(error => {
                        console.error(`TTS ${index} generation failed:`, error);
                        return { error: error.message, index };
                    })
            );

            const results = await Promise.all(promises);
            return results;
        } catch (error) {
            console.error('generateAllTTSParallel error:', error);
            throw error;
        }
    }

    /**
     * 모든 페이지 TTS 생성 (순차)
     * @param {Array} pages
     * @param {Object} options
     * @param {Function} onProgress
     * @returns {Promise<Array>}
     */
    async generateAllTTSSequential(pages, options = {}, onProgress = null) {
        try {
            const results = [];

            for (let i = 0; i < pages.length; i++) {
                try {
                    const result = await this.generatePageTTS(pages[i], options);
                    results.push(result);
                    
                    if (onProgress) {
                        onProgress(i + 1, pages.length, result);
                    }
                } catch (error) {
                    console.error(`TTS ${i} generation failed:`, error);
                    results.push({ error: error.message, index: i });
                    
                    if (onProgress) {
                        onProgress(i + 1, pages.length, { error: error.message });
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('generateAllTTSSequential error:', error);
            throw error;
        }
    }

    /**
     * 오디오 파일 업로드
     * @param {File|Blob} file
     * @param {string} type - 'page', 'background'
     * @returns {Promise<Object>}
     */
    async uploadAudio(file, type = 'page') {
        try {
            const formData = new FormData();
            formData.append('audio', file);
            formData.append('type', type);

            const response = await api.uploadFile('/api/upload-audio', formData, {
                errorMessage: '오디오를 업로드할 수 없습니다.'
            });

            return response;
        } catch (error) {
            console.error('uploadAudio error:', error);
            throw error;
        }
    }

    /**
     * 오디오 일괄 업로드
     * @param {FileList|Array} files
     * @param {string} type
     * @param {Function} onProgress
     * @returns {Promise<Array>}
     */
    async uploadAudioBatch(files, type = 'page', onProgress = null) {
        try {
            const results = [];

            for (let i = 0; i < files.length; i++) {
                try {
                    const result = await this.uploadAudio(files[i], type);
                    results.push(result);
                    
                    if (onProgress) {
                        onProgress(i + 1, files.length, result);
                    }
                } catch (error) {
                    console.error(`Audio ${i} upload failed:`, error);
                    results.push({ error: error.message, index: i });
                    
                    if (onProgress) {
                        onProgress(i + 1, files.length, { error: error.message });
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('uploadAudioBatch error:', error);
            throw error;
        }
    }

    /**
     * 배경음악 업로드
     * @param {File|Blob} file
     * @param {Object} metadata
     * @returns {Promise<Object>}
     */
    async uploadBackgroundMusic(file, metadata = {}) {
        try {
            const formData = new FormData();
            formData.append('audio', file);
            formData.append('name', metadata.name || file.name);
            formData.append('type', 'background');

            const response = await api.uploadFile('/api/upload-background-music', formData, {
                errorMessage: '배경음악을 업로드할 수 없습니다.'
            });

            // 히스토리 저장
            this.uploadHistory.backgroundMusic.unshift({
                url: response.audioUrl,
                name: metadata.name || file.name,
                timestamp: new Date().toISOString()
            });

            return response;
        } catch (error) {
            console.error('uploadBackgroundMusic error:', error);
            throw error;
        }
    }

    /**
     * 배경음악 삭제
     * @param {string} audioUrl
     * @returns {Promise<void>}
     */
    async deleteBackgroundMusic(audioUrl) {
        try {
            await api.delete('/api/background-music', {
                data: { audioUrl },
                errorMessage: '배경음악을 삭제할 수 없습니다.'
            });

            // 히스토리에서 제거
            this.uploadHistory.backgroundMusic = this.uploadHistory.backgroundMusic.filter(
                item => item.url !== audioUrl
            );
        } catch (error) {
            console.error('deleteBackgroundMusic error:', error);
            throw error;
        }
    }

    /**
     * 배경음악 목록 가져오기
     * @returns {Promise<Array>}
     */
    async fetchBackgroundMusicList() {
        try {
            const data = await api.get('/api/background-music', {
                errorMessage: '배경음악 목록을 불러올 수 없습니다.'
            });

            this.uploadHistory.backgroundMusic = data;
            return data;
        } catch (error) {
            console.error('fetchBackgroundMusicList error:', error);
            throw error;
        }
    }

    /**
     * 오디오 다운로드
     * @param {string} audioUrl
     * @param {string} filename
     */
    async downloadAudio(audioUrl, filename = 'audio.mp3') {
        try {
            // Blob으로 다운로드
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            
            // 다운로드 링크 생성
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('downloadAudio error:', error);
            throw error;
        }
    }

    /**
     * 모든 오디오 다운로드 (ZIP)
     * @param {Array} audioUrls
     * @param {string} zipFilename
     */
    async downloadAllAudio(audioUrls, zipFilename = 'audio-files.zip') {
        try {
            const response = await api.post('/api/download-audio-zip', {
                audioUrls
            }, {
                responseType: 'blob',
                errorMessage: '오디오를 다운로드할 수 없습니다.'
            });

            // ZIP 파일 다운로드
            const url = window.URL.createObjectURL(new Blob([response]));
            const a = document.createElement('a');
            a.href = url;
            a.download = zipFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('downloadAllAudio error:', error);
            throw error;
        }
    }

    /**
     * 오디오 재생 (미리듣기)
     * @param {string} audioUrl
     * @returns {HTMLAudioElement}
     */
    playPreview(audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(error => {
            console.error('Audio playback failed:', error);
        });
        return audio;
    }

    /**
     * 오디오 정지
     * @param {HTMLAudioElement} audio
     */
    stopPreview(audio) {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    /**
     * 히스토리 가져오기
     * @param {string} type - 'pages', 'backgroundMusic'
     * @param {string} id
     * @returns {Array}
     */
    getHistory(type, id = null) {
        if (type === 'pages' && id) {
            return this.uploadHistory.pages[id] || [];
        }
        return this.uploadHistory[type] || [];
    }

    /**
     * 히스토리 초기화
     * @param {string} type
     * @param {string} id
     */
    clearHistory(type, id = null) {
        if (type === 'pages' && id) {
            delete this.uploadHistory.pages[id];
        } else if (type) {
            this.uploadHistory[type] = type === 'pages' ? {} : [];
        } else {
            this.uploadHistory = {
                pages: {},
                backgroundMusic: []
            };
        }
    }
}

// 싱글톤 인스턴스 생성
const ttsService = new TTSService();

// 전역으로 export
if (typeof window !== 'undefined') {
    window.TTSService = TTSService;
    window.ttsService = ttsService;
}
