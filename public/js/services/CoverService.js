/**
 * CoverService.js - 표지 관련 기능 관리
 * 표지 생성, 업로드, 히스토리 관리를 담당합니다.
 */

class CoverService {
    constructor() {
        this.currentCoverUploadTab = 'file';
        console.log('✅ CoverService.js 로드 완료');
    }

    /**
     * 표지 프롬프트 생성
     */
    buildCoverPrompt(storybook) {
        const title = storybook.title || '동화책';
        const theme = storybook.theme || '';
        const artStyle = storybook.artStyle || 'Disney animation style';
        const characters = storybook.characters.map(c => c.name).join(', ');
        
        return `Create a beautiful, professional book cover illustration for a children's storybook.

**Book Title:** ${title}
**Theme:** ${theme}
**Art Style:** ${artStyle}

**Main Characters:** ${characters}

**Cover Requirements:**
- Eye-catching, vibrant illustration that captures the story's essence
- Show the main characters in an engaging scene
- Magical, inviting atmosphere suitable for children ages 4-8
- Professional book cover quality
- Composition suitable for a vertical book cover layout

**DO NOT include:**
- Any text, title, or letters on the cover
- Book spine or binding elements
- Just pure illustration

Create a captivating cover illustration that makes children want to read this story!`;
    }

    /**
     * 표지 캐릭터 참조 토글
     */
    toggleCoverCharacterRef(storybook, charIndex, checked, saveCallback) {
        if (!storybook.coverCharacterRefs) {
            storybook.coverCharacterRefs = [];
        }
        
        if (checked) {
            if (!storybook.coverCharacterRefs.includes(charIndex)) {
                storybook.coverCharacterRefs.push(charIndex);
            }
        } else {
            storybook.coverCharacterRefs = storybook.coverCharacterRefs.filter(i => i !== charIndex);
        }
        
        if (saveCallback) saveCallback();
        console.log('✅ 표지 캐릭터 참조 업데이트:', storybook.coverCharacterRefs);
    }

    /**
     * 표지 업로드 모달 관리
     */
    openCoverUploadModal() {
        this.currentCoverUploadTab = 'file';
        document.getElementById('coverUploadModal').classList.remove('hidden');
        this.switchCoverUploadTab('file');
    }

    closeCoverUploadModal() {
        document.getElementById('coverUploadModal').classList.add('hidden');
        document.getElementById('coverFileInput').value = '';
        document.getElementById('coverUrlInput').value = '';
    }

    switchCoverUploadTab(tab) {
        this.currentCoverUploadTab = tab;
        
        const fileTab = document.getElementById('coverFileTab');
        const urlTab = document.getElementById('coverUrlTab');
        
        if (tab === 'file') {
            fileTab.classList.add('border-indigo-600', 'text-indigo-600');
            fileTab.classList.remove('border-transparent', 'text-gray-500');
            urlTab.classList.remove('border-indigo-600', 'text-indigo-600');
            urlTab.classList.add('border-transparent', 'text-gray-500');
            
            document.getElementById('coverFileUploadArea').classList.remove('hidden');
            document.getElementById('coverUrlUploadArea').classList.add('hidden');
        } else {
            urlTab.classList.add('border-indigo-600', 'text-indigo-600');
            urlTab.classList.remove('border-transparent', 'text-gray-500');
            fileTab.classList.remove('border-indigo-600', 'text-indigo-600');
            fileTab.classList.add('border-transparent', 'text-gray-500');
            
            document.getElementById('coverUrlUploadArea').classList.remove('hidden');
            document.getElementById('coverFileUploadArea').classList.add('hidden');
        }
    }

    /**
     * 표지 업로드 (파일 또는 URL)
     */
    async uploadCover(storybook, saveCallback, displayCallback) {
        if (!storybook) return;
        
        const uploadBtn = document.getElementById('coverUploadBtn');
        
        try {
            let imageUrl = '';
            
            if (this.currentCoverUploadTab === 'file') {
                // 파일 업로드
                const fileInput = document.getElementById('coverFileInput');
                const file = fileInput.files[0];
                
                if (!file) {
                    alert('파일을 선택해주세요.');
                    return;
                }
                
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>업로드 중...';
                
                const formData = new FormData();
                formData.append('image', file);
                formData.append('storybookId', storybook.id);
                formData.append('storybookTitle', storybook.title);
                formData.append('type', 'cover');
                
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
                const urlInput = document.getElementById('coverUrlInput');
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
                
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>업로드 중...';
                
                imageUrl = url;
            }
            
            // 표지 이미지 저장
            storybook.coverImage = imageUrl;
            if (saveCallback) await saveCallback();
            
            // UI 업데이트
            if (displayCallback) displayCallback(storybook);
            
            this.closeCoverUploadModal();
            
            if (window.showNotification) {
                window.showNotification('✅ 표지 이미지가 업로드되었습니다.', 'success');
            }
        } catch (error) {
            console.error('Cover upload error:', error);
            alert('이미지 업로드 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>업로드';
        }
    }

    /**
     * 표지 이미지 생성
     */
    async generateCoverImage(storybook, imageSettings, saveCallback, updateDisplayCallback) {
        if (!storybook) {
            alert('동화책을 먼저 선택해주세요.');
            return;
        }
        
        const promptTextarea = document.getElementById('cover-prompt');
        const customPrompt = promptTextarea ? promptTextarea.value.trim() : '';
        
        if (!customPrompt) {
            alert('표지 프롬프트를 입력해주세요.');
            return;
        }
        
        // 선택된 비율 가져오기 (기본값: 4:3)
        const aspectRatioSelect = document.getElementById('cover-aspect-ratio');
        const aspectRatio = aspectRatioSelect ? aspectRatioSelect.value : '4:3';
        
        // 선택된 비율 저장
        storybook.coverAspectRatio = aspectRatio;
        
        console.log(`📐 표지 비율: ${aspectRatio}`);
        
        const coverDisplay = document.getElementById('cover-image-display');
        coverDisplay.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-6"><div class="animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-3"></div><p class="text-white text-sm font-semibold">AI가 표지를 생성하는 중...</p><p class="text-white text-xs opacity-75 mt-1">실패 시 자동으로 재시도합니다</p></div>';
        
        try {
            // 참조할 캐릭터 레퍼런스 수집
            const characterReferences = [];
            if (storybook.coverCharacterRefs && storybook.coverCharacterRefs.length > 0) {
                storybook.coverCharacterRefs.forEach(charIdx => {
                    const char = storybook.characters[charIdx];
                    if (char && char.referenceImage) {
                        characterReferences.push(char.referenceImage);
                    }
                });
            }
            
            console.log(`📚 표지 생성 시작 - 참조 캐릭터: ${characterReferences.length}개`);
            
            // 재생성인 경우 기존 표지 이미지도 참조로 추가
            if (storybook.coverImage) {
                console.log('🔄 재생성 모드: 기존 표지를 레퍼런스로 추가');
                characterReferences.push(storybook.coverImage);
            }
            
            // 🔥 서버 API 호출 (R2 업로드 포함)
            const response = await axios.post('/api/generate-cover', {
                title: storybook.title,
                artStyle: storybook.artStyle || '디즈니 스타일',
                characterReferences: characterReferences,
                settings: {
                    aspectRatio: aspectRatio,
                    enforceNoText: true,
                    coverModel: imageSettings.coverModel || 'gemini-3-pro-image-preview'
                },
                customPrompt: customPrompt,
                storybookId: storybook.id
            });
            
            if (response.data.success && response.data.imageUrl) {
                const imageUrl = response.data.imageUrl; // R2 URL
                
                // 히스토리 관리
                this._manageHistory(storybook, imageUrl);
                
                storybook.coverImage = imageUrl;
                storybook.coverPrompt = customPrompt;
                
                console.log('🖼️ 표지 생성 후 상태:', {
                    currentCover: storybook.coverImage,
                    historyCount: storybook.coverImageHistory.length,
                    historyUrls: storybook.coverImageHistory.slice(0, 3)
                });
                
                if (saveCallback) saveCallback();
                
                // UI 업데이트
                if (updateDisplayCallback) updateDisplayCallback();
                
                if (window.showNotification) {
                    window.showNotification('success', '표지 생성 완료!', '동화책 표지가 생성되었습니다.');
                }
                console.log(`✅ 표지 이미지 생성 완료 (R2 업로드 포함)`);
            } else {
                throw new Error(response.data.error || '이미지 URL을 받지 못했습니다.');
            }
        } catch (error) {
            console.error('표지 생성 오류:', error);
            
            let errorMsg = error.message || '알 수 없는 오류';
            
            // 서버에서 온 상세 에러 메시지 추출
            if (error.response && error.response.data && error.response.data.error) {
                errorMsg = error.response.data.error;
            }
            
            // API 키 관련 에러 처리
            if (errorMsg.includes('API key') || errorMsg.includes('403') || errorMsg.includes('PERMISSION_DENIED')) {
                errorMsg = 'API 키 오류: Gemini API 키가 만료되었거나 유효하지 않습니다. 새로운 API 키가 필요합니다.';
            }
            
            coverDisplay.innerHTML = `
                <div class="text-center p-6">
                    <i class="fas fa-exclamation-triangle text-6xl text-white opacity-50 mb-4"></i>
                    <p class="text-white text-sm font-bold mb-2">⚠️ 생성 실패</p>
                    <p class="text-white text-xs opacity-75 mb-1">${errorMsg}</p>
                    ${errorMsg.includes('API 키') ? `
                        <p class="text-white text-xs opacity-90 mt-3 bg-white bg-opacity-10 p-3 rounded">
                            <i class="fas fa-info-circle mr-1"></i>
                            새 API 키 발급: <a href="https://makersuite.google.com/app/apikey" target="_blank" class="underline">Google AI Studio</a>
                        </p>
                    ` : ''}
                    <button 
                        onclick="generateCoverImage()"
                        class="mt-4 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
                    >
                        <i class="fas fa-redo mr-2"></i>재시도
                    </button>
                </div>
            `;
            
            // 알림도 표시
            if (window.showNotification) {
                window.showNotification('❌ ' + errorMsg, 'error');
            }
        }
    }

    /**
     * 히스토리 관리 (내부 함수)
     */
    _manageHistory(storybook, newImageUrl) {
        if (!storybook.coverImageHistory) {
            storybook.coverImageHistory = [];
        }
        
        console.log('🖼️ 표지 생성 전 상태:', {
            currentCover: storybook.coverImage ? '있음' : '없음',
            historyCount: storybook.coverImageHistory.length
        });
        
        // 현재 표지가 있고, 새 이미지와 다르면 히스토리에 추가
        if (storybook.coverImage && storybook.coverImage !== newImageUrl) {
            // 중복 방지
            if (!storybook.coverImageHistory.includes(storybook.coverImage)) {
                storybook.coverImageHistory.unshift(storybook.coverImage);
                console.log('✅ 이전 표지를 히스토리에 추가');
            } else {
                console.log('⚠️ 이전 표지가 이미 히스토리에 있음 (중복 방지)');
            }
            
            // 10개 초과 시 가장 오래된 이미지 삭제
            if (storybook.coverImageHistory.length > 10) {
                const oldestImageUrl = storybook.coverImageHistory[10];
                
                // 서버에 삭제 요청
                if (oldestImageUrl && oldestImageUrl.includes('r2.dev')) {
                    axios.delete('/api/cleanup-image', {
                        data: { imageUrl: oldestImageUrl }
                    }).catch(err => {
                        console.warn('⚠️ 히스토리 이미지 삭제 실패:', err.message);
                    });
                }
                
                storybook.coverImageHistory = storybook.coverImageHistory.slice(0, 10);
                console.log('🗑️ 오래된 히스토리 이미지 정리 완료');
            }
        }
    }

    /**
     * 히스토리에서 표지 이미지 선택
     */
    selectCoverImageFromHistory(storybook, historyIndex, saveCallback, updateDisplayCallback) {
        const selectedImage = storybook.coverImageHistory[historyIndex];
        
        console.log('🔄 히스토리에서 선택:', {
            선택된_인덱스: historyIndex,
            선택된_이미지: selectedImage,
            현재_표지: storybook.coverImage,
            히스토리_개수: storybook.coverImageHistory.length
        });
        
        // 현재 표지와 선택한 이미지가 같으면 아무것도 안 함
        if (storybook.coverImage === selectedImage) {
            console.log('⚠️ 이미 같은 이미지입니다. 교환하지 않음.');
            return;
        }
        
        // 현재 표지를 히스토리에 추가
        storybook.coverImageHistory.splice(historyIndex, 1);
        storybook.coverImageHistory.unshift(storybook.coverImage);
        
        // 선택한 이미지를 현재 표지로 설정
        storybook.coverImage = selectedImage;
        
        console.log('✅ 표지 교환 완료:', {
            새_표지: storybook.coverImage,
            히스토리_개수: storybook.coverImageHistory.length
        });
        
        if (saveCallback) saveCallback();
        if (updateDisplayCallback) updateDisplayCallback();
        
        if (window.showNotification) {
            window.showNotification('success', '표지 변경 완료', '이전 버전이 현재 표지로 설정되었습니다.');
        }
    }

    /**
     * 표지 이미지 디스플레이 업데이트
     */
    updateCoverImageDisplay(storybook) {
        const coverDisplay = document.getElementById('cover-image-display');
        if (!coverDisplay || !storybook) {
            console.warn('⚠️ updateCoverImageDisplay: coverDisplay 또는 storybook이 없음');
            return;
        }
        
        console.log('🔄 updateCoverImageDisplay 호출:', {
            coverImage: storybook.coverImage,
            historyCount: (storybook.coverImageHistory || []).length
        });
        
        const history = storybook.coverImageHistory || [];
        
        if (storybook.coverImage) {
            coverDisplay.innerHTML = `
                <div class="flex gap-2 h-full">
                    <!-- 메인 이미지 -->
                    <div class="flex-1 relative group">
                        <img src="${storybook.coverImage}" alt="표지" class="w-full h-full object-cover rounded-lg"/>
                        <button 
                            onclick="downloadImage('${storybook.coverImage}', '${storybook.title}_표지.png')"
                            class="absolute top-3 right-3 bg-white bg-opacity-90 text-indigo-600 w-12 h-12 rounded-full hover:bg-opacity-100 transition shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                            title="다운로드"
                        >
                            <i class="fas fa-download text-lg"></i>
                        </button>
                    </div>
                    ${history.length > 0 ? `
                        <!-- 히스토리 -->
                        <div class="w-24 overflow-y-auto space-y-2 p-1" style="scrollbar-width: thin; scrollbar-color: rgba(99, 102, 241, 0.5) rgba(99, 102, 241, 0.1);">
                            ${history.map((url, histIdx) => `
                                <div class="relative group cursor-pointer border-2 border-transparent hover:border-indigo-400 rounded transition" onclick="selectCoverImageFromHistory(${histIdx})" title="이전 버전 ${histIdx + 1}">
                                    <img src="${url}" alt="이전 ${histIdx + 1}" class="w-full h-20 object-cover rounded"/>
                                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                                        <i class="fas fa-check text-white opacity-0 group-hover:opacity-100 transition"></i>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            coverDisplay.innerHTML = '<div class="flex items-center justify-center h-full"><div class="text-center p-6"><i class="fas fa-book-open text-6xl text-white opacity-50 mb-4"></i><p class="text-white text-sm">표지 이미지 생성 대기중</p></div></div>';
        }
    }
}

// 전역 인스턴스 생성
window.coverService = new CoverService();
