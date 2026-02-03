/**
 * UploadService.js - 업로드 관련 기능 관리
 * 이미지, 오디오 파일 업로드 및 일괄 업로드를 담당합니다.
 */

class UploadService {
    constructor() {
        // 업로드 상태 관리
        this.currentUploadTab = 'file';
        this.currentUploadPageIndex = null;
        this.currentUploadCharIndex = null;
        this.currentUploadType = 'illustration';
        this.currentTTSUploadPageIndex = null;
        this.currentTTSUploadTab = 'file';
        this.batchUploadCancelled = false;
        this.batchUploadInProgress = false;
        
        console.log('✅ UploadService.js 로드 완료');
    }

    // ============================================
    // 삽화 업로드 모달
    // ============================================
    
    openIllustrationUploadModal(pageIndex) {
        this.currentUploadPageIndex = pageIndex;
        this.currentUploadCharIndex = null;
        this.currentUploadType = 'illustration';
        const modal = document.getElementById('illustrationUploadModal');
        const title = modal.querySelector('h2');
        title.innerHTML = '<i class="fas fa-upload mr-3 text-blue-600"></i>삽화 업로드';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        this.switchUploadTab('file');
    }

    closeIllustrationUploadModal() {
        const modal = document.getElementById('illustrationUploadModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        document.getElementById('illustrationFileInput').value = '';
        document.getElementById('illustrationUrlInput').value = '';
        this.currentUploadPageIndex = null;
        this.currentUploadCharIndex = null;
        this.currentUploadType = 'illustration';
    }

    // ============================================
    // 캐릭터 업로드 모달
    // ============================================
    
    openCharacterUploadModal(charIndex) {
        this.currentUploadPageIndex = null;
        this.currentUploadCharIndex = charIndex;
        this.currentUploadType = 'character';
        const modal = document.getElementById('illustrationUploadModal');
        const title = modal.querySelector('h2');
        title.innerHTML = '<i class="fas fa-upload mr-3 text-purple-600"></i>캐릭터 레퍼런스 업로드';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        this.switchUploadTab('file');
    }

    closeCharacterUploadModal() {
        const modal = document.getElementById('illustrationUploadModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        
        const fileInput = document.getElementById('illustrationFileInput');
        const urlInput = document.getElementById('illustrationUrlInput');
        if (fileInput) fileInput.value = '';
        if (urlInput) urlInput.value = '';
        this.currentUploadPageIndex = null;
        this.currentUploadCharIndex = null;
        this.currentUploadType = 'character';
    }

    switchCharacterUploadTab(tab) {
        const fileTab = document.querySelector('[onclick*="switchCharacterUploadTab(\'file\')"]');
        const urlTab = document.querySelector('[onclick*="switchCharacterUploadTab(\'url\')"]');
        const fileArea = document.getElementById('illustrationFileUploadArea');
        const urlArea = document.getElementById('illustrationUrlUploadArea');
        
        if (tab === 'file') {
            if (fileTab) {
                fileTab.classList.add('bg-purple-600', 'text-white');
                fileTab.classList.remove('bg-gray-200', 'text-gray-700');
            }
            if (urlTab) {
                urlTab.classList.remove('bg-purple-600', 'text-white');
                urlTab.classList.add('bg-gray-200', 'text-gray-700');
            }
            if (fileArea) fileArea.classList.remove('hidden');
            if (urlArea) urlArea.classList.add('hidden');
        } else {
            if (urlTab) {
                urlTab.classList.add('bg-purple-600', 'text-white');
                urlTab.classList.remove('bg-gray-200', 'text-gray-700');
            }
            if (fileTab) {
                fileTab.classList.remove('bg-purple-600', 'text-white');
                fileTab.classList.add('bg-gray-200', 'text-gray-700');
            }
            if (urlArea) urlArea.classList.remove('hidden');
            if (fileArea) fileArea.classList.add('hidden');
        }
    }

    // ============================================
    // 표지 이미지 업로드 모달
    // ============================================
    
    openCoverImageUploadModal() {
        this.currentUploadPageIndex = null;
        this.currentUploadCharIndex = null;
        this.currentUploadType = 'cover';
        const modal = document.getElementById('illustrationUploadModal');
        const title = modal.querySelector('h2');
        title.innerHTML = '<i class="fas fa-upload mr-3 text-indigo-600"></i>표지 이미지 업로드';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        this.switchUploadTab('file');
    }

    // ============================================
    // TTS 업로드 모달
    // ============================================
    
    openTTSUploadModal(pageIndex) {
        this.currentTTSUploadPageIndex = pageIndex;
        const modal = document.getElementById('ttsUploadModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        this.switchTTSUploadTab('file');
    }

    closeTTSUploadModal() {
        const modal = document.getElementById('ttsUploadModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        document.getElementById('ttsFileInput').value = '';
        document.getElementById('ttsUrlInput').value = '';
        this.currentTTSUploadPageIndex = null;
    }

    switchTTSUploadTab(tab) {
        this.currentTTSUploadTab = tab;
        
        const fileTab = document.getElementById('ttsUploadTabFile');
        const urlTab = document.getElementById('ttsUploadTabUrl');
        const fileContent = document.getElementById('ttsUploadContentFile');
        const urlContent = document.getElementById('ttsUploadContentUrl');
        
        if (tab === 'file') {
            fileTab.classList.add('border-blue-600', 'text-blue-600');
            fileTab.classList.remove('text-gray-600');
            urlTab.classList.remove('border-blue-600', 'text-blue-600');
            urlTab.classList.add('text-gray-600');
            
            fileContent.classList.remove('hidden');
            urlContent.classList.add('hidden');
        } else {
            urlTab.classList.add('border-blue-600', 'text-blue-600');
            urlTab.classList.remove('text-gray-600');
            fileTab.classList.remove('border-blue-600', 'text-blue-600');
            fileTab.classList.add('text-gray-600');
            
            urlContent.classList.remove('hidden');
            fileContent.classList.add('hidden');
        }
    }

    // ============================================
    // 일반 업로드 탭 전환
    // ============================================
    
    switchUploadTab(tab) {
        this.currentUploadTab = tab;
        
        const fileTab = document.getElementById('uploadTabFile');
        const urlTab = document.getElementById('uploadTabUrl');
        const fileContent = document.getElementById('uploadContentFile');
        const urlContent = document.getElementById('uploadContentUrl');
        
        if (tab === 'file') {
            fileTab.classList.add('border-blue-600', 'text-blue-600');
            fileTab.classList.remove('text-gray-600');
            urlTab.classList.remove('border-blue-600', 'text-blue-600');
            urlTab.classList.add('text-gray-600');
            
            fileContent.classList.remove('hidden');
            urlContent.classList.add('hidden');
        } else {
            urlTab.classList.add('border-blue-600', 'text-blue-600');
            urlTab.classList.remove('text-gray-600');
            fileTab.classList.remove('border-blue-600', 'text-blue-600');
            fileTab.classList.add('text-gray-600');
            
            urlContent.classList.remove('hidden');
            fileContent.classList.add('hidden');
        }
    }

    // ============================================
    // TTS 오디오 업로드
    // ============================================
    
    async uploadTTSAudio(storybook, currentLanguage, saveCallback, displayCallback) {
        if (this.currentTTSUploadPageIndex === null) {
            alert('페이지가 선택되지 않았습니다.');
            return;
        }
        
        try {
            let audioUrl = '';
            
            if (this.currentTTSUploadTab === 'file') {
                // 파일 업로드
                const fileInput = document.getElementById('ttsFileInput');
                const file = fileInput.files[0];
                
                if (!file) {
                    alert('오디오 파일을 선택하세요.');
                    return;
                }
                
                const formData = new FormData();
                formData.append('audio', file);
                formData.append('storybookId', storybook.id);
                formData.append('storybookTitle', storybook.title);
                formData.append('pageNumber', storybook.pages[this.currentTTSUploadPageIndex].pageNumber);
                formData.append('language', currentLanguage);
                
                if (window.showNotification) {
                    window.showNotification('오디오 업로드 중...', 'info');
                }
                
                const response = await fetch('/api/upload-tts', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('오디오 업로드 실패');
                }
                
                const result = await response.json();
                audioUrl = result.audioUrl;
                
            } else {
                // URL 입력
                const urlInput = document.getElementById('ttsUrlInput');
                audioUrl = urlInput.value.trim();
                
                if (!audioUrl) {
                    alert('오디오 URL을 입력하세요.');
                    return;
                }
            }
            
            // 페이지에 오디오 URL 저장
            const page = storybook.pages[this.currentTTSUploadPageIndex];
            
            if (currentLanguage === 'ko') {
                page.audioUrl = audioUrl;
            } else {
                if (!page.translatedAudioUrls) {
                    page.translatedAudioUrls = {};
                }
                page.translatedAudioUrls[currentLanguage] = audioUrl;
            }
            
            // R2에 저장
            console.log(`💾 R2 저장 시작: ${storybook.title}`);
            const saveResponse = await axios.post('/api/storybooks', storybook, {
                timeout: 300000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!saveResponse.data.success) {
                throw new Error('R2 저장 실패');
            }
            
            console.log(`✅ R2 저장 완료: ${storybook.title}`);
            
            // UI 업데이트
            if (displayCallback) displayCallback(storybook);
            
            // 모달 닫기
            this.closeTTSUploadModal();
            
            if (window.showNotification) {
                window.showNotification('✅ TTS 오디오가 업로드되었습니다!', 'success');
            }
            
        } catch (error) {
            console.error('TTS 업로드 오류:', error);
            if (window.showNotification) {
                window.showNotification('❌ TTS 업로드 실패: ' + error.message, 'error');
            }
        }
    }

    // ============================================
    // 삽화/캐릭터/표지 업로드
    // ============================================
    
    async uploadIllustration(storybook, saveCallback, displayCallback) {
        const uploadBtn = document.getElementById('uploadIllustrationBtn');
        const originalText = uploadBtn.innerHTML;
        
        try {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>업로드 중...';
            
            let imageUrl = null;
            
            if (this.currentUploadTab === 'file') {
                // 파일 업로드
                const fileInput = document.getElementById('illustrationFileInput');
                const file = fileInput.files[0];
                
                if (!file) {
                    alert('파일을 선택해주세요.');
                    return;
                }
                
                const formData = new FormData();
                formData.append('image', file);
                formData.append('storybookId', storybook.id);
                formData.append('storybookTitle', storybook.title);
                formData.append('type', this.currentUploadType);
                
                if (this.currentUploadType === 'illustration' && this.currentUploadPageIndex !== null) {
                    formData.append('pageNumber', storybook.pages[this.currentUploadPageIndex].pageNumber);
                } else if (this.currentUploadType === 'character' && this.currentUploadCharIndex !== null) {
                    formData.append('characterIndex', this.currentUploadCharIndex);
                    formData.append('characterName', storybook.characters[this.currentUploadCharIndex].name);
                }
                
                const response = await axios.post('/api/upload-image', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                if (response.data.success) {
                    imageUrl = response.data.imageUrl;
                } else {
                    throw new Error(response.data.error || '이미지 업로드 실패');
                }
            } else {
                // URL 입력
                const urlInput = document.getElementById('illustrationUrlInput');
                const url = urlInput.value.trim();
                
                if (!url) {
                    alert('URL을 입력해주세요.');
                    return;
                }
                
                // URL 유효성 검사
                try {
                    new URL(url);
                } catch (e) {
                    alert('올바른 URL을 입력해주세요.');
                    return;
                }
                
                imageUrl = url;
            }
            
            // 타입별로 이미지 적용
            if (this.currentUploadType === 'illustration' && this.currentUploadPageIndex !== null) {
                const page = storybook.pages[this.currentUploadPageIndex];
                
                if (page.illustrationImage) {
                    if (!page.illustrationHistory) {
                        page.illustrationHistory = [];
                    }
                    page.illustrationHistory.unshift(page.illustrationImage);
                    console.log(`📸 이전 이미지를 히스토리에 추가 (총 ${page.illustrationHistory.length}개)`);
                    
                    if (page.illustrationHistory.length > 10) {
                        page.illustrationHistory.splice(10);
                    }
                }
                
                page.illustrationImage = imageUrl;
            } else if (this.currentUploadType === 'character' && this.currentUploadCharIndex !== null) {
                storybook.characters[this.currentUploadCharIndex].referenceImage = imageUrl;
            } else if (this.currentUploadType === 'cover') {
                storybook.coverImage = imageUrl;
            }
            
            if (saveCallback) await saveCallback();
            if (displayCallback) displayCallback(storybook);
            
            this.closeIllustrationUploadModal();
            
            const uploadTypeText = this.currentUploadType === 'illustration' ? '삽화' : 
                                   this.currentUploadType === 'character' ? '캐릭터 레퍼런스' : '표지';
            if (window.showNotification) {
                window.showNotification('success', '업로드 완료', `${uploadTypeText} 이미지가 업로드되었습니다.`);
            }
            
        } catch (error) {
            console.error('업로드 오류:', error);
            alert('업로드 실패: ' + error.message);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalText;
        }
    }

    // ============================================
    // 일괄 업로드
    // ============================================
    
    openBatchUploadModal(storybook) {
        if (!storybook || !storybook.pages) {
            alert('동화책이 선택되지 않았습니다.');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            files.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
            
            const totalPages = storybook.pages.length;
            
            if (files.length > totalPages) {
                if (!confirm(`선택한 파일(${files.length}개)이 페이지 수(${totalPages}개)보다 많습니다. 처음 ${totalPages}개만 업로드하시겠습니까?`)) {
                    return;
                }
                files.splice(totalPages);
            }
            
            if (!confirm(`${files.length}개의 이미지를 페이지 1부터 순서대로 업로드하시겠습니까?`)) {
                return;
            }
            
            await this.batchUploadIllustrations(storybook, files);
        };
        
        input.click();
    }

    openBatchTTSUploadModal(storybook, currentLanguage) {
        if (!storybook || !storybook.pages) {
            alert('동화책이 선택되지 않았습니다.');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'audio/*,.mp3,.wav,.m4a';
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            // 파일명 기준 정렬
            files.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
            
            const totalPages = storybook.pages.length;
            
            if (files.length > totalPages) {
                if (!confirm(`선택한 파일(${files.length}개)이 페이지 수(${totalPages}개)보다 많습니다. 처음 ${totalPages}개만 업로드하시겠습니까?`)) {
                    return;
                }
                files.splice(totalPages);
            }
            
            const langName = {
                'ko': '한국어',
                'en': 'English',
                'zh': '中文',
                'ja': '日本語',
                'es': 'Español',
                'fr': 'Français'
            }[currentLanguage] || currentLanguage;
            
            if (!confirm(`${files.length}개의 TTS 오디오를 ${langName} 페이지 1부터 순서대로 업로드하시겠습니까?`)) {
                return;
            }
            
            await this.batchUploadTTS(storybook, files, currentLanguage);
        };
        
        input.click();
    }

    async batchUploadIllustrations(storybook, files) {
        this.batchUploadCancelled = false;
        this.batchUploadInProgress = true;
        
        const btn = document.getElementById('batch-illust-upload-btn');
        const originalHTML = btn?.innerHTML;
        
        let successCount = 0;
        let failCount = 0;
        
        try {
            for (let i = 0; i < files.length; i++) {
                if (this.batchUploadCancelled) {
                    if (window.showNotification) {
                        window.showNotification('warning', '업로드 취소', `${successCount}개 업로드 완료, ${files.length - i}개 취소됨`);
                    }
                    break;
                }
                
                const file = files[i];
                const pageIndex = i;
                
                if (btn) {
                    btn.innerHTML = `
                        <i class="fas fa-spinner fa-spin mr-2"></i>
                        업로드 중... (${i + 1}/${files.length})
                    `;
                }
                
                try {
                    const formData = new FormData();
                    formData.append('image', file);
                    formData.append('storybookId', storybook.id);
                    formData.append('storybookTitle', storybook.title);
                    formData.append('type', 'illustration');
                    formData.append('pageNumber', storybook.pages[pageIndex].pageNumber);
                    
                    const response = await axios.post('/api/upload-image', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    
                    if (response.data.success) {
                        const page = storybook.pages[pageIndex];
                        
                        if (page.illustrationImage) {
                            if (!page.illustrationHistory) {
                                page.illustrationHistory = [];
                            }
                            page.illustrationHistory.unshift(page.illustrationImage);
                            if (page.illustrationHistory.length > 10) {
                                page.illustrationHistory.splice(10);
                            }
                        }
                        
                        page.illustrationImage = response.data.imageUrl;
                        successCount++;
                    } else {
                        throw new Error(response.data.error || '업로드 실패');
                    }
                } catch (error) {
                    console.error(`페이지 ${i + 1} 업로드 실패:`, error);
                    failCount++;
                }
            }
            
            // 결과 알림
            if (window.showNotification) {
                if (failCount === 0) {
                    window.showNotification('success', '일괄 업로드 완료', `${successCount}개 이미지가 업로드되었습니다.`);
                } else {
                    window.showNotification('warning', '일괄 업로드 완료', `성공: ${successCount}개, 실패: ${failCount}개`);
                }
            }
            
            // 서버에 저장 및 UI 업데이트
            if (successCount > 0) {
                try {
                    await axios.put(`/api/storybooks/${storybook.id}`, storybook);
                    console.log('✅ 일괄 업로드 후 저장 완료');
                    
                    // UI 업데이트
                    if (window.displayStorybook && window.currentStorybook) {
                        window.displayStorybook(window.currentStorybook);
                    }
                } catch (error) {
                    console.error('❌ 저장 실패:', error);
                    if (window.showNotification) {
                        window.showNotification('error', '저장 실패', '이미지는 업로드되었지만 저장에 실패했습니다.');
                    }
                }
            }
            
        } finally {
            this.batchUploadInProgress = false;
            if (btn && originalHTML) {
                btn.innerHTML = originalHTML;
            }
        }
    }

    async batchUploadTTS(storybook, files, currentLanguage) {
        this.batchUploadCancelled = false;
        this.batchUploadInProgress = true;
        
        const btn = document.getElementById('batch-tts-upload-btn');
        const originalHTML = btn?.innerHTML;
        
        let successCount = 0;
        let failCount = 0;
        
        try {
            for (let i = 0; i < files.length; i++) {
                if (this.batchUploadCancelled) {
                    if (window.showNotification) {
                        window.showNotification('warning', '업로드 취소', `${successCount}개 업로드 완료, ${files.length - i}개 취소됨`);
                    }
                    break;
                }
                
                const file = files[i];
                const pageIndex = i;
                
                if (btn) {
                    btn.innerHTML = `
                        <i class="fas fa-spinner fa-spin mr-2"></i>
                        TTS 업로드 중... (${i + 1}/${files.length})
                    `;
                }
                
                try {
                    const formData = new FormData();
                    formData.append('audio', file);
                    formData.append('storybookId', storybook.id);
                    formData.append('storybookTitle', storybook.title);
                    formData.append('pageNumber', storybook.pages[pageIndex].pageNumber);
                    formData.append('language', currentLanguage);
                    
                    const response = await axios.post('/api/upload-tts', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    
                    if (response.data.success) {
                        const page = storybook.pages[pageIndex];
                        const audioUrl = response.data.audioUrl;
                        
                        // 언어별 TTS 저장
                        if (currentLanguage === 'ko') {
                            // 한국어: ttsAudio.url 구조 사용
                            if (!page.ttsAudio) {
                                page.ttsAudio = {};
                            }
                            page.ttsAudio.url = audioUrl;
                            // 하위 호환성
                            page.audioUrl = audioUrl;
                        } else {
                            // 다른 언어: ttsAudio[lang].url 구조
                            if (!page.ttsAudio) {
                                page.ttsAudio = {};
                            }
                            if (!page.ttsAudio[currentLanguage]) {
                                page.ttsAudio[currentLanguage] = {};
                            }
                            page.ttsAudio[currentLanguage].url = audioUrl;
                        }
                        
                        successCount++;
                    } else {
                        throw new Error(response.data.error || '업로드 실패');
                    }
                } catch (error) {
                    console.error(`페이지 ${i + 1} TTS 업로드 실패:`, error);
                    failCount++;
                }
            }
            
            // R2에 저장
            try {
                console.log(`💾 R2 저장 시작: ${storybook.title}`);
                const saveResponse = await axios.post('/api/storybooks', storybook, {
                    timeout: 300000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!saveResponse.data.success) {
                    throw new Error('R2 저장 실패');
                }
                
                console.log(`✅ R2 저장 완료: ${storybook.title}`);
                
                // UI 업데이트
                if (window.displayStorybook && window.currentStorybook) {
                    window.displayStorybook(window.currentStorybook);
                }
            } catch (error) {
                console.error('R2 저장 오류:', error);
            }
            
            // 결과 알림
            if (window.showNotification) {
                if (failCount === 0) {
                    window.showNotification('success', 'TTS 일괄 업로드 완료', `${successCount}개 오디오가 업로드되었습니다.`);
                } else {
                    window.showNotification('warning', 'TTS 일괄 업로드 완료', `성공: ${successCount}개, 실패: ${failCount}개`);
                }
            }
            
        } finally {
            this.batchUploadInProgress = false;
            if (btn && originalHTML) {
                btn.innerHTML = originalHTML;
            }
        }
    }

    cancelBatchUpload() {
        this.batchUploadCancelled = true;
    }

    // ============================================
    // 캐릭터 업로드 (개별)
    // ============================================
    
    async uploadCharacter(storybook, charIndex, saveCallback, displayCallback) {
        if (!storybook || !storybook.characters[charIndex]) {
            alert('캐릭터를 찾을 수 없습니다.');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('storybookId', storybook.id);
                formData.append('storybookTitle', storybook.title);
                formData.append('type', 'character');
                formData.append('characterIndex', charIndex);
                formData.append('characterName', storybook.characters[charIndex].name);
                
                if (window.showNotification) {
                    window.showNotification('이미지 업로드 중...', 'info');
                }
                
                const response = await axios.post('/api/upload-image', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                if (response.data.success) {
                    storybook.characters[charIndex].referenceImage = response.data.imageUrl;
                    
                    if (saveCallback) await saveCallback();
                    if (displayCallback) displayCallback(storybook);
                    
                    if (window.showNotification) {
                        window.showNotification('success', '업로드 완료', '캐릭터 이미지가 업로드되었습니다.');
                    }
                } else {
                    throw new Error(response.data.error || '업로드 실패');
                }
            } catch (error) {
                console.error('캐릭터 업로드 오류:', error);
                alert('업로드 실패: ' + error.message);
            }
        };
        
        input.click();
    }

    // ============================================
    // Key Object 일괄 업로드
    // ============================================
    
    async bulkUploadKeyObjectImages(storybook, saveCallback, displayCallback) {
        if (!storybook || !storybook.key_objects || storybook.key_objects.length === 0) {
            alert('Key Objects가 없습니다.');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            files.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
            
            if (!confirm(`${files.length}개의 이미지를 Key Objects에 순서대로 업로드하시겠습니까?`)) {
                return;
            }
            
            try {
                for (let i = 0; i < Math.min(files.length, storybook.key_objects.length); i++) {
                    const file = files[i];
                    const keyObject = storybook.key_objects[i];
                    
                    const formData = new FormData();
                    formData.append('image', file);
                    formData.append('storybookId', storybook.id);
                    formData.append('storybookTitle', storybook.title);
                    formData.append('type', 'key-object');
                    formData.append('objectName', keyObject.name);
                    
                    const response = await axios.post('/api/upload-image', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    
                    if (response.data.success) {
                        keyObject.imageUrl = response.data.imageUrl;
                    }
                }
                
                if (saveCallback) await saveCallback();
                if (displayCallback) displayCallback(storybook);
                
                if (window.showNotification) {
                    window.showNotification('success', '일괄 업로드 완료', 'Key Object 이미지가 업로드되었습니다.');
                }
            } catch (error) {
                console.error('일괄 업로드 오류:', error);
                alert('업로드 실패: ' + error.message);
            }
        };
        
        input.click();
    }

    // ============================================
    // 배경음악 업로드
    // ============================================
    
    async uploadBackgroundMusic(storybook, saveCallback, displayCallback) {
        const fileInput = document.getElementById('backgroundMusicFileInput');
        const file = fileInput?.files[0];
        
        if (!file) {
            alert('파일을 선택해주세요.');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('audio', file);
            formData.append('storybookId', storybook.id);
            formData.append('storybookTitle', storybook.title);
            
            if (window.showNotification) {
                window.showNotification('배경음악 업로드 중...', 'info');
            }
            
            const response = await axios.post('/api/upload-background-music', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (response.data.success) {
                storybook.backgroundMusicUrl = response.data.audioUrl;
                
                if (saveCallback) await saveCallback();
                if (displayCallback) displayCallback(storybook);
                
                if (window.showNotification) {
                    window.showNotification('success', '업로드 완료', '배경음악이 업로드되었습니다.');
                }
            } else {
                throw new Error(response.data.error || '업로드 실패');
            }
        } catch (error) {
            console.error('배경음악 업로드 오류:', error);
            alert('업로드 실패: ' + error.message);
        }
    }
}

// 전역 인스턴스 생성
window.uploadService = new UploadService();
