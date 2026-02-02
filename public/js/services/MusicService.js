/**
 * MusicService.js
 * 배경음악 관리 서비스
 */

(function() {
    'use strict';

    class MusicService {
        constructor() {
            this.api = null;
            this.musicList = [];
        }

        /**
         * 초기화
         */
        init(dependencies) {
            this.api = dependencies.api;
            console.log('✅ MusicService 초기화 완료');
        }

        /**
         * 배경음악 목록 로드
         * @returns {Promise<Array>} 배경음악 목록
         */
        async loadMusicList() {
            try {
                const response = await this.api.get('/api/background-music');
                
                if (response.data.success) {
                    this.musicList = response.data.music;
                    return this.musicList;
                }
                
                throw new Error('배경음악 목록 로드 실패');
            } catch (error) {
                console.error('❌ 배경음악 목록 로드 오류:', error);
                throw error;
            }
        }

        /**
         * 배경음악 업로드
         * @param {string} title - 배경음악 제목
         * @param {File} file - 오디오 파일
         * @returns {Promise<Object>} 업로드 결과
         */
        async uploadMusic(title, file) {
            if (!title || !title.trim()) {
                throw new Error('제목을 입력해주세요.');
            }
            
            if (!file) {
                throw new Error('오디오 파일을 선택해주세요.');
            }
            
            try {
                const formData = new FormData();
                formData.append('title', title);
                formData.append('audio', file);
                
                const response = await this.api.post('/api/background-music', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                if (response.data.success) {
                    console.log('✅ 배경음악이 추가되었습니다:', title);
                    return response.data;
                } else {
                    throw new Error(response.data.error || '업로드 실패');
                }
            } catch (error) {
                console.error('❌ 배경음악 업로드 오류:', error);
                throw error;
            }
        }

        /**
         * 배경음악 삭제
         * @param {string} id - 배경음악 ID
         * @returns {Promise<Object>} 삭제 결과
         */
        async deleteMusic(id) {
            try {
                const response = await this.api.delete(`/api/background-music/${id}`);
                
                if (response.data.success) {
                    console.log('✅ 배경음악이 삭제되었습니다:', id);
                    return response.data;
                } else {
                    throw new Error(response.data.error || '삭제 실패');
                }
            } catch (error) {
                console.error('❌ 배경음악 삭제 오류:', error);
                throw error;
            }
        }

        /**
         * 배경음악 목록 렌더링
         * @param {HTMLElement} container - 컨테이너 엘리먼트
         */
        renderMusicList(container) {
            if (!container) return;
            
            if (this.musicList.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <i class="fas fa-music text-4xl mb-2"></i>
                        <p>등록된 배경음악이 없습니다.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = this.musicList.map(music => `
                <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition">
                    <div class="flex items-center gap-3 flex-1">
                        <i class="fas fa-music text-purple-500"></i>
                        <div class="flex-1">
                            <p class="font-semibold text-gray-800">${music.title}</p>
                            <audio controls class="w-full mt-1" style="height: 30px;">
                                <source src="${music.url}" type="audio/mpeg">
                            </audio>
                        </div>
                    </div>
                    <button 
                        onclick="deleteBackgroundMusic('${music.id}')"
                        class="ml-3 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                        title="삭제"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        /**
         * 배경음악 선택 드롭다운 업데이트
         * @param {HTMLElement} selectEl - select 엘리먼트
         * @param {string} currentMusicId - 현재 선택된 음악 ID
         */
        updateMusicSelect(selectEl, currentMusicId = null) {
            if (!selectEl) return;
            
            selectEl.innerHTML = '<option value="">배경음악 없음</option>' + 
                this.musicList.map(music => `
                    <option value="${music.id}">${music.title}</option>
                `).join('');
            
            // 현재 선택된 배경음악이 있으면 선택
            if (currentMusicId) {
                selectEl.value = currentMusicId;
            }
        }

        /**
         * 선택된 배경음악 정보 표시
         * @param {HTMLElement} element - 표시할 엘리먼트
         * @param {string} musicId - 음악 ID
         */
        displaySelectedMusic(element, musicId) {
            if (!element) return;
            
            if (musicId) {
                const music = this.musicList.find(m => m.id === musicId);
                if (music) {
                    element.innerHTML = `
                        <i class="fas fa-check-circle text-green-600 mr-1"></i>
                        선택됨: <strong>${music.title}</strong>
                    `;
                } else {
                    element.innerHTML = `
                        <i class="fas fa-info-circle mr-1"></i>
                        배경음악 없음
                    `;
                }
            } else {
                element.innerHTML = `
                    <i class="fas fa-info-circle mr-1"></i>
                    배경음악 없음
                `;
            }
        }

        /**
         * 음악 ID로 음악 정보 가져오기
         * @param {string} id - 음악 ID
         * @returns {Object|null} 음악 정보
         */
        getMusicById(id) {
            return this.musicList.find(m => m.id === id) || null;
        }
    }

    // 브라우저 환경에서 전역으로 노출
    if (typeof window !== 'undefined') {
        window.MusicService = MusicService;
        console.log('✅ MusicService.js 로드 완료');
    }
})();
