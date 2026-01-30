// 전역 변수
let storybooks = [];
let currentStorybook = null;
let currentLanguage = 'ko'; // 현재 표시 중인 언어 (기본: 한국어)
let imageSettings = {
    aspectRatio: '16:9',
    enforceNoText: true,
    enforceCharacterConsistency: true,
    additionalPrompt: '',
    imageQuality: 'high',
    imageModel: 'gemini-3-pro-image-preview',  // 기본값: Nano Banana Pro (Gemini 3 Pro Image Preview)
    characterModel: 'gemini-3-pro-image-preview',  // 캐릭터 레퍼런스 모델
    keyObjectModel: 'gemini-3-pro-image-preview',  // Key Object 모델
    illustrationModel: 'gemini-3-pro-image-preview',  // 페이지 삽화 모델
    vocabularyModel: 'gemini-3-pro-image-preview',  // 8단어 학습 모델
    coverModel: 'gemini-3-pro-image-preview',  // 표지 모델
    geminiTTSModel: 'gemini-2.5-flash-preview-tts',  // Gemini TTS 생성 모델 (기본값)
    ttsModel: 'Aoede',  // TTS Voice (Gemini TTS Voice) - 여성 목소리
    ttsVoiceConfig: '여성 목소리, 부드럽고 따뜻한 톤, 동화 낭독 스타일, 적당한 속도로 또박또박, 어린이가 이해하기 쉽게'  // TTS 음성 설정
};

// API 키 가져오기 함수
function getAPIKey() {
    // localStorage에서 커스텀 API 키 확인
    const customApiKey = localStorage.getItem('gemini_api_key');
    if (customApiKey && customApiKey.trim()) {
        return customApiKey.trim();
    }
    
    // gemini-client.js의 전역 변수 확인
    if (typeof GEMINI_API_KEY !== 'undefined' && GEMINI_API_KEY) {
        return GEMINI_API_KEY;
    }
    
    // 기본값 없음
    return null;
}

// 이미지 모델 목록 (이미지 생성 전용)
const IMAGE_MODELS = [
    { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro (Gemini 3 Pro) ⭐', description: '최고 품질, 네이티브 이미지 생성, 최대 14개 참조 이미지 지원' },
    { value: 'imagen-4', label: 'Imagen 4', description: 'Google 전문 이미지 생성 모델, 텍스트 렌더링 우수' }
];

// TTS 모델 목록 (Gemini TTS Voices)
const TTS_MODELS = [
    { value: 'Aoede', label: 'Aoede ⭐', description: '우아하고 부드러운 여성 목소리 (권장)' },
    { value: 'Kore', label: 'Kore', description: '밝고 경쾌한 여성 목소리' },
    { value: 'Puck', label: 'Puck', description: '명랑하고 활기찬 남성 목소리' },
    { value: 'Charon', label: 'Charon', description: '깊고 안정적인 남성 목소리' },
    { value: 'Fenrir', label: 'Fenrir', description: '차분하고 따뜻한 남성 목소리' }
];

// 모델 선택 HTML 생성 함수
function createModelSelect(sectionName, currentModel, onChangeFunction) {
    const modelOptions = IMAGE_MODELS.map(model => 
        `<option value="${model.value}" ${currentModel === model.value ? 'selected' : ''}>${model.label}</option>`
    ).join('');
    
    return `
        <div class="flex items-center gap-2">
            <i class="fas fa-robot text-gray-600"></i>
            <select 
                id="${sectionName}-model-select"
                onchange="${onChangeFunction}"
                class="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
                ${modelOptions}
            </select>
        </div>
    `;
}

// 캐릭터 레퍼런스 모델 변경
function updateCharacterModel(value) {
    imageSettings.characterModel = value;
    saveImageSettings();
    console.log('✅ 캐릭터 레퍼런스 모델 변경:', value);
}

// Key Object 모델 변경
function updateKeyObjectModel(value) {
    imageSettings.keyObjectModel = value;
    saveImageSettings();
    console.log('✅ Key Object 모델 변경:', value);
}

// 페이지 삽화 모델 변경
function updateIllustrationModel(value) {
    imageSettings.illustrationModel = value;
    saveImageSettings();
    console.log('✅ 페이지 삽화 모델 변경:', value);
}

// 8단어 학습 모델 변경
function updateVocabularyModel(value) {
    imageSettings.vocabularyModel = value;
    saveImageSettings();
    console.log('✅ 8단어 학습 모델 변경:', value);
}

// TTS 모델 선택 HTML 생성 (설명 포함)
function createTTSModelSelect(currentModel, pageIndex) {
    const modelOptions = TTS_MODELS.map(model => 
        `<option value="${model.value}" data-description="${model.description}" ${currentModel === model.value ? 'selected' : ''}>${model.label} - ${model.description}</option>`
    ).join('');
    
    // 현재 선택된 모델의 설명 찾기
    const currentModelInfo = TTS_MODELS.find(m => m.value === currentModel);
    const description = currentModelInfo ? currentModelInfo.description : '';
    
    return `
        <div class="flex flex-col gap-1.5">
            <select 
                id="tts-model-select-${pageIndex}"
                onchange="updatePageTTSModelDescription(${pageIndex}, this.value)"
                class="text-xs md:text-sm border-2 border-blue-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
                ${modelOptions}
            </select>
            <p id="tts-model-desc-${pageIndex}" class="text-[10px] md:text-xs text-gray-600 italic bg-blue-50 p-2 rounded border border-blue-200">
                <i class="fas fa-info-circle mr-1 text-blue-500"></i>${description}
            </p>
        </div>
    `;
}

// TTS 모델 변경
function updateTTSModel(value) {
    imageSettings.ttsModel = value;
    saveImageSettings();
    console.log('✅ TTS 모델 변경:', value);
}

// TTS 모델 설명 업데이트 (설정 모달용)
function updateTTSModelDescription(value) {
    const modelInfo = TTS_MODELS.find(m => m.value === value);
    const descElement = document.getElementById('ttsModelDescription');
    if (descElement && modelInfo) {
        descElement.innerHTML = `<i class="fas fa-info-circle mr-1 text-teal-500"></i>${modelInfo.description}`;
    }
}


// TTS 음성 설정 변경
function updateTTSVoiceConfig(value) {
    imageSettings.ttsVoiceConfig = value;
    saveImageSettings();
    console.log('✅ TTS 음성 설정 변경:', value);
}

// 페이지 TTS 생성
async function generatePageTTS(pageIndex) {
    if (!currentStorybook || !currentStorybook.pages[pageIndex]) {
        alert('페이지 정보가 없습니다.');
        return;
    }
    
    const page = currentStorybook.pages[pageIndex];
    // 현재 언어의 텍스트 가져오기
    const text = getPageText(page, currentLanguage);
    
    if (!text || text.trim().length === 0) {
        alert('텍스트가 없습니다.');
        return;
    }
    
    const ttsButton = document.getElementById(`tts-btn-${pageIndex}`);
    const ttsPlayer = document.getElementById(`tts-player-${pageIndex}`);
    
    // 로딩 표시
    if (ttsButton) {
        ttsButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>생성중...';
        ttsButton.disabled = true;
    }
    
    try {
        const response = await axios.post('/api/generate-tts', {
            text: text,
            language: currentLanguage,
            geminiModel: imageSettings.geminiTTSModel || 'gemini-2.5-flash-preview-tts',  // Gemini TTS 생성 모델
            model: imageSettings.ttsModel || 'Aoede',  // TTS Voice (Puck, Kore 등)
            voiceConfig: imageSettings.ttsVoiceConfig,
            storybookId: currentStorybook?.id,
            storybookTitle: currentStorybook?.title,
            pageNumber: currentStorybook.pages[pageIndex].pageNumber
        }, {
            timeout: 180000 // 3분 타임아웃
        });
        
        if (response.data.success && response.data.audioUrl) {
            // 언어별 TTS 저장
            if (!currentStorybook.pages[pageIndex].ttsAudio) {
                currentStorybook.pages[pageIndex].ttsAudio = {};
            }
            
            // 언어별로 TTS 저장
            if (currentLanguage === 'ko') {
                currentStorybook.pages[pageIndex].ttsAudio.url = response.data.audioUrl;
                currentStorybook.pages[pageIndex].ttsAudio.model = imageSettings.ttsModel;
                // 하위 호환성을 위해 audioUrl에도 저장
                currentStorybook.pages[pageIndex].audioUrl = response.data.audioUrl;
            } else {
                // 다른 언어의 경우 ttsAudio 객체에 언어별로 저장
                if (!currentStorybook.pages[pageIndex].ttsAudio[currentLanguage]) {
                    currentStorybook.pages[pageIndex].ttsAudio[currentLanguage] = {};
                }
                currentStorybook.pages[pageIndex].ttsAudio[currentLanguage].url = response.data.audioUrl;
                currentStorybook.pages[pageIndex].ttsAudio[currentLanguage].model = imageSettings.ttsModel;
            }
            
            // R2 저장 완료까지 대기
            console.log('💾 TTS 생성 후 R2 저장 중...');
            try {
                await saveToR2(currentStorybook);
                console.log('✅ R2 저장 완료');
            } catch (saveError) {
                console.error('❌ R2 저장 최종 실패:', saveError);
                // 저장 실패해도 TTS는 메모리에 있으므로 계속 진행
            }
            
            // UI 즉시 업데이트 - 현재 동화책을 다시 렌더링
            displayStorybook(currentStorybook);
            
            showNotification('success', 'TTS 생성 완료!', '음성이 생성되었습니다.');
        } else {
            throw new Error(response.data.error || 'TTS 생성 실패');
        }
    } catch (error) {
        console.error('TTS 생성 오류:', error);
        
        let errorMsg = 'TTS 생성 중 오류가 발생했습니다.';
        
        // 할당량 초과 에러
        if (error.response?.status === 429 || error.message.includes('quota') || error.message.includes('Quota')) {
            errorMsg = '🚫 API 할당량 초과\n\nGemini TTS API 일일 할당량을 초과했습니다.\n\n해결 방법:\n1. 내일 다시 시도\n2. Google AI Studio에서 할당량 늘리기\n3. 청구 설정 활성화';
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            errorMsg += '\n\n⏱️ 시간이 초과되었습니다.\n텍스트가 너무 길거나 서버가 응답하지 않습니다.';
        } else if (error.response?.data?.error) {
            errorMsg += '\n\n' + error.response.data.error;
        } else {
            errorMsg += '\n\n' + error.message;
        }
        
        alert(errorMsg);
        
        // 버튼 복원
        if (ttsButton) {
            ttsButton.innerHTML = '<i class="fas fa-volume-up mr-1"></i>음성 생성';
            ttsButton.disabled = false;
        }
    }
}

// 표지 모델 변경
function updateCoverModel(value) {
    imageSettings.coverModel = value;
    saveImageSettings();
    console.log('✅ 표지 모델 변경:', value);
}

// 표지 프롬프트 생성
function buildCoverPrompt(storybook) {
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

// 표지 프롬프트 초기화
function resetCoverPrompt() {
    if (!currentStorybook) return;
    const promptTextarea = document.getElementById('cover-prompt');
    if (promptTextarea) {
        promptTextarea.value = buildCoverPrompt(currentStorybook);
        currentStorybook.coverPrompt = promptTextarea.value;
        saveCurrentStorybook();
    }
}

// 표지 캐릭터 참조 토글
function toggleCoverCharacterRef(charIndex, checked) {
    if (!currentStorybook) return;
    
    if (!currentStorybook.coverCharacterRefs) {
        currentStorybook.coverCharacterRefs = [];
    }
    
    if (checked) {
        if (!currentStorybook.coverCharacterRefs.includes(charIndex)) {
            currentStorybook.coverCharacterRefs.push(charIndex);
        }
    } else {
        currentStorybook.coverCharacterRefs = currentStorybook.coverCharacterRefs.filter(i => i !== charIndex);
    }
    
    saveCurrentStorybook();
    console.log('✅ 표지 캐릭터 참조 업데이트:', currentStorybook.coverCharacterRefs);
}

// 표지 업로드 모달
let currentCoverUploadTab = 'file';

function openCoverUploadModal() {
    currentCoverUploadTab = 'file';
    document.getElementById('coverUploadModal').classList.remove('hidden');
    switchCoverUploadTab('file');
}

function closeCoverUploadModal() {
    document.getElementById('coverUploadModal').classList.add('hidden');
    document.getElementById('coverFileInput').value = '';
    document.getElementById('coverUrlInput').value = '';
}

function switchCoverUploadTab(tab) {
    currentCoverUploadTab = tab;
    
    // 탭 버튼 스타일
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

async function uploadCover() {
    if (!currentStorybook) return;
    
    const uploadBtn = document.getElementById('coverUploadBtn');
    
    try {
        let imageUrl = '';
        
        if (currentCoverUploadTab === 'file') {
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
            formData.append('storybookId', currentStorybook.id);
            formData.append('storybookTitle', currentStorybook.title);
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
        currentStorybook.coverImage = imageUrl;
        await saveCurrentStorybook();
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        
        closeCoverUploadModal();
        
        showNotification('✅ 표지 이미지가 업로드되었습니다.', 'success');
    } catch (error) {
        console.error('Cover upload error:', error);
        alert('이미지 업로드 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>업로드';
    }
}

// 표지 이미지 생성
async function generateCoverImage() {
    if (!currentStorybook) {
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
    currentStorybook.coverAspectRatio = aspectRatio;
    
    console.log(`📐 표지 비율: ${aspectRatio}`);
    
    const coverDisplay = document.getElementById('cover-image-display');
    coverDisplay.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-6"><div class="animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-3"></div><p class="text-white text-sm font-semibold">AI가 표지를 생성하는 중...</p><p class="text-white text-xs opacity-75 mt-1">실패 시 자동으로 재시도합니다</p></div>';
    
    try {
        // 참조할 캐릭터 레퍼런스 수집
        const characterReferences = [];
        if (currentStorybook.coverCharacterRefs && currentStorybook.coverCharacterRefs.length > 0) {
            currentStorybook.coverCharacterRefs.forEach(charIdx => {
                const char = currentStorybook.characters[charIdx];
                if (char && char.referenceImage) {
                    characterReferences.push(char.referenceImage);
                }
            });
        }
        
        console.log(`📚 표지 생성 시작 - 참조 캐릭터: ${characterReferences.length}개`);
        
        // 재생성인 경우 기존 표지 이미지도 참조로 추가
        if (currentStorybook.coverImage) {
            console.log('🔄 재생성 모드: 기존 표지를 레퍼런스로 추가');
            characterReferences.push(currentStorybook.coverImage);
        }
        
        // 🔥 서버 API 호출 (R2 업로드 포함)
        const response = await axios.post('/api/generate-cover', {
            title: currentStorybook.title,
            artStyle: currentStorybook.artStyle || '디즈니 스타일',
            characterReferences: characterReferences,
            settings: {
                aspectRatio: aspectRatio,  // 사용자가 선택한 비율 사용
                enforceNoText: true,
                coverModel: imageSettings.coverModel || 'gemini-3-pro-image-preview'  // 표지 모델 전달
            },
            customPrompt: customPrompt,
            storybookId: currentStorybook.id
        });
        
        if (response.data.success && response.data.imageUrl) {
            const imageUrl = response.data.imageUrl; // R2 URL
            
            // 히스토리에 추가 (최대 10개 유지)
            if (!currentStorybook.coverImageHistory) {
                currentStorybook.coverImageHistory = [];
            }
            
            console.log('🖼️ 표지 생성 전 상태:', {
                currentCover: currentStorybook.coverImage ? '있음' : '없음',
                historyCount: currentStorybook.coverImageHistory.length
            });
            
            // 현재 표지가 있고, 새 이미지와 다르면 히스토리에 추가
            if (currentStorybook.coverImage && currentStorybook.coverImage !== imageUrl) {
                // 히스토리에 이미 같은 URL이 있는지 확인 (중복 방지)
                if (!currentStorybook.coverImageHistory.includes(currentStorybook.coverImage)) {
                    currentStorybook.coverImageHistory.unshift(currentStorybook.coverImage);
                    console.log('✅ 이전 표지를 히스토리에 추가');
                } else {
                    console.log('⚠️ 이전 표지가 이미 히스토리에 있음 (중복 방지)');
                }
                
                // 10개 초과 시 가장 오래된 이미지 삭제 요청
                if (currentStorybook.coverImageHistory.length > 10) {
                    const oldestImageUrl = currentStorybook.coverImageHistory[10];
                    
                    // 서버에 삭제 요청 (비동기, 실패해도 계속 진행)
                    if (oldestImageUrl && oldestImageUrl.includes('r2.dev')) {
                        axios.delete('/api/cleanup-image', {
                            data: { imageUrl: oldestImageUrl }
                        }).catch(err => {
                            console.warn('⚠️ 히스토리 이미지 삭제 실패:', err.message);
                        });
                    }
                    
                    // 배열에서 제거
                    currentStorybook.coverImageHistory = currentStorybook.coverImageHistory.slice(0, 10);
                    console.log('🗑️ 오래된 히스토리 이미지 정리 완료');
                }
            }
            
            currentStorybook.coverImage = imageUrl;
            currentStorybook.coverPrompt = customPrompt;
            
            console.log('🖼️ 표지 생성 후 상태:', {
                currentCover: currentStorybook.coverImage,
                historyCount: currentStorybook.coverImageHistory.length,
                historyUrls: currentStorybook.coverImageHistory.slice(0, 3)
            });
            
            saveCurrentStorybook();
            
            // UI 업데이트 (표지 이미지만 업데이트하여 섹션 열림 상태 유지)
            updateCoverImageDisplay();
            
            showNotification('success', '표지 생성 완료!', '동화책 표지가 생성되었습니다.');
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
        showNotification('❌ ' + errorMsg, 'error');
    }
}

// 히스토리에서 표지 이미지 선택
function selectCoverImageFromHistory(historyIndex) {
    const selectedImage = currentStorybook.coverImageHistory[historyIndex];
    
    console.log('🔄 히스토리에서 선택:', {
        선택된_인덱스: historyIndex,
        선택된_이미지: selectedImage,
        현재_표지: currentStorybook.coverImage,
        히스토리_개수: currentStorybook.coverImageHistory.length
    });
    
    // 현재 표지와 선택한 이미지가 같으면 아무것도 안 함 (중복 방지)
    if (currentStorybook.coverImage === selectedImage) {
        console.log('⚠️ 이미 같은 이미지입니다. 교환하지 않음.');
        return;
    }
    
    // 현재 표지를 히스토리에 추가
    currentStorybook.coverImageHistory.splice(historyIndex, 1); // 선택된 항목 제거
    currentStorybook.coverImageHistory.unshift(currentStorybook.coverImage); // 현재 표지를 맨 앞에 추가
    
    // 선택한 이미지를 현재 표지로 설정
    currentStorybook.coverImage = selectedImage;
    
    console.log('✅ 표지 교환 완료:', {
        새_표지: currentStorybook.coverImage,
        히스토리_개수: currentStorybook.coverImageHistory.length
    });
    
    saveCurrentStorybook();
    
    // 표지 이미지 부분만 업데이트 (전체 페이지 재렌더링 안 함)
    updateCoverImageDisplay();
    
    showNotification('success', '표지 변경 완료', '이전 버전이 현재 표지로 설정되었습니다.');
}

// 표지 이미지 디스플레이만 업데이트 (섹션 열림 상태 유지)
function updateCoverImageDisplay() {
    const coverDisplay = document.getElementById('cover-image-display');
    if (!coverDisplay || !currentStorybook) {
        console.warn('⚠️ updateCoverImageDisplay: coverDisplay 또는 currentStorybook이 없음', {
            coverDisplay: !!coverDisplay,
            currentStorybook: !!currentStorybook
        });
        return;
    }
    
    console.log('🔄 updateCoverImageDisplay 호출:', {
        coverImage: currentStorybook.coverImage,
        historyCount: (currentStorybook.coverImageHistory || []).length
    });
    
    const history = currentStorybook.coverImageHistory || [];
    
    if (currentStorybook.coverImage) {
        coverDisplay.innerHTML = `
            <div class="flex gap-2 h-full">
                <!-- 메인 이미지 -->
                <div class="flex-1 relative group">
                    <img src="${currentStorybook.coverImage}" alt="표지" class="w-full h-full object-cover rounded-lg"/>
                    <button 
                        onclick="downloadImage('${currentStorybook.coverImage}', '${currentStorybook.title}_표지.png')"
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

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    loadImageSettings();
    await loadStorybooks(); // R2에서 불러올 때까지 대기
    renderBookList();
    
    // 모든 버튼 이벤트 리스너 등록
    const generateBtn = document.getElementById('generateStorybookBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateStorybook);
    }
    
    const showCreateFormBtn = document.getElementById('showCreateFormBtn');
    if (showCreateFormBtn) {
        showCreateFormBtn.addEventListener('click', showCreateForm);
    }
    
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    }
    
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileSidebar);
    }
    
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', openSettings);
    }
    
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }
    
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetSettings);
    }
    
    const executeRegenerateBtn = document.getElementById('executeRegenerateBtn');
    if (executeRegenerateBtn) {
        executeRegenerateBtn.addEventListener('click', executeRegenerate);
    }
    
    const closeRegenerateModalBtn = document.getElementById('closeRegenerateModalBtn');
    if (closeRegenerateModalBtn) {
        closeRegenerateModalBtn.addEventListener('click', closeRegenerateModal);
    }
    
    // 삽화 업로드 모달 이벤트
    const uploadIllustrationBtn = document.getElementById('uploadIllustrationBtn');
    if (uploadIllustrationBtn) {
        uploadIllustrationBtn.addEventListener('click', uploadIllustration);
    }
    
    const closeIllustrationUploadModalBtn = document.getElementById('closeIllustrationUploadModalBtn');
    if (closeIllustrationUploadModalBtn) {
        closeIllustrationUploadModalBtn.addEventListener('click', closeIllustrationUploadModal);
    }
    
    // 모달 배경 클릭 시 닫기
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                closeSettings();
            }
        });
    }
    
    const regenerateModal = document.getElementById('regenerateModal');
    if (regenerateModal) {
        regenerateModal.addEventListener('click', (event) => {
            if (event.target === regenerateModal) {
                closeRegenerateModal();
            }
        });
    }
    
    const illustrationUploadModal = document.getElementById('illustrationUploadModal');
    if (illustrationUploadModal) {
        illustrationUploadModal.addEventListener('click', (event) => {
            if (event.target === illustrationUploadModal) {
                closeIllustrationUploadModal();
            }
        });
    }
});

// 모바일 사이드바 토글 함수
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
}

// 섹션 토글 함수
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const icon = document.getElementById(sectionId + '-icon');
    
    // 요소가 없으면 무시
    if (!content || !icon) {
        console.warn(`Section ${sectionId} not found`);
        return;
    }
    
    if (content.classList.contains('hidden')) {
        // 섹션 열기
        content.classList.remove('hidden');
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
    } else {
        // 섹션 닫기
        content.classList.add('hidden');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
    }
}

// 페이지별 참조 섹션 토글
function togglePageSection(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const icon = document.getElementById(sectionId + '-icon');
    
    // 요소가 없으면 무시
    if (!content || !icon) {
        console.warn(`Page section ${sectionId} not found`);
        return;
    }
    
    if (content.classList.contains('hidden')) {
        // 섹션 열기
        content.classList.remove('hidden');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        // 섹션 닫기
        content.classList.add('hidden');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// 이미지 설정 관련 함수
function loadImageSettings() {
    const saved = localStorage.getItem('imageSettings');
    if (saved) {
        imageSettings = JSON.parse(saved);
        
        // 유효하지 않은 모델 설정 자동 수정
        const validModels = IMAGE_MODELS.map(m => m.value);
        const invalidModels = ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp', 'gemini-2.5-flash', 'gemini-2.5-pro'];
        
        // 각 모델 설정 검증 및 수정
        ['coverModel', 'characterModel', 'keyObjectModel', 'illustrationModel', 'vocabularyModel'].forEach(key => {
            if (imageSettings[key] && (invalidModels.includes(imageSettings[key]) || !validModels.includes(imageSettings[key]))) {
                console.warn(`⚠️ 유효하지 않은 ${key} 감지: ${imageSettings[key]} → gemini-3-pro-image-preview로 자동 수정`);
                imageSettings[key] = 'gemini-3-pro-image-preview';
            }
        });
        
        // 수정된 설정 저장
        saveImageSettings();
    }
}

function saveImageSettings() {
    localStorage.setItem('imageSettings', JSON.stringify(imageSettings));
}

function openSettings() {
    document.getElementById('imageAspectRatio').value = imageSettings.aspectRatio;
    document.getElementById('enforceNoText').checked = imageSettings.enforceNoText;
    document.getElementById('enforceCharacterConsistency').checked = imageSettings.enforceCharacterConsistency;
    document.getElementById('additionalPrompt').value = imageSettings.additionalPrompt;
    document.getElementById('imageQuality').value = imageSettings.imageQuality;
    
    // 각 섹션별 모델 선택값 복원 (요소가 있을 때만)
    const characterModelSelect = document.getElementById('characterModelSelect');
    if (characterModelSelect) {
        characterModelSelect.value = imageSettings.characterModel || 'gemini-3-pro-image-preview';
    }
    
    const keyObjectModelSelect = document.getElementById('keyObjectModelSelect');
    if (keyObjectModelSelect) {
        keyObjectModelSelect.value = imageSettings.keyObjectModel || 'gemini-3-pro-image-preview';
    }
    
    const illustrationModelSelect = document.getElementById('illustrationModelSelect');
    if (illustrationModelSelect) {
        illustrationModelSelect.value = imageSettings.illustrationModel || 'gemini-3-pro-image-preview';
    }
    
    const vocabularyModelSelect = document.getElementById('vocabularyModelSelect');
    if (vocabularyModelSelect) {
        vocabularyModelSelect.value = imageSettings.vocabularyModel || 'gemini-3-pro-image-preview';
    }
    
    // TTS 모델 선택값 복원
    const ttsModelSelect = document.getElementById('ttsModelSelect');
    if (ttsModelSelect) {
        ttsModelSelect.value = imageSettings.ttsModel || 'Puck';
        updateTTSModelDescription(ttsModelSelect.value);
    }
    
    // API 키 로드 (localStorage에서)
    const savedApiKey = localStorage.getItem('gemini_api_key') || '';
    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    if (geminiApiKeyInput) {
        geminiApiKeyInput.value = savedApiKey;
    }
    
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings(event) {
    if (!event || event.target.id === 'settingsModal') {
        document.getElementById('settingsModal').classList.add('hidden');
    }
}

function saveSettings() {
    // 기본 이미지 설정 저장 (null 체크)
    const aspectRatioEl = document.getElementById('imageAspectRatio');
    const enforceNoTextEl = document.getElementById('enforceNoText');
    const enforceCharacterEl = document.getElementById('enforceCharacterConsistency');
    const additionalPromptEl = document.getElementById('additionalPrompt');
    const imageQualityEl = document.getElementById('imageQuality');
    
    if (aspectRatioEl) imageSettings.aspectRatio = aspectRatioEl.value;
    if (enforceNoTextEl) imageSettings.enforceNoText = enforceNoTextEl.checked;
    if (enforceCharacterEl) imageSettings.enforceCharacterConsistency = enforceCharacterEl.checked;
    if (additionalPromptEl) imageSettings.additionalPrompt = additionalPromptEl.value;
    if (imageQualityEl) imageSettings.imageQuality = imageQualityEl.value;
    
    // 각 섹션별 모델 설정 저장 (null 체크)
    const characterModelEl = document.getElementById('characterModelSelect');
    const keyObjectModelEl = document.getElementById('keyObjectModelSelect');
    const illustrationModelEl = document.getElementById('illustrationModelSelect');
    const vocabularyModelEl = document.getElementById('vocabularyModelSelect');
    
    if (characterModelEl) imageSettings.characterModel = characterModelEl.value;
    if (keyObjectModelEl) imageSettings.keyObjectModel = keyObjectModelEl.value;
    if (illustrationModelEl) imageSettings.illustrationModel = illustrationModelEl.value;
    if (vocabularyModelEl) imageSettings.vocabularyModel = vocabularyModelEl.value;
    
    // TTS 모델 설정 저장
    const ttsModelSelect = document.getElementById('ttsModelSelect');
    if (ttsModelSelect) {
        imageSettings.ttsModel = ttsModelSelect.value;
    }
    
    console.log('💾 이미지 설정 저장:', imageSettings);
    
    // API 키 저장 (localStorage에, null 체크)
    const geminiApiKeyEl = document.getElementById('geminiApiKey');
    const apiKey = geminiApiKeyEl ? geminiApiKeyEl.value.trim() : '';
    if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
        // gemini-client.js의 GEMINI_API_KEY 업데이트
        if (typeof GEMINI_API_KEY !== 'undefined') {
            GEMINI_API_KEY = apiKey;
            console.log('✅ 커스텀 Gemini API 키 적용됨');
        }
    } else {
        localStorage.removeItem('gemini_api_key');
        // 기본 키로 복원 (서버에서 다시 가져오기)
        if (typeof initGeminiAPIKey === 'function') {
            initGeminiAPIKey();
            console.log('✅ 기본 Gemini API 키로 복원');
        }
    }
    
    saveImageSettings();
    closeSettings();
    showNotification('success', '설정 저장 완료', '설정이 성공적으로 저장되었습니다.');
}

function resetSettings() {
    if (confirm('모든 설정을 기본값으로 복원하시겠습니까?\n\n⚠️ 주의: API 키도 기본값으로 복원됩니다.')) {
        imageSettings = {
            aspectRatio: '16:9',
            enforceNoText: true,
            enforceCharacterConsistency: true,
            additionalPrompt: '',
            imageQuality: 'high',
            imageModel: 'gemini-3-pro-image-preview'  // Nano Banana Pro
        };
        
        // API 키 초기화
        localStorage.removeItem('gemini_api_key');
        document.getElementById('geminiApiKey').value = '';
        
        // 기본 키로 복원
        if (typeof initGeminiAPIKey === 'function') {
            initGeminiAPIKey();
        }
        
        saveImageSettings();
        openSettings();
        showNotification('success', '설정 복원 완료', '모든 설정이 기본값으로 복원되었습니다.');
    }
}

// 스토리북 관리
async function loadStorybooks() {
    console.log('🔧 loadStorybooks() 시작');
    
    // 로딩 인디케이터 표시
    const loadingEl = document.getElementById('bookListLoading');
    const bookListEl = document.getElementById('bookList');
    if (loadingEl) {
        loadingEl.classList.remove('hidden');
    }
    
    // ❌ localStorage 로딩 비활성화 - R2만 사용
    console.log('ℹ️ localStorage 로딩 비활성화됨. R2만 사용합니다.');
    storybooks = []; // 빈 배열로 시작
    
    // R2에서 최신 목록 가져오기
    try {
        console.log('📚 R2 API 호출 시작: GET /api/storybooks');
        const startTime = Date.now();
        const response = await axios.get('/api/storybooks');
        console.log('📡 R2 API 응답:', response.data, `(${Date.now() - startTime}ms)`);
        
        if (response.data.success && response.data.storybooks) {
            const r2Books = response.data.storybooks;
            console.log(`✅ R2에서 ${r2Books.length}권의 동화책을 찾았습니다`);
            console.log('📋 R2 동화책 목록:', r2Books.map(b => `${b.title} (ID: ${b.id})`).join(', '));
            
            // 🚀 병렬로 모든 동화책 상세 정보 로드 (훨씬 빠름!)
            console.log('⚡ 모든 동화책을 병렬로 로드 시작...');
            const detailStartTime = Date.now();
            
            const detailPromises = r2Books.map(meta => 
                axios.get(`/api/storybooks/${meta.id}`)
                    .then(response => {
                        console.log(`✅ ${meta.title} 로드 성공`);
                        return response.data;
                    })
                    .catch(error => {
                        console.error(`❌ 동화책 ${meta.id} 로드 실패:`, error);
                        return null;
                    })
            );
            
            const fullBooks = (await Promise.all(detailPromises)).filter(book => book !== null);
            
            const detailElapsed = Date.now() - detailStartTime;
            console.log(`📚 총 ${fullBooks.length}권의 동화책 로드 완료 (${detailElapsed}ms, 평균 ${Math.round(detailElapsed / fullBooks.length)}ms/권)`);
            
            // R2 데이터를 storybooks에 설정
            storybooks = fullBooks;
            
            // 화면 업데이트
            console.log('🎨 화면 업데이트 중...');
            renderBookList();
            console.log('✅ 화면 업데이트 완료');
        } else {
            console.warn('⚠️ R2 응답 형식 오류:', response.data);
        }
    } catch (error) {
        console.error('❌ R2 동화책 로드 실패:', error);
        console.error('상세 에러:', error.response ? error.response.data : error.message);
    } finally {
        // 로딩 인디케이터 숨기기
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }
    }
    
    const totalElapsed = Date.now();
    console.log('🏁 loadStorybooks() 완료. 총 동화책:', storybooks.length, '권');
}

function saveStorybooks() {
    // ❌ localStorage 완전 비활성화
    // R2만 사용하므로 localStorage 저장 불필요
    console.log('ℹ️ localStorage 저장 비활성화됨 (R2만 사용)');
}

function renderBookList() {
    console.log('📋 renderBookList 호출 - 동화책 개수:', storybooks.length);
    
    // 필터 적용 (검색 및 카테고리 필터 포함)
    applyBookFilters();
}

function selectStorybook(id) {
    currentStorybook = storybooks.find(b => b.id === id);
    if (currentStorybook) {
        displayStorybook(currentStorybook);
        renderBookList();
        document.getElementById('createForm').style.display = 'none';
        // 모바일에서 사이드바 자동 닫기
        closeMobileSidebar();
    }
}

async function deleteStorybook(id) {
    // 동화책 정보 가져오기
    const storybook = storybooks.find(b => b.id === id);
    const title = storybook ? storybook.title : '이 동화책';
    
    console.log(`🗑️ 삭제 요청: ID ${id}, 제목: ${title}`);
    
    // 명확한 확인 메시지
    const confirmMessage = `⚠️ 정말로 삭제하시겠습니까?\n\n동화책: "${title}"\n\n이 작업은 되돌릴 수 없습니다.\n- 모든 페이지\n- 캐릭터 레퍼런스\n- 표지 이미지\n- 생성된 모든 콘텐츠\n\n위 내용이 영구적으로 삭제됩니다.`;
    
    if (confirm(confirmMessage)) {
        console.log(`✅ 사용자 확인: 삭제 진행`);
        try {
            // R2에서 삭제
            console.log(`🗑️ R2에서 삭제 시작: ID ${id}`);
            console.log(`📡 API 호출: DELETE /api/storybooks/${id}`);
            
            const response = await axios.delete(`/api/storybooks/${id}`);
            
            console.log(`📡 서버 응답:`, response.data);
            
            if (response.data.success) {
                console.log(`✅ R2 삭제 완료`);
                
                // localStorage에서도 삭제
                const beforeCount = storybooks.length;
                storybooks = storybooks.filter(b => b.id !== id);
                const afterCount = storybooks.length;
                
                console.log(`📊 동화책 목록 업데이트: ${beforeCount}권 → ${afterCount}권`);
                
                saveStorybooks();
                renderBookList();
                
                if (currentStorybook && currentStorybook.id === id) {
                    currentStorybook = null;
                    document.getElementById('storybookResult').classList.add('hidden');
                    document.getElementById('createForm').style.display = 'block';
                }
                
                showNotification('success', `"${title}"이(가) 삭제되었습니다.`);
            } else {
                throw new Error(response.data.error || '삭제 실패');
            }
        } catch (error) {
            console.error('❌ 삭제 오류:', error);
            console.error('에러 상세:', error.response ? error.response.data : error.message);
            showNotification('error', '동화책 삭제에 실패했습니다.');
        }
    } else {
        console.log(`❌ 사용자 취소: 삭제 취소됨`);
    }
}

// 동화책 제목 업데이트 (사이드바)
async function updateBookTitleInList(id, newTitle) {
    if (!newTitle.trim()) {
        showNotification('warning', '제목을 입력해주세요.');
        renderBookList();
        return;
    }
    
    const book = storybooks.find(b => b.id === id);
    if (!book) return;
    
    const oldTitle = book.title;
    book.title = newTitle.trim();
    
    // 현재 열려있는 동화책이면 업데이트
    if (currentStorybook && currentStorybook.id === id) {
        currentStorybook.title = newTitle.trim();
        displayStorybook(currentStorybook);
    }
    
    saveStorybooks();
    
    // R2에도 업데이트
    try {
        console.log(`💾 R2에 제목 변경 저장: "${oldTitle}" → "${newTitle.trim()}"`);
        await saveToR2(book);
        console.log(`✅ R2 저장 완료`);
    } catch (error) {
        console.error('❌ R2 저장 오류:', error);
    }
    
    console.log(`✅ 제목 변경: "${oldTitle}" → "${newTitle.trim()}"`);
    showNotification('success', '제목이 저장되었습니다!');
}

// 드래그 앤 드롭 관련 변수
let draggedElement = null;
let draggedIndex = null;

// 드래그 시작
function handleDragStart(e) {
    draggedElement = e.currentTarget;
    draggedIndex = parseInt(e.currentTarget.dataset.bookIndex);
    e.currentTarget.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    
    console.log('🖐️ 드래그 시작:', draggedIndex);
}

// 드래그 오버
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

// 드래그 진입
function handleDragEnter(e) {
    if (e.currentTarget !== draggedElement) {
        e.currentTarget.classList.add('border-purple-500', 'bg-purple-50');
    }
}

// 드래그 떠남
function handleDragLeave(e) {
    e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50');
}

// 드롭
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();
    
    if (draggedElement !== e.currentTarget) {
        const targetIndex = parseInt(e.currentTarget.dataset.bookIndex);
        
        // undefined/null 항목 제거
        storybooks = storybooks.filter(b => b && b.id);
        
        // 배열에서 순서 변경
        const draggedBook = storybooks[draggedIndex];
        if (draggedBook && draggedBook.id) {
            storybooks.splice(draggedIndex, 1);
            storybooks.splice(targetIndex, 0, draggedBook);
            
            console.log(`✅ 순서 변경: ${draggedIndex} → ${targetIndex}`);
            
            saveStorybooks();
            renderBookList();
            
            showNotification('success', '순서가 변경되었습니다!');
        }
    }
    
    e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50');
    return false;
}

// 드래그 종료
function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    // 모든 요소의 하이라이트 제거
    document.querySelectorAll('.book-item').forEach(item => {
        item.classList.remove('border-purple-500', 'bg-purple-50');
    });
    
    draggedElement = null;
    draggedIndex = null;
}

// 동화책 제목 업데이트 (메인 페이지)
function updateStorybookTitle(newTitle) {
    if (!currentStorybook || !newTitle.trim()) {
        alert('제목을 입력해주세요.');
        return;
    }
    
    const oldTitle = currentStorybook.title;
    currentStorybook.title = newTitle.trim();
    
    // storybooks 배열에서도 업데이트
    const index = storybooks.findIndex(b => b.id === currentStorybook.id);
    if (index !== -1) {
        storybooks[index].title = newTitle.trim();
    }
    
    saveStorybooks();
    renderBookList();
    
    console.log(`✅ 제목 변경: "${oldTitle}" → "${newTitle.trim()}"`);
    
    // 제목 업데이트 알림
    showNotification('success', '제목이 저장되었습니다!');
}

// 뷰어 공개 상태 변경
async function togglePublicStatus(storybookId) {
    const checkbox = document.getElementById(`public-${storybookId}`);
    const isPublic = checkbox.checked;
    
    try {
        console.log(`🔄 Toggling public status for ${storybookId}: ${isPublic}`);
        
        const response = await axios.put(
            `/api/storybooks/${storybookId}/public`,
            { isPublic: isPublic },
            {
                headers: {
                    'X-API-Key': getAPIKey()
                }
            }
        );
        
        if (response.data.success) {
            // storybooks 배열에서도 업데이트
            const storybook = storybooks.find(b => b.id === storybookId);
            if (storybook) {
                storybook.isPublic = isPublic;
                storybook.publishedAt = response.data.publishedAt;
            }
            
            // currentStorybook도 업데이트
            if (currentStorybook && currentStorybook.id === storybookId) {
                currentStorybook.isPublic = isPublic;
                currentStorybook.publishedAt = response.data.publishedAt;
            }
            
            // 목록 다시 렌더링
            renderBookList();
            
            // 알림 표시
            showNotification(
                'success',
                isPublic 
                    ? '✅ 동화책이 뷰어에 공개되었습니다!' 
                    : 'ℹ️ 동화책이 비공개로 전환되었습니다.'
            );
        }
    } catch (error) {
        console.error('❌ 공개 상태 변경 실패:', error);
        
        // 체크박스 원상복구
        checkbox.checked = !isPublic;
        
        showNotification(
            'error',
            '❌ 공개 상태 변경에 실패했습니다: ' + (error.response?.data?.error || error.message)
        );
    }
}

// 동화책 복사 (현재 동화책)
function duplicateStorybook() {
    if (!currentStorybook) {
        alert('복사할 동화책이 없습니다.');
        return;
    }
    duplicateStorybookById(currentStorybook.id);
}

// ID로 동화책 복사 (사이드바에서 호출)
async function duplicateStorybookById(id) {
    const book = storybooks.find(b => b.id === id);
    if (!book) {
        alert('동화책을 찾을 수 없습니다.');
        return;
    }
    
    // 사용자 입력 받기 (동화 이름, 그림 스타일)
    const newTitle = prompt('새로운 동화책 제목을 입력하세요:', `${book.title} (복사본)`);
    if (!newTitle) {
        return; // 취소
    }
    
    const newArtStyle = prompt('새로운 그림 스타일을 입력하세요:', book.artStyle || '디즈니 스타일');
    if (!newArtStyle) {
        return; // 취소
    }
    
    // 깊은 복사
    const duplicate = JSON.parse(JSON.stringify(book));
    
    // 새 ID 생성
    duplicate.id = Date.now().toString();
    
    // 제목과 그림 스타일 업데이트
    duplicate.title = newTitle;
    duplicate.artStyle = newArtStyle;
    
    // 🔥 이미지 제거 (텍스트는 유지)
    
    // 캐릭터 레퍼런스 이미지만 제거
    if (duplicate.characters && Array.isArray(duplicate.characters)) {
        duplicate.characters.forEach(char => {
            char.referenceImage = null;
            char.imageHistory = []; // 히스토리도 초기화
        });
    }
    
    // Key Object 이미지 완전히 제거 (4단계)
    // 1. vocabularyImages 배열 비우기
    duplicate.vocabularyImages = [];
    
    // 2. keyObjectImages 배열 비우기 (화면에 표시되는 이미지)
    duplicate.keyObjectImages = [];
    
    // 3. educational_content.vocabulary 안의 image 필드 제거
    if (duplicate.educational_content && 
        duplicate.educational_content.vocabulary && 
        Array.isArray(duplicate.educational_content.vocabulary)) {
        duplicate.educational_content.vocabulary.forEach(vocab => {
            if (typeof vocab === 'object') {
                delete vocab.image;
                delete vocab.imageUrl; // imageUrl도 제거
            }
        });
    }
    
    // 4. key_objects 배열의 image 필드도 제거 (혹시 있다면)
    if (duplicate.key_objects && Array.isArray(duplicate.key_objects)) {
        duplicate.key_objects.forEach(obj => {
            if (typeof obj === 'object') {
                delete obj.image;
                delete obj.imageUrl;
            }
        });
    }
    
    // 페이지 삽화 이미지와 artStyle 제거 (새 동화책 스타일 적용을 위해)
    if (duplicate.pages && Array.isArray(duplicate.pages)) {
        duplicate.pages.forEach(page => {
            page.illustrationImage = null;
            page.illustrationHistory = [];  // 히스토리도 초기화
            delete page.artStyle; // ⚠️ 페이지별 artStyle 제거 (동화책 전역 스타일 사용)
        });
    }
    
    // 표지 이미지 제거
    duplicate.coverImage = null;
    
    // 동화책 목록에 추가
    storybooks.unshift(duplicate);
    
    // R2에 저장
    try {
        console.log(`💾 R2에 복사본 저장: "${duplicate.title}" (ID: ${duplicate.id})`);
        await saveToR2(duplicate);
        console.log(`✅ R2 저장 완료`);
    } catch (error) {
        console.error('❌ R2 저장 오류:', error);
        showNotification('error', 'DB 저장 실패', '복사본이 DB에 저장되지 않았습니다.');
    }
    
    // localStorage에도 저장
    saveStorybooks();
    
    // 복사본 선택 및 화면 업데이트
    currentStorybook = duplicate;
    renderBookList();
    displayStorybook(duplicate);
    
    // 복사본이 있는 위치로 스크롤
    setTimeout(() => {
        const activeElement = document.querySelector('.book-item.active');
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
    
    console.log(`✅ 동화책 복사 완료: "${duplicate.title}" (ID: ${duplicate.id})`);
    console.log(`   - 새 제목: ${newTitle}`);
    console.log(`   - 새 그림 스타일: ${newArtStyle}`);
    console.log(`   - 이미지 제거됨: 캐릭터, Key Objects, 삽화, 표지`);
    
    // 복사 완료 알림
    showNotification('success', '복사 완료!', `"${duplicate.title}"이 생성되었습니다. 이미지를 새로 생성해주세요.`);
}

// 알림 표시 함수
function showNotification(type, title, message) {
    const colors = {
        success: 'bg-green-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500'
    };
    
    const icons = {
        success: 'fa-check-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type] || colors.info} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in max-w-sm`;
    notification.innerHTML = `
        <div class="flex items-start gap-3">
            <i class="fas ${icons[type] || icons.info} text-xl mt-0.5"></i>
            <div>
                <strong class="block">${title}</strong>
                ${message ? `<span class="text-sm block mt-1">${message}</span>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 모달 표시 함수
function showModal(title, content) {
    // 기존 모달 제거
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 모달 생성
    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                <h2 class="text-2xl font-bold text-gray-800">${title}</h2>
                <button 
                    onclick="document.getElementById('custom-modal').remove()"
                    class="text-gray-400 hover:text-gray-600 transition"
                >
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="px-6 py-6">
                ${content}
            </div>
            <div class="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end rounded-b-2xl border-t border-gray-200">
                <button 
                    onclick="document.getElementById('custom-modal').remove()"
                    class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                    닫기
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 배경 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 그림체 선택 변경 핸들러
function handleArtStyleChange() {
    const select = document.getElementById('artStyleSelect');
    const customInput = document.getElementById('artStyleCustom');
    
    if (select.value === 'custom') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
    }
}

function showCreateForm() {
    document.getElementById('createForm').style.display = 'block';
    document.getElementById('storybookResult').classList.add('hidden');
    currentStorybook = null;
    renderBookList();
    // 모바일에서 사이드바 자동 닫기
    closeMobileSidebar();
}

// 동화책 생성
async function generateStorybook() {
    const title = document.getElementById('bookTitle').value.trim();
    const targetAge = document.getElementById('targetAge').value;
    const totalPages = parseInt(document.getElementById('totalPages').value) || 0; // 0 = AI 자동 결정
    const geminiModel = document.getElementById('geminiModel').value; // AI 모델 선택
    const artStyleSelect = document.getElementById('artStyleSelect').value;
    const artStyleCustom = document.getElementById('artStyleCustom').value.trim();
    const referenceContent = document.getElementById('referenceContent').value.trim();
    
    // 언어는 무조건 한국어만 (UI에서 제거됨)
    const selectedLanguages = ['ko'];
    
    // 이미지 AI 모델은 기본값 사용 (UI에서 제거됨)
    // imageSettings.imageModel은 기존 값 유지
    
    // 그림체 결정: custom이면 직접 입력값 사용, 아니면 선택값 사용
    const artStyle = artStyleSelect === 'custom' ? artStyleCustom : artStyleSelect;

    if (!title) {
        alert('동화책 제목을 입력해주세요.');
        return;
    }
    
    if (artStyleSelect === 'custom' && !artStyleCustom) {
        alert('그림체를 입력해주세요.');
        return;
    }
    
    // 페이지 수 검증 (0은 자동, 1-30은 사용자 지정)
    if (totalPages < 0 || totalPages > 30) {
        alert('페이지 수는 0(자동) 또는 1-30 사이여야 합니다.');
        return;
    }

    document.getElementById('createForm').style.display = 'none';
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('storybookResult').classList.add('hidden');

    try {
        const response = await axios.post('/api/generate-storybook', {
            title,
            targetAge,
            totalPages,
            geminiModel, // AI 모델 전달
            artStyle,
            languages: selectedLanguages, // 선택된 언어 전달
            referenceContent: referenceContent || null
        });

        if (response.data.success) {
            // 동화책 데이터 준비
            const tempStorybook = response.data.storybook;
            tempStorybook.languages = selectedLanguages;
            
            console.log('✅ 동화책 생성 성공:', tempStorybook.title);
            console.log('📝 선택된 언어:', selectedLanguages);
            
            // 생성 폼 숨기기
            document.getElementById('createForm').style.display = 'none';
            
            // Review 모달 열기
            openReviewModal(tempStorybook);
        } else {
            alert(response.data.error || '동화책 생성에 실패했습니다.');
            document.getElementById('createForm').style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = '동화책 생성 중 오류가 발생했습니다.';
        
        if (error.response && error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        alert(errorMessage + '\n\n잠시 후 다시 시도해주세요.');
        document.getElementById('createForm').style.display = 'block';
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

// 사용 가능한 언어 목록 가져오기
function getAvailableLanguages() {
    if (!currentStorybook) return ['ko'];
    
    const langs = new Set(['ko']); // 한국어는 기본
    
    // languages 배열에서 가져오기
    if (currentStorybook.languages && Array.isArray(currentStorybook.languages)) {
        currentStorybook.languages.forEach(lang => langs.add(lang));
    }
    
    // translations 객체에서 가져오기
    if (currentStorybook.translations && typeof currentStorybook.translations === 'object') {
        Object.keys(currentStorybook.translations).forEach(lang => langs.add(lang));
    }
    
    return Array.from(langs);
}

// 언어 추가 드롭다운 토글
function toggleAddLanguageDropdown() {
    const dropdown = document.getElementById('add-language-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// 탭에서 언어 추가
async function addLanguageFromTab(targetLang) {
    // 드롭다운 닫기
    const dropdown = document.getElementById('add-language-dropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
    
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    // 이미 번역된 언어인지 확인
    const available = getAvailableLanguages();
    if (available.includes(targetLang)) {
        alert('이미 해당 언어로 번역되어 있습니다.');
        return;
    }
    
    const langNames = {
        en: 'English',
        zh: '中文',
        ja: '日本語',
        es: 'Español',
        fr: 'Français'
    };
    
    const langName = langNames[targetLang] || targetLang;
    
    if (!confirm(`${langName} 언어를 추가하시겠습니까?\n\n빈 페이지가 생성되고, 각 페이지별로 개별 번역할 수 있습니다.`)) {
        return;
    }
    
    // 1. 즉시 빈 페이지 생성
    if (!currentStorybook.translations) {
        currentStorybook.translations = {};
    }
    
    // 빈 텍스트로 페이지 초기화
    currentStorybook.translations[targetLang] = currentStorybook.pages.map(page => ({
        pageNumber: page.pageNumber,
        text: ''  // 빈 텍스트
    }));
    
    // languages 배열 업데이트
    if (!currentStorybook.languages) {
        currentStorybook.languages = ['ko'];
    }
    if (!currentStorybook.languages.includes(targetLang)) {
        currentStorybook.languages.push(targetLang);
    }
    
    // 저장
    saveCurrentStorybook();
    
    // 새 언어로 전환
    currentLanguage = targetLang;
    
    // UI 업데이트
    displayStorybook(currentStorybook);
    
    alert(`✅ ${langName} 언어가 추가되었습니다!\n\n각 페이지의 [번역] 버튼을 눌러 개별 번역하세요.`);
}

// 언어 추가 및 번역
async function addLanguageTranslation() {
    const selectEl = document.getElementById('add-language-select');
    const targetLang = selectEl.value;
    
    if (!targetLang) {
        alert('번역할 언어를 선택해주세요.');
        return;
    }
    
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    // 이미 번역된 언어인지 확인
    const available = getAvailableLanguages();
    if (available.includes(targetLang)) {
        alert('이미 해당 언어로 번역되어 있습니다.');
        return;
    }
    
    const langNames = {
        en: 'English',
        zh: '中文',
        ja: '日本語',
        es: 'Español',
        fr: 'Français'
    };
    
    const langName = langNames[targetLang] || targetLang;
    const estimatedTime = Math.ceil(currentStorybook.pages.length * 2);
    
    if (!confirm(`${langName}로 번역하시겠습니까?\n\n예상 소요 시간: 약 ${estimatedTime}초\n${currentStorybook.pages.length}개 페이지의 텍스트가 번역됩니다.`)) {
        return;
    }
    
    try {
        // 로딩 표시
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>번역 중...';
        button.disabled = true;
        
        console.log(`🌐 Starting translation to ${targetLang}...`);
        
        const response = await axios.post('/api/translate-storybook', {
            storybook: currentStorybook,
            targetLanguage: targetLang
        });
        
        if (response.data.success) {
            // translations 객체 업데이트
            if (!currentStorybook.translations) {
                currentStorybook.translations = {};
            }
            
            // 번역된 페이지 저장
            currentStorybook.translations[targetLang] = response.data.translatedPages.map((translatedText, idx) => ({
                pageNumber: currentStorybook.pages[idx].pageNumber,
                text: translatedText
            }));
            
            // languages 배열 업데이트
            if (!currentStorybook.languages) {
                currentStorybook.languages = ['ko'];
            }
            if (!currentStorybook.languages.includes(targetLang)) {
                currentStorybook.languages.push(targetLang);
            }
            
            // 저장
            saveCurrentStorybook();
            
            // UI 업데이트
            displayStorybook(currentStorybook);
            
            // 새로 추가된 언어로 전환
            currentLanguage = targetLang;
            displayStorybook(currentStorybook);
            
            showNotification('success', '번역 완료!', `${langName} 번역이 완료되었습니다.`);
            
            console.log(`✅ Translation to ${targetLang} completed`);
        } else {
            throw new Error(response.data.error || '번역 실패');
        }
    } catch (error) {
        console.error('❌ Translation error:', error);
        alert('번역 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
    }
}

function displayStorybook(storybook) {
    console.log('📺 displayStorybook 호출:', {
        title: storybook.title,
        coverImage: storybook.coverImage,
        historyCount: (storybook.coverImageHistory || []).length
    });
    
    const resultDiv = document.getElementById('storybookResult');
    
    let html = `
        <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-10 mb-8">
            <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-0 mb-4">
                <div class="flex-1">
                    <h2 class="text-2xl md:text-4xl font-bold text-purple-600 mb-2">${storybook.title}</h2>
                    <p class="text-sm md:text-base text-gray-600">
                        <i class="fas fa-child mr-1 md:mr-2"></i>${storybook.targetAge}세 
                        <i class="fas fa-palette ml-2 md:ml-4 mr-1 md:mr-2"></i><span class="hidden sm:inline">${storybook.artStyle}</span>
                        <i class="fas fa-file-alt ml-2 md:ml-4 mr-1 md:mr-2"></i>${storybook.pages.length}페이지
                    </p>
                    <!-- 카테고리 선택 -->
                    <div class="mt-3">
                        <label class="inline-block text-sm font-semibold text-gray-700 mr-2">
                            <i class="fas fa-tag mr-1"></i>카테고리:
                        </label>
                        <select 
                            onchange="updateStorybookCategory(this.value)"
                            class="inline-block px-3 py-1 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-800 text-sm"
                        >
                            <option value="" ${!storybook.category ? 'selected' : ''}>미지정</option>
                            <option value="세계 명작" ${storybook.category === '세계 명작' ? 'selected' : ''}>📚 세계 명작</option>
                            <option value="전래 동화" ${storybook.category === '전래 동화' ? 'selected' : ''}>🏮 전래 동화</option>
                            <option value="자연 관찰" ${storybook.category === '자연 관찰' ? 'selected' : ''}>🌿 자연 관찰</option>
                            <option value="기타" ${storybook.category === '기타' ? 'selected' : ''}>📖 기타</option>
                        </select>
                    </div>
                    <p class="text-xs text-gray-400 mt-2">
                        <i class="fas fa-info-circle mr-1"></i>
                        좌측 사이드바에서 제목 수정, 복사, 순서 변경이 가능합니다
                    </p>
                </div>
                <div class="flex gap-2">
                    <button 
                        onclick="openPreview()"
                        class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 md:px-5 py-2 md:py-3 rounded-lg font-bold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg text-sm md:text-base whitespace-nowrap"
                    >
                        <i class="fas fa-book-open mr-1 md:mr-2"></i><span class="hidden sm:inline">미리보기</span><span class="sm:hidden">보기</span>
                    </button>
                    <button 
                        onclick="openRegenerateModal()"
                        class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 md:px-5 py-2 md:py-3 rounded-lg font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg text-sm md:text-base whitespace-nowrap"
                    >
                        <i class="fas fa-redo mr-1 md:mr-2"></i><span class="hidden sm:inline">다시 만들기</span><span class="sm:hidden">재생성</span>
                    </button>
                </div>
            </div>
            <div class="bg-purple-50 p-4 md:p-6 rounded-lg mt-4 md:mt-6">
                <h3 class="text-lg md:text-xl font-bold text-purple-600 mb-2">
                    <i class="fas fa-lightbulb mr-2"></i>주제 및 교훈
                </h3>
                <p class="text-sm md:text-base text-gray-700">${storybook.theme}</p>
            </div>
        </div>

        <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-10 mb-8">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 mb-4 md:mb-6">
                <div class="flex-1">
                    <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2 cursor-pointer flex items-center" onclick="toggleSection('character-section')">
                        <i id="character-section-icon" class="fas fa-chevron-down mr-2 text-sm transition-transform"></i>
                        <i class="fas fa-users mr-2 text-purple-500"></i>
                        캐릭터 레퍼런스
                    </h3>
                    <p class="text-xs md:text-base text-gray-600">
                        <i class="fas fa-info-circle mr-2"></i>
                        <span class="hidden sm:inline">각 캐릭터의 레퍼런스 이미지를 생성하면 삽화에서 일관된 모습을 유지할 수 있어요.</span>
                        <span class="sm:hidden">레퍼런스 이미지로 일관성 유지</span>
                    </p>
                    ${createModelSelect('character', imageSettings.characterModel || 'gemini-3-pro-image-preview', 'updateCharacterModel(this.value)')}
                </div>
                <div class="flex gap-2 md:gap-3">
                    <button 
                        onclick="generateAllCharacterReferences()"
                        class="bg-purple-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-purple-700 transition whitespace-nowrap text-sm md:text-base"
                    >
                        <i class="fas fa-images mr-1 md:mr-2"></i><span class="hidden sm:inline">모든 레퍼런스 생성</span><span class="sm:hidden">전체 생성</span>
                    </button>
                    <button 
                        onclick="downloadAllCharacterReferences()"
                        class="bg-blue-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-700 transition whitespace-nowrap text-sm md:text-base"
                    >
                        <i class="fas fa-download mr-1 md:mr-2"></i><span class="hidden sm:inline">모두 다운로드</span><span class="sm:hidden">다운</span>
                    </button>
                    <button 
                        onclick="addNewCharacter()"
                        class="bg-green-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-green-700 transition whitespace-nowrap text-sm md:text-base"
                    >
                        <i class="fas fa-plus mr-1 md:mr-2"></i><span class="hidden sm:inline">캐릭터 추가</span><span class="sm:hidden">추가</span>
                    </button>
                </div>
            </div>
            <div id="character-section-content" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                ${storybook.characters.map((char, idx) => `
                    <div class="character-card card rounded-xl p-4 md:p-6">
                        <div class="flex justify-between items-start mb-3 md:mb-4">
                            <div class="flex-1">
                                <input 
                                    type="text" 
                                    id="char-name-${idx}" 
                                    value="${char.name}"
                                    onchange="updateCharacterName(${idx}, this.value)"
                                    class="text-lg md:text-2xl font-bold mb-2 bg-transparent border-b-2 border-white text-white placeholder-white w-full"
                                />
                                <div class="flex gap-2 items-center mb-2">
                                    <span class="bg-white text-purple-600 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-semibold">
                                        ${char.role}
                                    </span>
                                    ${char.age ? `<span class="bg-white bg-opacity-20 text-white px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-semibold">
                                        <i class="fas fa-birthday-cake mr-1"></i>${char.age}
                                    </span>` : ''}
                                    <div class="flex items-center gap-1 bg-white bg-opacity-20 px-2 py-1 rounded">
                                        <i class="fas fa-ruler-vertical text-white text-xs"></i>
                                        <input 
                                            type="number" 
                                            id="char-height-${idx}" 
                                            value="${char.height || 150}"
                                            onchange="updateCharacterHeight(${idx}, this.value)"
                                            class="w-12 bg-transparent text-white text-xs font-semibold text-center border-b border-white focus:outline-none"
                                            min="50"
                                            max="250"
                                        />
                                        <span class="text-white text-xs">cm</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onclick="deleteCharacter(${idx})"
                                class="text-white hover:text-red-300 ml-2"
                            >
                                <i class="fas fa-trash text-sm md:text-base"></i>
                            </button>
                        </div>
                        <p class="text-white text-xs md:text-sm mb-3 md:mb-4 opacity-90">${char.description.substring(0, 80)}...</p>
                        <div id="char-ref-${idx}" class="mb-3 md:mb-4 min-h-[150px] md:min-h-[200px] bg-white bg-opacity-20 rounded-lg overflow-hidden">
                            ${char.referenceImage ? 
                                (() => {
                                    const history = char.imageHistory || [];
                                    return `
                                        <div class="flex gap-2 h-full">
                                            <!-- 메인 이미지 -->
                                            <div class="flex-1 relative group">
                                                <img 
                                                    src="${char.referenceImage}" 
                                                    alt="${char.name}" 
                                                    class="w-full h-full object-cover rounded-lg cursor-pointer"
                                                    onclick="toggleImageDeleteButton('char-${idx}')"
                                                />
                                                <button 
                                                    id="char-${idx}-delete-btn"
                                                    onclick="event.stopPropagation(); deleteCharacterImage(${idx})"
                                                    class="hidden absolute top-2 right-2 bg-red-500 bg-opacity-90 text-white w-8 h-8 rounded-full hover:bg-opacity-100 transition shadow-lg flex items-center justify-center z-10"
                                                    title="이미지 삭제"
                                                >
                                                    <i class="fas fa-times"></i>
                                                </button>
                                                <button 
                                                    onclick="downloadImage('${char.referenceImage}', '캐릭터_${char.name}.png')"
                                                    class="absolute bottom-2 right-2 bg-white bg-opacity-90 text-purple-600 w-10 h-10 rounded-full hover:bg-opacity-100 transition shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                                                    title="다운로드"
                                                >
                                                    <i class="fas fa-download"></i>
                                                </button>
                                            </div>
                                            ${history.length > 0 ? `
                                                <!-- 히스토리 -->
                                                <div class="w-20 overflow-y-auto space-y-2 p-1" style="scrollbar-width: thin; scrollbar-color: rgba(168, 85, 247, 0.5) rgba(168, 85, 247, 0.1);">
                                                    ${history.map((url, histIdx) => `
                                                        <div class="relative group cursor-pointer border-2 border-transparent hover:border-purple-400 rounded transition" onclick="selectCharacterImageFromHistory(${idx}, ${histIdx})" title="이전 버전 ${histIdx + 1}">
                                                            <img src="${url}" alt="이전 ${histIdx + 1}" class="w-full h-16 object-cover rounded"/>
                                                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                                                                <i class="fas fa-check text-white text-xs opacity-0 group-hover:opacity-100 transition"></i>
                                                            </div>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                })() :
                                '<div class="flex items-center justify-center h-full"><p class="text-white text-xs md:text-sm text-center p-4">이미지 생성 대기중</p></div>'
                            }
                        </div>
                        <textarea 
                            id="char-prompt-${idx}" 
                            class="w-full p-2 border border-white rounded-lg text-sm mb-2 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70"
                            rows="2"
                            placeholder="프롬프트를 수정하세요"
                        >${char.description}</textarea>
                        <div class="flex gap-2 mb-2">
                            <button 
                                onclick="generateCharacterReference(${idx})"
                                class="flex-1 bg-white text-purple-600 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
                            >
                                <i class="fas fa-image mr-2"></i>생성
                            </button>
                            <button 
                                onclick="openCharacterUploadModal(${idx})"
                                class="flex-1 bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition"
                            >
                                <i class="fas fa-upload mr-2"></i>업로드
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- 표지 생성 섹션 -->
        <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-10 mb-8">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 mb-4 md:mb-6">
                <div class="flex-1">
                    <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2 cursor-pointer flex items-center" onclick="toggleSection('cover-section')">
                        <i id="cover-section-icon" class="fas fa-chevron-right mr-2 text-sm transition-transform"></i>
                        <i class="fas fa-book-open mr-2 text-indigo-500"></i>
                        표지 이미지
                    </h3>
                    <p class="text-xs md:text-base text-gray-600">
                        <i class="fas fa-info-circle mr-2"></i>
                        <span class="hidden sm:inline">동화책의 첫인상을 결정하는 표지 이미지를 생성하세요.</span>
                        <span class="sm:hidden">동화책 표지 생성</span>
                    </p>
                    ${createModelSelect('cover', imageSettings.coverModel || 'gemini-3-pro-image-preview', 'updateCoverModel(this.value)')}
                </div>
                <div class="flex gap-2 md:gap-3">
                    <button 
                        onclick="generateCoverImage()"
                        class="bg-indigo-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-indigo-700 transition whitespace-nowrap text-sm md:text-base"
                    >
                        <i class="fas fa-image mr-1 md:mr-2"></i><span class="hidden sm:inline">${storybook.coverImage ? '표지 재생성' : '표지 생성'}</span><span class="sm:hidden">${storybook.coverImage ? '재생성' : '생성'}</span>
                    </button>
                    <button 
                        onclick="openCoverUploadModal()"
                        class="bg-blue-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-700 transition whitespace-nowrap text-sm md:text-base"
                    >
                        <i class="fas fa-upload mr-1 md:mr-2"></i><span class="hidden sm:inline">이미지 업로드</span><span class="sm:hidden">업로드</span>
                    </button>
                </div>
            </div>
            <div id="cover-section-content" class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 hidden">
                <!-- 표지 이미지 -->
                <div class="card rounded-xl p-4 md:p-6 bg-gradient-to-br from-indigo-500 to-purple-600">
                    <h4 class="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">
                        <i class="fas fa-image mr-2"></i>표지 이미지
                    </h4>
                    <div id="cover-image-display" class="mb-3 md:mb-4 min-h-[300px] md:min-h-[400px] bg-white bg-opacity-20 rounded-lg overflow-hidden">
                        ${storybook.coverImage ? 
                            (() => {
                                const history = storybook.coverImageHistory || [];
                                return `
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
                            })() :
                            '<div class="flex items-center justify-center h-full"><div class="text-center p-6"><i class="fas fa-book-open text-6xl text-white opacity-50 mb-4"></i><p class="text-white text-sm">표지 이미지 생성 대기중</p></div></div>'
                        }
                    </div>
                </div>
                
                <!-- 표지 프롬프트 및 설정 -->
                <div class="space-y-4">
                    <div class="bg-gray-50 rounded-xl p-4 md:p-6">
                        <h4 class="text-lg font-bold text-gray-800 mb-3">
                            <i class="fas fa-edit mr-2"></i>표지 프롬프트
                        </h4>
                        <textarea 
                            id="cover-prompt" 
                            class="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            rows="6"
                            placeholder="표지 이미지 프롬프트를 작성하세요..."
                        >${storybook.coverPrompt || buildCoverPrompt(storybook)}</textarea>
                        <button 
                            onclick="resetCoverPrompt()"
                            class="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                            <i class="fas fa-redo mr-1"></i>기본 프롬프트로 초기화
                        </button>
                    </div>
                    
                    <!-- 표지 비율 선택 -->
                    <div class="bg-gray-50 rounded-xl p-4 md:p-6">
                        <h4 class="text-lg font-bold text-gray-800 mb-3">
                            <i class="fas fa-expand-arrows-alt mr-2"></i>이미지 비율
                        </h4>
                        <select 
                            id="cover-aspect-ratio" 
                            class="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="4:3" ${!storybook.coverAspectRatio || storybook.coverAspectRatio === '4:3' ? 'selected' : ''}>4:3 (가로 표준) - 권장</option>
                            <option value="16:9" ${storybook.coverAspectRatio === '16:9' ? 'selected' : ''}>16:9 (가로 와이드)</option>
                            <option value="1:1" ${storybook.coverAspectRatio === '1:1' ? 'selected' : ''}>1:1 (정사각형)</option>
                            <option value="3:4" ${storybook.coverAspectRatio === '3:4' ? 'selected' : ''}>3:4 (세로 표준)</option>
                            <option value="9:16" ${storybook.coverAspectRatio === '9:16' ? 'selected' : ''}>9:16 (세로 와이드)</option>
                        </select>
                        <p class="text-xs text-gray-500 mt-2">
                            <i class="fas fa-info-circle mr-1"></i>기본값: 4:3 (책 표지에 적합)
                        </p>
                    </div>
                    
                    <div class="bg-gray-50 rounded-xl p-4 md:p-6">
                        <h4 class="text-lg font-bold text-gray-800 mb-3">
                            <i class="fas fa-users mr-2"></i>참조할 캐릭터 선택
                        </h4>
                        <div class="space-y-2 max-h-64 overflow-y-auto pr-2" style="scrollbar-width: thin;">
                            ${storybook.characters.map((char, idx) => `
                                <label class="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        id="cover-char-ref-${idx}"
                                        ${storybook.coverCharacterRefs && storybook.coverCharacterRefs.includes(idx) ? 'checked' : ''}
                                        onchange="toggleCoverCharacterRef(${idx}, this.checked)"
                                        class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <div class="flex items-center gap-2 flex-1">
                                        ${char.referenceImage ? 
                                            `<img src="${char.referenceImage}" class="w-10 h-10 rounded object-cover" />` :
                                            `<div class="w-10 h-10 rounded bg-gray-200 flex items-center justify-center"><i class="fas fa-user text-gray-400"></i></div>`
                                        }
                                        <span class="text-sm font-medium">${char.name}</span>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                        ${storybook.characters.length > 4 ? `<p class="text-xs text-gray-500 mt-2"><i class="fas fa-info-circle mr-1"></i>스크롤하여 더 많은 캐릭터 보기</p>` : ''}
                    </div>
                </div>
            </div>
        </div>

        <!-- Key Objects 섹션 -->
        <div class="bg-white rounded-3xl shadow-2xl p-4 md:p-10 mb-8">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 mb-4 md:mb-6">
                <div class="flex-1">
                    <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2 cursor-pointer flex items-center" onclick="toggleSection('keyobject-section')">
                        <i id="keyobject-section-icon" class="fas fa-chevron-right mr-2 text-sm transition-transform"></i>
                        <i class="fas fa-cube mr-2 text-orange-500"></i>
                        핵심 사물 (Key Objects)
                    </h3>
                    <p class="text-xs md:text-base text-gray-600">
                        <i class="fas fa-info-circle mr-2"></i>
                        <span class="hidden sm:inline">스토리에서 중요한 물건들을 미리 생성하면 삽화에서 일관되게 표현할 수 있어요.</span>
                        <span class="sm:hidden">핵심 사물로 일관성 유지</span>
                    </p>
                    ${createModelSelect('keyobject', imageSettings.keyObjectModel || 'gemini-3-pro-image-preview', 'updateKeyObjectModel(this.value)')}
                </div>
                <div class="flex gap-2 md:gap-3">
                    <button 
                        onclick="generateAllKeyObjectImages()"
                        class="bg-orange-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-orange-700 transition whitespace-nowrap text-sm md:text-base"
                    >
                        <i class="fas fa-images mr-1 md:mr-2"></i><span class="hidden sm:inline">모든 이미지 생성</span><span class="sm:hidden">전체 생성</span>
                    </button>
                    <button 
                        onclick="downloadAllKeyObjectImages()"
                        class="bg-green-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-green-700 transition whitespace-nowrap text-sm md:text-base"
                    >
                        <i class="fas fa-download mr-1 md:mr-2"></i><span class="hidden sm:inline">모두 다운로드</span><span class="sm:hidden">다운</span>
                    </button>
                    <button 
                        onclick="bulkUploadKeyObjectImages()"
                        class="bg-purple-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-purple-700 transition whitespace-nowrap text-sm md:text-base"
                    >
                        <i class="fas fa-upload mr-1 md:mr-2"></i><span class="hidden sm:inline">일괄 업로드</span><span class="sm:hidden">업로드</span>
                    </button>
                    <button 
                        onclick="addNewKeyObject()"
                        class="bg-blue-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg hover:bg-blue-700 transition whitespace-nowrap text-sm md:text-base"
                    >
                        <i class="fas fa-plus mr-1 md:mr-2"></i><span class="hidden sm:inline">사물 추가</span><span class="sm:hidden">추가</span>
                    </button>
                </div>
            </div>

            <div id="keyobject-section-content" class="hidden">
            ${storybook.key_objects && storybook.key_objects.length > 0 ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                ${storybook.key_objects.map((obj, idx) => {
                    const objImg = storybook.keyObjectImages && storybook.keyObjectImages[idx];
                    const sizeIcon = obj.size === 'small' ? 'fa-hand-holding' : obj.size === 'large' ? 'fa-building' : 'fa-box';
                    const sizeColor = obj.size === 'small' ? 'text-blue-600' : obj.size === 'large' ? 'text-red-600' : 'text-yellow-600';
                    return `
                    <div class="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-xl border-2 border-orange-200">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <input 
                                        type="text" 
                                        id="keyobj-name-${idx}" 
                                        value="${obj.name}"
                                        onblur="updateKeyObjectField(${idx}, 'name', this.value)"
                                        class="font-bold text-gray-700 bg-transparent border-b border-orange-300 focus:border-orange-500 focus:outline-none w-full"
                                        placeholder="영어 이름"
                                    />
                                    <i class="${sizeIcon} ${sizeColor}" title="${obj.size}"></i>
                                </div>
                                <input 
                                    type="text" 
                                    id="keyobj-korean-${idx}" 
                                    value="${obj.korean}"
                                    onblur="updateKeyObjectField(${idx}, 'korean', this.value)"
                                    class="text-sm text-gray-600 bg-transparent border-b border-orange-200 focus:border-orange-400 focus:outline-none w-full mb-2"
                                    placeholder="한글 이름"
                                />
                                <div class="flex items-center gap-2 mb-2">
                                    <select 
                                        id="keyobj-size-${idx}"
                                        onchange="updateKeyObjectField(${idx}, 'size', this.value)"
                                        class="flex-1 text-xs bg-white border border-orange-200 rounded px-2 py-1"
                                    >
                                        <option value="small" ${obj.size === 'small' ? 'selected' : ''}>Small</option>
                                        <option value="medium" ${obj.size === 'medium' ? 'selected' : ''}>Medium</option>
                                        <option value="large" ${obj.size === 'large' ? 'selected' : ''}>Large</option>
                                    </select>
                                    <div class="flex items-center gap-1">
                                        <input 
                                            type="number" 
                                            id="keyobj-size-cm-${idx}" 
                                            value="${obj.sizeCm || (obj.size === 'small' ? 10 : obj.size === 'large' ? 200 : 100)}"
                                            onblur="updateKeyObjectField(${idx}, 'sizeCm', parseInt(this.value))"
                                            class="w-12 text-xs bg-white border border-orange-200 rounded px-1 py-1 text-center"
                                            min="1"
                                            max="1000"
                                        />
                                        <span class="text-xs text-gray-600">cm</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onclick="deleteKeyObject(${idx})"
                                class="text-orange-600 hover:text-red-600 ml-2"
                                title="삭제"
                            >
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        
                        <div class="mb-2">
                            <label class="text-xs text-gray-500 block mb-1">설명 (시각적 상세):</label>
                            <textarea 
                                id="keyobj-description-${idx}" 
                                onblur="updateKeyObjectField(${idx}, 'description', this.value)"
                                class="text-xs text-gray-700 bg-white border border-orange-200 rounded p-2 focus:border-orange-400 focus:outline-none w-full"
                                placeholder="색상, 재질, 모양, 크기, 특징..."
                                rows="3"
                            >${obj.description}</textarea>
                        </div>
                        
                        <div class="mb-3">
                            <label class="text-xs text-gray-500 block mb-1">예시 문장:</label>
                            <input 
                                type="text" 
                                id="keyobj-example-${idx}" 
                                value="${obj.example || ''}"
                                onblur="updateKeyObjectField(${idx}, 'example', this.value)"
                                class="text-xs text-blue-700 bg-blue-50 border border-orange-200 rounded px-2 py-1 focus:border-orange-400 focus:outline-none w-full"
                                placeholder="이 사물이 등장하는 문장"
                            />
                        </div>
                        
                        <div id="keyobj-img-${idx}" class="bg-white rounded-lg mb-2 min-h-[180px] flex items-center justify-center overflow-hidden border-2 border-orange-200 relative">
                            ${objImg && objImg.imageUrl ? 
                                `<div class="relative w-full h-full group">
                                    <img 
                                        src="${objImg.imageUrl}" 
                                        alt="${obj.name}" 
                                        class="w-full h-full object-cover rounded-lg cursor-pointer"
                                        onclick="toggleImageDeleteButton('keyobj-${idx}')"
                                    />
                                    <button 
                                        id="keyobj-${idx}-delete-btn"
                                        onclick="event.stopPropagation(); deleteKeyObjectImage(${idx})"
                                        class="hidden absolute top-2 right-2 bg-red-500 bg-opacity-90 text-white w-8 h-8 rounded-full hover:bg-opacity-100 transition shadow-lg flex items-center justify-center z-10"
                                        title="이미지 삭제"
                                    >
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>` :
                                `<p class="text-gray-400 text-sm text-center p-4">
                                    <i class="fas fa-cube text-3xl mb-2"></i><br>
                                    이미지 대기중
                                </p>`
                            }
                        </div>
                        
                        <button 
                            onclick="generateSingleKeyObjectImage(${idx})"
                            class="w-full bg-orange-500 text-white px-2 py-2 rounded text-sm hover:bg-orange-600 transition"
                        >
                            <i class="fas fa-magic mr-1"></i>${objImg && objImg.imageUrl ? '재생성' : '이미지 생성'}
                        </button>
                    </div>
                    `;
                }).join('')}
            </div>
            ` : `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-cube text-5xl mb-3"></i>
                <p class="text-lg">아직 핵심 사물이 없습니다.</p>
                <p class="text-sm mt-2">"사물 추가" 버튼을 눌러 핵심 사물을 추가하세요.</p>
            </div>
            `}
            </div>
        </div>

        <!-- 페이지 섹션 -->
        <div class="bg-white rounded-3xl shadow-2xl p-10 mb-8">
            <!-- 제목 -->
            <h3 class="text-3xl font-bold text-gray-800 cursor-pointer flex items-center mb-6" onclick="toggleSection('pages-section')">
                <i id="pages-section-icon" class="fas fa-chevron-down mr-2 text-sm transition-transform"></i>
                <i class="fas fa-book mr-2 text-purple-500"></i>
                스토리 페이지 (${storybook.pages.length}페이지)
            </h3>
            
            <!-- 설정 옵션 -->
            <div class="mb-6 space-y-4">
                <div class="flex items-center gap-4 flex-wrap">
                    <div class="flex items-center gap-2">
                        <label class="text-sm text-gray-600">이미지 모델:</label>
                        ${createModelSelect('illustration', imageSettings.illustrationModel || 'gemini-3-pro-image-preview')}
                    </div>
                </div>
                
                <!-- 언어 탭 -->
                ${(() => {
                    // languages 배열이 있으면 사용, 없으면 translations에서 추출
                    let availableLanguages = storybook.languages || [];
                    
                    // translations가 있으면 언어 목록에 추가
                    if (storybook.translations && typeof storybook.translations === 'object') {
                        const translationLangs = Object.keys(storybook.translations);
                        availableLanguages = ['ko', ...translationLangs].filter((v, i, a) => a.indexOf(v) === i); // 중복 제거
                    }
                    
                    // 언어가 없으면 한국어 기본
                    if (availableLanguages.length === 0) {
                        availableLanguages = ['ko'];
                    }
                    
                    return `
                        <div class="border-b border-gray-200 -mx-10 px-10 mb-6">
                            <div class="flex items-center gap-1">
                                ${availableLanguages.map(lang => {
                                    const languageNames = {
                                        'ko': '🇰🇷 한국어',
                                        'en': '🇺🇸 English',
                                        'zh': '🇨🇳 中文',
                                        'ja': '🇯🇵 日本어',
                                        'es': '🇪🇸 Español',
                                        'fr': '🇫🇷 Français'
                                    };
                                    const isActive = lang === (currentLanguage || 'ko');
                                    return `
                                        <button 
                                            onclick="switchLanguage('${lang}')"
                                            class="px-6 py-3 font-semibold transition-all relative ${
                                                isActive 
                                                ? 'text-purple-600' 
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                            }"
                                            style="${isActive ? 'border-bottom: 3px solid rgb(147, 51, 234); margin-bottom: -1px;' : ''}"
                                        >
                                            ${languageNames[lang] || lang}
                                        </button>
                                    `;
                                }).join('')}
                                
                                <!-- 언어 추가 버튼 -->
                                <div class="relative ml-2">
                                    <button 
                                        onclick="toggleAddLanguageDropdown()"
                                        class="px-4 py-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all font-semibold text-sm border-2 border-dashed border-gray-300 hover:border-purple-400"
                                        title="언어 추가"
                                    >
                                        <i class="fas fa-plus mr-1"></i>언어 추가
                                    </button>
                                    
                                    <!-- 드롭다운 메뉴 -->
                                    <div id="add-language-dropdown" class="hidden absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[200px]">
                                        <div class="p-3">
                                            <p class="text-xs text-gray-600 mb-2">추가할 언어 선택</p>
                                            ${['en', 'zh', 'ja', 'es', 'fr'].filter(lang => !availableLanguages.includes(lang)).map(lang => {
                                                const langNames = {
                                                    en: '🇺🇸 English',
                                                    zh: '🇨🇳 中文',
                                                    ja: '🇯🇵 日本어',
                                                    es: '🇪🇸 Español',
                                                    fr: '🇫🇷 Français'
                                                };
                                                return `
                                                    <button 
                                                        onclick="addLanguageFromTab('${lang}')"
                                                        class="w-full text-left px-3 py-2 hover:bg-purple-50 rounded text-sm transition"
                                                    >
                                                        ${langNames[lang]}
                                                    </button>
                                                `;
                                            }).join('')}
                                            ${availableLanguages.length >= 6 ? '<p class="text-xs text-gray-500 p-2">모든 언어가 추가되었습니다</p>' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                })()}
            </div>
            
            <!-- TTS 설정 -->
            <div class="bg-gradient-to-r from-purple-50 to-blue-50 p-5 rounded-xl mb-6">
                <div class="flex items-center gap-2 mb-4">
                    <i class="fas fa-cog text-purple-600"></i>
                    <h4 class="font-bold text-gray-800">TTS 생성 설정</h4>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Gemini TTS 모델 -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-brain mr-1 text-purple-600"></i>
                            Gemini 모델
                        </label>
                        <select 
                            id="page-gemini-tts-model-select"
                            onchange="updatePageGeminiTTSModel(this.value)"
                            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                        >
                            <option value="gemini-2.5-flash-preview-tts">Flash (무료 - 10회/일)</option>
                            <option value="gemini-2.5-pro-preview-tts">Pro (유료 - 고품질)</option>
                        </select>
                    </div>
                    
                    <!-- TTS 음성 -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-microphone mr-1 text-blue-600"></i>
                            음성 선택
                        </label>
                        <select 
                            id="page-tts-model-select"
                            onchange="updateGlobalTTSModel(this.value)"
                            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="Puck">Puck (남성, 밝고 활기찬)</option>
                            <option value="Charon">Charon (남성, 차분하고 신중한)</option>
                            <option value="Kore">Kore (여성, 따뜻하고 부드러운)</option>
                            <option value="Fenrir">Fenrir (남성, 힘있고 권위적인)</option>
                            <option value="Aoede">Aoede (여성, 우아하고 서정적인)</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- 액션 버튼 -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <!-- 삽화 생성 버튼들 -->
                    <div class="relative">
                        <button 
                            onclick="generateAllIllustrationsParallel()"
                            class="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3.5 rounded-lg hover:from-red-600 hover:to-red-700 transition shadow-lg flex items-center justify-center gap-2 font-semibold"
                        >
                            <i class="fas fa-bolt"></i>
                            <span>삽화 생성 (빠르게)</span>
                        </button>
                        <button 
                            onclick="showGenerationModeHelp('parallel')"
                            class="absolute top-2 right-2 bg-white text-red-600 w-5 h-5 rounded-full hover:bg-red-50 transition shadow-md flex items-center justify-center text-xs"
                            title="병렬 생성 모드"
                        >
                            ?
                        </button>
                    </div>
                    
                    <div class="relative">
                        <button 
                            onclick="generateAllIllustrationsSequential()"
                            class="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3.5 rounded-lg hover:from-red-700 hover:to-red-800 transition shadow-lg flex items-center justify-center gap-2 font-semibold"
                        >
                            <i class="fas fa-layer-group"></i>
                            <span>삽화 생성 (정확하게)</span>
                        </button>
                        <button 
                            onclick="showGenerationModeHelp('sequential')"
                            class="absolute top-2 right-2 bg-white text-red-700 w-5 h-5 rounded-full hover:bg-red-50 transition shadow-md flex items-center justify-center text-xs"
                            title="순차 생성 모드"
                        >
                            ?
                        </button>
                    </div>
                    
                    <!-- TTS 생성 버튼 -->
                    <button 
                        onclick="generateAllTTS()"
                        class="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3.5 rounded-lg hover:from-purple-600 hover:to-purple-700 transition shadow-lg flex items-center justify-center gap-2 font-semibold"
                    >
                        <i class="fas fa-microphone"></i>
                        <span>모든 TTS 생성</span>
                    </button>
                    
                    ${currentLanguage !== 'ko' ? `
                    <!-- 번역 버튼 -->
                    <button 
                        onclick="translateAllPages()"
                        id="translate-all-btn"
                        class="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-3.5 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition shadow-lg flex items-center justify-center gap-2 font-semibold"
                    >
                        <i class="fas fa-language"></i>
                        <span>모두 번역하기</span>
                    </button>
                    ` : ''}
                    
                    <!-- 다운로드 버튼들 -->
                    <button 
                        onclick="downloadAllIllustrations()"
                        class="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-lg flex items-center justify-center gap-2 font-semibold"
                    >
                        <i class="fas fa-images"></i>
                        <span>삽화 다운로드</span>
                    </button>
                    
                    <button 
                        onclick="downloadAllAudio()"
                        class="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3.5 rounded-lg hover:from-green-600 hover:to-green-700 transition shadow-lg flex items-center justify-center gap-2 font-semibold"
                    >
                        <i class="fas fa-headphones text-xl"></i>
                        <span>전체 TTS 다운로드</span>
                    </button>
                    
                    <button 
                        onclick="openBatchTTSUploadModal()"
                        class="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-3.5 rounded-lg hover:from-teal-600 hover:to-teal-700 transition shadow-lg flex items-center justify-center gap-2 font-semibold"
                    >
                        <i class="fas fa-upload text-xl"></i>
                        <span>전체 TTS 업로드</span>
                    </button>
                    
                    <button 
                        onclick="downloadAllIllustrationTexts()"
                        class="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3.5 rounded-lg hover:from-purple-600 hover:to-purple-700 transition shadow-lg flex items-center justify-center gap-2 font-semibold"
                    >
                        <i class="fas fa-file-alt text-xl"></i>
                        <span>전체 페이지 텍스트 다운로드</span>
                    </button>
                    
                    <!-- 일괄 업로드 버튼 -->
                    <button 
                        onclick="openBatchUploadModal()"
                        id="batch-upload-btn"
                        class="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3.5 rounded-lg hover:from-orange-600 hover:to-orange-700 transition shadow-lg flex items-center justify-center gap-2 font-semibold"
                    >
                        <i class="fas fa-upload text-xl"></i>
                        <span>삽화 일괄 업로드</span>
                    </button>
                    
                    <!-- 다운로드 버튼 -->
                </div>

            <div id="pages-section-content" class="space-y-4 md:space-y-6">
                ${storybook.pages.map((page, idx) => `
                    <div class="page-card bg-white rounded-xl shadow-lg overflow-hidden border border-purple-200">
                        <div class="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="bg-white text-purple-600 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow">
                                    ${page.pageNumber}
                                </span>
                                <span class="text-white font-semibold text-base md:text-lg">페이지 ${page.pageNumber}</span>
                            </div>
                            <div class="flex gap-1.5">
                                ${page.text ? '<div class="w-6 h-6 bg-white bg-opacity-90 rounded-full flex items-center justify-center" title="텍스트 완료"><i class="fas fa-align-left text-purple-600 text-xs"></i></div>' : ''}
                                ${getPageTTS(page, currentLanguage) ? '<div class="w-6 h-6 bg-white bg-opacity-90 rounded-full flex items-center justify-center" title="TTS 완료"><i class="fas fa-volume-up text-blue-600 text-xs"></i></div>' : ''}
                                ${page.illustrationImage ? '<div class="w-6 h-6 bg-white bg-opacity-90 rounded-full flex items-center justify-center" title="삽화 완료"><i class="fas fa-image text-green-600 text-xs"></i></div>' : ''}
                            </div>
                        </div>
                        
                        <div class="p-3 md:p-6 space-y-4 md:space-y-5">
                            <!-- 1️⃣ 텍스트 섹션 -->
                            <div class="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 md:p-4">
                                <h5 class="font-bold text-purple-700 mb-3 text-sm md:text-base flex items-center justify-between">
                                    <span class="flex items-center">
                                        <span class="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs">1</span>
                                        텍스트
                                    </span>
                                    ${currentLanguage !== 'ko' ? `
                                    <button 
                                        onclick="translateSinglePage(${idx})"
                                        data-translate-page="${idx}"
                                        class="bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition text-xs"
                                    >
                                        <i class="fas fa-language mr-1"></i>번역
                                    </button>
                                    ` : ''}
                                </h5>
                                <textarea 
                                    id="text-${idx}" 
                                    class="w-full p-2.5 md:p-3 border-2 border-purple-300 rounded-lg text-xs md:text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white"
                                    rows="4"
                                    onchange="updatePageText(${idx}, this.value)"
                                    onblur="updatePageText(${idx}, this.value)"
                                    oninput="debouncedUpdatePageText(${idx}, this.value)"
                                    placeholder="이 페이지의 스토리를 작성하세요..."
                                >${getPageText(page, currentLanguage)}</textarea>
                            </div>

                            <!-- 2️⃣ TTS 섹션 -->
                            <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 md:p-4">
                                <h5 class="font-bold text-blue-700 mb-3 text-sm md:text-base flex items-center">
                                    <span class="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs">2</span>
                                    음성(TTS)
                                </h5>
                                
                                <!-- 음성 설정 -->
                                <div class="mb-3">
                                    <label class="text-xs md:text-sm font-semibold text-gray-700 block mb-2">
                                        <i class="fas fa-microphone-alt mr-1 text-blue-600"></i>음성 설정
                                    </label>
                                    <input 
                                        id="tts-config-${idx}" 
                                        value="${page.ttsConfig || imageSettings.ttsVoiceConfig}"
                                        placeholder="예: 여성 목소리, 동화 낭독 스타일, 또박또박"
                                        class="w-full p-2.5 md:p-3 border-2 border-blue-300 rounded-lg text-xs md:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                        onblur="updateTTSConfig(${idx}, this.value)"
                                    />
                                </div>
                                
                                <!-- 모델 선택 -->
                                <div class="mb-3">
                                    <label class="text-xs md:text-sm font-semibold text-gray-700 block mb-2">
                                        <i class="fas fa-robot mr-1 text-blue-600"></i>모델 선택
                                    </label>
                                    ${createTTSModelSelect(page.ttsModel || imageSettings.ttsModel, idx)}
                                </div>
                                
                                <button 
                                    onclick="generatePageTTS(${idx})"
                                    class="w-full bg-blue-600 text-white py-2.5 md:py-3 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition text-sm md:text-base shadow-md mb-2"
                                    id="tts-btn-${idx}"
                                >
                                    <i class="fas fa-microphone mr-2"></i>${getPageTTS(page, currentLanguage) ? 'TTS 재생성' : 'TTS 생성'}
                                </button>
                                
                                ${getPageTTS(page, currentLanguage) ? `
                                <div class="space-y-2">
                                    <audio controls class="w-full h-10 md:h-12">
                                        <source src="${getPageTTS(page, currentLanguage)}" type="audio/wav">
                                    </audio>
                                    <button 
                                        onclick="downloadAudio('${getPageTTS(page, currentLanguage)}', '${storybook.title}_${currentLanguage}_페이지_${page.pageNumber}.wav')"
                                        class="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 active:bg-green-800 transition text-xs md:text-sm shadow"
                                    >
                                        <i class="fas fa-download mr-1"></i>오디오 다운로드
                                    </button>
                                </div>
                                ` : `<p class="text-xs text-gray-500 text-center py-3 bg-white rounded-lg border border-blue-200">TTS 생성 버튼을 클릭하세요</p>`}
                            </div>

                            <!-- 3️⃣ 삽화 섹션 -->
                            <div class="bg-green-50 border-2 border-green-200 rounded-lg p-3 md:p-4">
                                <h5 class="font-bold text-green-700 mb-3 text-sm md:text-base flex items-center">
                                    <span class="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs">3</span>
                                    삽화
                                </h5>
                                
                                <!-- 장면 설명 -->
                                <div class="mb-3">
                                    <label class="text-xs md:text-sm font-semibold text-gray-700 block mb-2">
                                        <i class="fas fa-palette mr-1 text-green-600"></i>장면 설명
                                    </label>
                                    <textarea 
                                        id="scene-combined-${idx}" 
                                        class="w-full p-2.5 md:p-3 border-2 border-green-300 rounded-lg text-xs md:text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white"
                                        rows="3"
                                        placeholder="장면, 캐릭터, 배경, 분위기를 자세히 설명하세요..."
                                        onblur="updateSceneCombined(${idx}, this.value)"
                                    >${page.scene_description || ''}</textarea>
                                    <p class="text-[10px] text-gray-500 mt-1"><i class="fas fa-info-circle mr-1"></i>장면의 전체적인 모습을 하나의 텍스트로 작성하세요</p>
                                </div>
                                
                                <!-- 삽화 생성 및 업로드 버튼 -->
                                <div class="grid grid-cols-2 gap-2 mb-3">
                                    <button 
                                        onclick="generateIllustration(${idx})"
                                        class="bg-green-600 text-white py-2.5 md:py-3 rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 transition text-sm md:text-base shadow-md"
                                    >
                                        <i class="fas fa-paint-brush mr-2"></i>${page.illustrationImage ? '삽화 재생성' : '삽화 생성'}
                                    </button>
                                    <button 
                                        onclick="openIllustrationUploadModal(${idx})"
                                        class="bg-blue-600 text-white py-2.5 md:py-3 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition text-sm md:text-base shadow-md"
                                    >
                                        <i class="fas fa-upload mr-2"></i>이미지 업로드
                                    </button>
                                </div>
                                
                                <div id="illustration-${idx}" class="bg-white rounded-lg overflow-hidden shadow-sm border-2 border-gray-200">
                                    ${page.illustrationImage ?
                                        (() => {
                                            const history = page.illustrationHistory || [];
                                            return `
                                                <div class="flex gap-2 h-full">
                                                    <!-- 메인 이미지 -->
                                                    <div class="flex-1 relative group">
                                                        <img 
                                                            src="${page.illustrationImage}" 
                                                            alt="Page ${page.pageNumber}" 
                                                            class="w-full h-auto cursor-pointer"
                                                            onclick="toggleImageDeleteButton('page-${idx}')"
                                                        />
                                                        <button 
                                                            id="page-${idx}-delete-btn"
                                                            onclick="event.stopPropagation(); deletePageIllustration(${idx})"
                                                            class="hidden absolute top-3 right-3 bg-red-500 bg-opacity-90 text-white w-10 h-10 rounded-full hover:bg-opacity-100 transition shadow-lg flex items-center justify-center z-10"
                                                            title="이미지 삭제"
                                                        >
                                                            <i class="fas fa-times"></i>
                                                        </button>
                                                        <button 
                                                            onclick="downloadImage('${page.illustrationImage}', '${storybook.title}_페이지_${page.pageNumber}.png')"
                                                            class="absolute bottom-3 right-3 bg-white bg-opacity-90 text-green-600 w-11 h-11 rounded-full hover:bg-opacity-100 transition shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                                                            title="다운로드"
                                                        >
                                                            <i class="fas fa-download text-base"></i>
                                                        </button>
                                                    </div>
                                                    ${history.length > 0 ? `
                                                        <!-- 히스토리 -->
                                                        <div class="w-20 overflow-y-auto space-y-2 p-1" style="scrollbar-width: thin; scrollbar-color: rgba(34, 197, 94, 0.5) rgba(34, 197, 94, 0.1);">
                                                            ${history.map((url, histIdx) => `
                                                                <div class="relative group cursor-pointer border-2 border-transparent hover:border-green-400 rounded transition" onclick="selectIllustrationFromHistory(${idx}, ${histIdx})" title="이전 버전 ${histIdx + 1}">
                                                                    <img src="${url}" alt="이전 ${histIdx + 1}" class="w-full h-16 object-cover rounded"/>
                                                                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                                                                        <i class="fas fa-check text-white text-xs opacity-0 group-hover:opacity-100 transition"></i>
                                                                    </div>
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            `;
                                        })() :
                                        `<div class="min-h-[150px] md:min-h-[200px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                            <p class="text-gray-400 text-center p-4 text-xs md:text-sm">
                                                <i class="fas fa-image text-3xl md:text-4xl mb-2 block"></i>
                                                삽화 생성 버튼을 클릭하세요
                                            </p>
                                        </div>`
                                    }
                                </div>
                                
                                ${page.illustrationImage ? `
                                <div class="mt-2">
                                    <label class="block text-xs font-semibold text-gray-700 mb-1">
                                        <i class="fas fa-edit mr-1"></i>수정사항 (선택)
                                    </label>
                                    <textarea 
                                        id="edit-note-${idx}" 
                                        class="w-full p-2 border-2 border-yellow-300 rounded-lg text-xs bg-yellow-50"
                                        rows="2"
                                        placeholder="예: 토끼를 더 크게"
                                    >${page.editNote || ''}</textarea>
                                </div>
                                ` : ''}
                                
                                <!-- 참조 이미지 (접기 가능) -->
                                <div class="mt-3">
                                    <button 
                                        onclick="togglePageSection('ref-images-${idx}')"
                                        class="w-full flex items-center justify-between text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition"
                                    >
                                        <span><i class="fas fa-images mr-1"></i>참조 이미지 (선택)</span>
                                        <i id="ref-images-${idx}-icon" class="fas fa-chevron-down text-xs transition-transform"></i>
                                    </button>
                                    <div id="ref-images-${idx}-content" class="hidden mt-2">
                                        <div class="grid grid-cols-3 md:grid-cols-4 gap-1.5 md:gap-2 max-h-28 md:max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-1.5 md:p-2 bg-white">
                                            ${storybook.pages.map((p, pIdx) => {
                                                if (pIdx === idx || !p.illustrationImage) return '';
                                                return `
                                                <div class="relative cursor-pointer touch-manipulation" onclick="toggleReferenceImage(${idx}, ${pIdx})">
                                                    <img 
                                                        src="${p.illustrationImage}" 
                                                        alt="페이지 ${p.pageNumber}"
                                                        class="w-full h-14 md:h-16 object-cover rounded border-2 border-gray-300 active:border-green-500 transition"
                                                        id="ref-img-${idx}-${pIdx}"
                                                    />
                                                    <div class="absolute top-0 right-0 bg-green-600 text-white text-[10px] md:text-xs px-1 py-0.5 rounded-bl font-semibold">
                                                        ${p.pageNumber}
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        id="ref-check-${idx}-${pIdx}"
                                                        class="absolute top-0.5 left-0.5 w-3.5 h-3.5 md:w-4 md:h-4"
                                                    />
                                                </div>
                                                `;
                                            }).join('') || '<p class="text-gray-400 text-[10px] md:text-xs col-span-3 md:col-span-4 text-center py-3">아직 다른 페이지에 이미지가 없습니다</p>'}
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Key Objects (접기 가능) -->
                                ${storybook.key_objects && storybook.key_objects.length > 0 ? `
                                <div class="mt-2">
                                    <button 
                                        onclick="togglePageSection('ref-keyobj-${idx}')"
                                        class="w-full flex items-center justify-between text-xs font-semibold text-gray-700 bg-orange-50 hover:bg-orange-100 p-2 rounded-lg transition"
                                    >
                                        <span><i class="fas fa-cube mr-1"></i>Key Objects (선택)</span>
                                        <i id="ref-keyobj-${idx}-icon" class="fas fa-chevron-down text-xs transition-transform"></i>
                                    </button>
                                    <div id="ref-keyobj-${idx}-content" class="hidden mt-2">
                                        <div class="grid grid-cols-3 md:grid-cols-4 gap-1.5 md:gap-2 max-h-28 md:max-h-32 overflow-y-auto border border-orange-300 rounded-lg p-1.5 md:p-2 bg-white">
                                            ${storybook.key_objects.map((obj, objIdx) => {
                                                const objImg = storybook.keyObjectImages && storybook.keyObjectImages[objIdx];
                                                if (!objImg || !objImg.imageUrl) return '';
                                                return `
                                                <div class="relative cursor-pointer touch-manipulation" onclick="toggleKeyObjectReference(${idx}, ${objIdx})">
                                                    <img 
                                                        src="${objImg.imageUrl}" 
                                                        alt="${obj.korean}"
                                                        class="w-full h-14 md:h-16 object-cover rounded border-2 border-orange-300 active:border-orange-500 transition"
                                                        id="ref-keyobj-${idx}-${objIdx}"
                                                    />
                                                    <div class="absolute top-0 right-0 bg-orange-600 text-white text-[10px] md:text-xs px-1 py-0.5 rounded-bl font-semibold">
                                                        ${obj.korean}
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        id="ref-keyobj-check-${idx}-${objIdx}"
                                                        class="absolute top-0.5 left-0.5 w-3.5 h-3.5 md:w-4 md:h-4"
                                                    />
                                                </div>
                                                `;
                                            }).join('') || '<p class="text-gray-400 text-[10px] md:text-xs col-span-3 md:col-span-4 text-center py-3">아직 Key Object가 없습니다</p>'}
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <!-- 캐릭터 레퍼런스 (접기 가능) -->
                                ${storybook.characters && storybook.characters.length > 0 ? `
                                <div class="mt-2">
                                    <button 
                                        onclick="togglePageSection('ref-chars-${idx}')"
                                        class="w-full flex items-center justify-between text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 p-2 rounded-lg transition"
                                    >
                                        <span><i class="fas fa-users mr-1"></i>캐릭터 레퍼런스 (선택)</span>
                                        <i id="ref-chars-${idx}-icon" class="fas fa-chevron-down text-xs transition-transform"></i>
                                    </button>
                                    <div id="ref-chars-${idx}-content" class="hidden mt-2 bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
                                        <p class="text-[10px] text-gray-600 mb-2"><i class="fas fa-info-circle mr-1"></i>삽화 생성 시 참조할 캐릭터를 선택하세요</p>
                                        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            ${storybook.characters.map((char, charIdx) => {
                                                if (!char.referenceImage) return '';
                                                return `
                                                <label class="relative cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        id="page-char-ref-${idx}-${charIdx}"
                                                        onchange="togglePageCharacterRef(${idx}, ${charIdx}, this.checked)"
                                                        class="absolute top-2 left-2 w-4 h-4 z-10"
                                                        ${page.characterRefs && page.characterRefs.includes(charIdx) ? 'checked' : ''}
                                                    />
                                                    <div class="border-2 rounded-lg overflow-hidden transition ${page.characterRefs && page.characterRefs.includes(charIdx) ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300 group-hover:border-purple-400'}">
                                                        <img 
                                                            src="${char.referenceImage}" 
                                                            alt="${char.name}"
                                                            class="w-full h-20 object-cover"
                                                        />
                                                        <div class="bg-white px-2 py-1 text-center">
                                                            <p class="text-[10px] font-semibold text-gray-700 truncate">${char.name}</p>
                                                        </div>
                                                    </div>
                                                </label>
                                                `;
                                            }).join('') || '<p class="text-gray-400 text-[10px] col-span-2 md:col-span-3 text-center py-2">레퍼런스 이미지가 있는 캐릭터가 없습니다</p>'}
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>


        
                <!-- 퀴즈 섹션 -->
                <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-lg border-2 border-purple-200">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-xl font-bold text-purple-800">
                            <i class="fas fa-question-circle mr-2"></i>핵심 사물 퀴즈
                            ${storybook.quizzes && storybook.quizzes.length > 0 ? ` (${storybook.quizzes.length}개)` : ''}
                        </h4>
                        <button 
                            onclick="generateQuiz()"
                            class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                        >
                            <i class="fas fa-plus mr-1"></i>퀴즈 ${storybook.quizzes && storybook.quizzes.length > 0 ? '더 ' : ''}만들기
                        </button>
                    </div>
                    
                    <div id="quiz-container" class="space-y-4">
                        ${storybook.quizzes && storybook.quizzes.length > 0 ? 
                            storybook.quizzes.map((quiz, qIdx) => {
                                // Key Object 이미지 찾기
                                let keyObjectImage = null;
                                if (quiz.relatedKeyObject && storybook.key_objects) {
                                    const keyObj = storybook.key_objects.find(obj => 
                                        obj.name === quiz.relatedKeyObject || 
                                        obj.name.toLowerCase().includes(quiz.relatedKeyObject.toLowerCase()) ||
                                        quiz.relatedKeyObject.toLowerCase().includes(obj.name.toLowerCase())
                                    );
                                    if (keyObj && keyObj.imageUrl) {
                                        keyObjectImage = keyObj.imageUrl;
                                    }
                                }
                                
                                return `
                            <div class="bg-white p-5 rounded-lg border-2 border-purple-200 shadow-sm">
                                <div class="flex gap-4">
                                    <!-- 왼쪽: Key Object 이미지 -->
                                    ${keyObjectImage ? `
                                    <div class="flex-shrink-0">
                                        <div class="w-32 h-32 rounded-lg overflow-hidden border-2 border-orange-300 shadow-md">
                                            <img 
                                                src="${keyObjectImage}" 
                                                alt="${quiz.relatedKeyObject || 'Key Object'}"
                                                class="w-full h-full object-cover"
                                                onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full bg-gray-200 flex items-center justify-center text-gray-400\\'>이미지 없음</div>'"
                                            />
                                        </div>
                                        ${quiz.relatedKeyObject ? `
                                        <div class="mt-2 text-center">
                                            <span class="inline-block bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
                                                <i class="fas fa-key mr-1"></i>${quiz.relatedKeyObject}
                                            </span>
                                        </div>
                                        ` : ''}
                                    </div>
                                    ` : ''}
                                    
                                    <!-- 오른쪽: 퀴즈 내용 -->
                                    <div class="flex-1">
                                        <div class="flex justify-between items-start mb-3">
                                            <div class="flex-1">
                                                <h5 class="font-bold text-gray-800">
                                                    <span class="inline-block bg-purple-500 text-white rounded-full w-7 h-7 text-center leading-7 text-sm mr-2">
                                                        ${qIdx + 1}
                                                    </span>
                                                    ${quiz.question}
                                                </h5>
                                                ${!keyObjectImage && quiz.relatedKeyObject ? `
                                                <div class="mt-2 ml-9">
                                                    <span class="inline-block bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
                                                        <i class="fas fa-key mr-1"></i>${quiz.relatedKeyObject}
                                                    </span>
                                                </div>
                                                ` : ''}
                                            </div>
                                            <button 
                                                onclick="deleteQuiz(${qIdx})"
                                                class="text-red-500 hover:text-red-700 ml-2"
                                                title="삭제"
                                            >
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                        
                                        <div class="space-y-2 mb-3">
                                            ${quiz.options.map((option, oIdx) => `
                                            <div class="flex items-start p-3 rounded-lg ${oIdx === quiz.answer ? 'bg-green-50 border-2 border-green-400' : 'bg-gray-50 border border-gray-200'} cursor-pointer hover:bg-opacity-80 transition"
                                                 onclick="showQuizAnswer(${qIdx})">
                                                <span class="inline-block ${oIdx === quiz.answer ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'} rounded-full w-6 h-6 text-center leading-6 text-sm mr-3 flex-shrink-0">
                                                    ${oIdx + 1}
                                                </span>
                                                <span class="${oIdx === quiz.answer ? 'font-semibold text-green-800' : 'text-gray-700'}">
                                                    ${option}
                                                    ${oIdx === quiz.answer ? '<i class="fas fa-check-circle ml-2 text-green-600"></i>' : ''}
                                                </span>
                                            </div>
                                            `).join('')}
                                        </div>
                                        
                                        <div id="quiz-explanation-${qIdx}" class="hidden mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                                            <p class="text-sm text-blue-800">
                                                <i class="fas fa-lightbulb mr-1"></i>
                                                <strong>정답 설명:</strong> ${quiz.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `;
                            }).join('') 
                        : 
                            `<div class="text-center py-8 text-gray-500">
                                <i class="fas fa-question-circle text-4xl mb-3"></i>
                                <p>아직 퀴즈가 없습니다.</p>
                                <p class="text-sm mt-1">위의 "퀴즈 만들기" 버튼을 눌러 Key Objects 기반 퀴즈를 생성하세요.</p>
                            </div>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `;

    resultDiv.innerHTML = html;
    resultDiv.classList.remove('hidden');
    
    // Gemini TTS 모델 select 초기화
    const geminiTTSModelSelect = document.getElementById('page-gemini-tts-model-select');
    if (geminiTTSModelSelect) {
        geminiTTSModelSelect.value = imageSettings.geminiTTSModel || 'gemini-2.5-flash-preview-tts';
    }
    
    // TTS 음성 select 초기화
    const pageTTSModelSelect = document.getElementById('page-tts-model-select');
    if (pageTTSModelSelect) {
        pageTTSModelSelect.value = imageSettings.ttsModel || 'Aoede';
    }
}

// 캐릭터 관리 함수
function updateCharacterName(charIndex, newName) {
    if (newName.trim()) {
        currentStorybook.characters[charIndex].name = newName.trim();
        saveCurrentStorybook();
    }
}

function updateCharacterHeight(charIndex, height) {
    const heightNum = parseInt(height);
    if (heightNum >= 50 && heightNum <= 250) {
        currentStorybook.characters[charIndex].height = heightNum;
        saveCurrentStorybook();
        console.log(`✅ Character height updated: ${currentStorybook.characters[charIndex].name} = ${heightNum}cm`);
    }
}

function deleteCharacter(charIndex) {
    if (confirm(`"${currentStorybook.characters[charIndex].name}" 캐릭터를 삭제하시겠습니까?`)) {
        currentStorybook.characters.splice(charIndex, 1);
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
    }
}

function addNewCharacter() {
    const name = prompt('새 캐릭터 이름을 입력하세요:');
    if (!name || !name.trim()) return;
    
    const description = prompt('캐릭터 외모 설명을 영어로 입력하세요:');
    if (!description || !description.trim()) return;
    
    const role = prompt('캐릭터 역할을 입력하세요:');
    
    const heightStr = prompt('캐릭터 키를 입력하세요 (cm, 50-250):', '150');
    const height = parseInt(heightStr) || 150;
    
    const newCharacter = {
        name: name.trim(),
        description: description.trim(),
        role: role ? role.trim() : '기타',
        height: Math.max(50, Math.min(250, height)),
        referenceImage: null
    };
    
    currentStorybook.characters.push(newCharacter);
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    alert(`"${name}" 캐릭터가 추가되었습니다!`);
}

function updatePageText(pageIndex, newText) {
    console.log(`🔄 updatePageText 호출: 페이지 ${pageIndex + 1}, 텍스트 길이: ${newText.length}`);
    
    if (newText.trim()) {
        const text = newText.trim();
        
        // 현재 언어가 한국어면 기본 text에 저장
        if (currentLanguage === 'ko') {
            const oldText = currentStorybook.pages[pageIndex].text;
            currentStorybook.pages[pageIndex].text = text;
            console.log(`📝 한국어 텍스트 업데이트: "${oldText?.substring(0, 30)}..." → "${text.substring(0, 30)}..."`);
        } else {
            // 다른 언어면 translations에 저장
            if (!currentStorybook.translations) {
                currentStorybook.translations = {};
            }
            if (!currentStorybook.translations[currentLanguage]) {
                // 기존 pages를 복사해서 translations 초기화
                currentStorybook.translations[currentLanguage] = currentStorybook.pages.map(p => ({
                    pageNumber: p.pageNumber,
                    text: p.text || ''
                }));
            }
            
            // 해당 페이지의 번역 텍스트 업데이트
            const translatedPage = currentStorybook.translations[currentLanguage].find(p => p.pageNumber === currentStorybook.pages[pageIndex].pageNumber);
            if (translatedPage) {
                const oldText = translatedPage.text;
                translatedPage.text = text;
                console.log(`📝 ${currentLanguage} 번역 텍스트 업데이트: "${oldText?.substring(0, 30)}..." → "${text.substring(0, 30)}..."`);
            }
        }
        
        saveCurrentStorybook();
        console.log(`✅ 페이지 ${pageIndex + 1} 텍스트 저장 완료 (${currentLanguage})`);
        console.log(`💾 저장된 텍스트:`, currentStorybook.pages[pageIndex].text?.substring(0, 50));
    } else {
        console.warn(`⚠️ 빈 텍스트는 저장하지 않음: 페이지 ${pageIndex + 1}`);
    }
}

// 디바운스된 텍스트 업데이트 (타이핑 중 자동 저장)
let textUpdateTimeouts = {};
function debouncedUpdatePageText(pageIndex, newText) {
    // 기존 타이머 취소
    if (textUpdateTimeouts[pageIndex]) {
        clearTimeout(textUpdateTimeouts[pageIndex]);
    }
    
    // 1초 후 저장
    textUpdateTimeouts[pageIndex] = setTimeout(() => {
        updatePageText(pageIndex, newText);
    }, 1000);
}


// 장면 통합 설명 업데이트
function updateSceneCombined(pageIndex, combinedText) {
    if (!combinedText || !combinedText.trim()) return;
    
    const text = combinedText.trim();
    currentStorybook.pages[pageIndex].scene_description = text;
    
    // scene_structure는 더 이상 별도로 관리하지 않음
    // 모든 정보를 scene_description에 통합
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} 장면 설명 업데이트됨`);
}

// 장면 구조 필드 업데이트 (캐릭터/배경/분위기)
function updateSceneStructure(pageIndex, field, value) {
    if (!currentStorybook.pages[pageIndex].scene_structure) {
        currentStorybook.pages[pageIndex].scene_structure = {};
    }
    currentStorybook.pages[pageIndex].scene_structure[field] = value.trim();
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} ${field} 업데이트: ${value}`);
}

// 페이지별 캐릭터 레퍼런스 토글
function togglePageCharacterRef(pageIndex, charIndex, checked) {
    if (!currentStorybook.pages[pageIndex].characterRefs) {
        currentStorybook.pages[pageIndex].characterRefs = [];
    }
    
    const refs = currentStorybook.pages[pageIndex].characterRefs;
    if (checked) {
        if (!refs.includes(charIndex)) {
            refs.push(charIndex);
        }
    } else {
        const idx = refs.indexOf(charIndex);
        if (idx > -1) {
            refs.splice(idx, 1);
        }
    }
    
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} 캐릭터 레퍼런스 업데이트:`, refs);
}

// TTS 설정 업데이트
function updateTTSConfig(pageIndex, config) {
    if (!config || !config.trim()) return;
    
    currentStorybook.pages[pageIndex].ttsConfig = config.trim();
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} TTS 설정 업데이트: ${config}`);
}

// 전체 페이지용 Gemini TTS 모델 업데이트
function updatePageGeminiTTSModel(value) {
    imageSettings.geminiTTSModel = value;
    console.log(`✅ Gemini TTS 모델 변경:`, value);
    
    // 알림 표시
    const modelName = value.replace('gemini-', 'Gemini ').replace('-tts', ' TTS');
    showNotification(`Gemini TTS 모델이 ${modelName}로 변경되었습니다`, 'success');
}

// 전체 페이지용 TTS 음성 업데이트 (모든 TTS 생성 시 사용)
function updateGlobalTTSModel(value) {
    imageSettings.ttsModel = value;
    console.log(`✅ 전체 페이지 TTS 음성 변경:`, value);
    
    // 알림 표시
    showNotification(`TTS 음성이 ${value}로 변경되었습니다`, 'success');
}

// 페이지별 TTS 모델 업데이트 (설명 동적 업데이트)
function updatePageTTSModelDescription(pageIndex, value) {
    currentStorybook.pages[pageIndex].ttsModel = value;
    saveCurrentStorybook();
    console.log(`✅ 페이지 ${pageIndex + 1} TTS 모델 변경:`, value);
    
    // 선택한 모델의 설명을 동적으로 업데이트 (전체 리렌더링 안 함)
    const modelInfo = TTS_MODELS.find(m => m.value === value);
    const descElement = document.getElementById(`tts-model-desc-${pageIndex}`);
    if (descElement && modelInfo) {
        descElement.innerHTML = `<i class="fas fa-info-circle mr-1 text-blue-500"></i>${modelInfo.description}`;
    }
}

// 기존 함수명 유지 (호환성)
function updatePageTTSModel(pageIndex, value) {
    updatePageTTSModelDescription(pageIndex, value);
}

// 학습 단어 프롬프트 업데이트
function updateVocabularyPrompt(value) {
    currentStorybook.vocabularyPrompt = value.trim();
    saveCurrentStorybook();
    console.log('✅ 학습 단어 프롬프트 업데이트:', value);
}

// 삽화 업로드 모달 관련 변수
let currentUploadPageIndex = null;
let currentUploadCharIndex = null;
let currentUploadType = 'illustration'; // 'illustration', 'character', 'cover'
let currentUploadTab = 'file';

// 일괄 업로드 관련 변수
let batchUploadCancelled = false;
let batchUploadInProgress = false;

// 삽화 업로드 모달 열기
function openIllustrationUploadModal(pageIndex) {
    currentUploadPageIndex = pageIndex;
    currentUploadCharIndex = null;
    currentUploadType = 'illustration';
    const modal = document.getElementById('illustrationUploadModal');
    const title = modal.querySelector('h2');
    title.innerHTML = '<i class="fas fa-upload mr-3 text-blue-600"></i>삽화 이미지 업로드';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // 기본 탭으로 설정
    switchUploadTab('file');
}

// 캐릭터 레퍼런스 업로드 모달 열기
function openCharacterUploadModal(charIndex) {
    currentUploadPageIndex = null;
    currentUploadCharIndex = charIndex;
    currentUploadType = 'character';
    const modal = document.getElementById('illustrationUploadModal');
    const title = modal.querySelector('h2');
    title.innerHTML = '<i class="fas fa-upload mr-3 text-purple-600"></i>캐릭터 레퍼런스 업로드';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // 기본 탭으로 설정
    switchUploadTab('file');
}

// 표지 업로드 모달 열기
function openCoverImageUploadModal() {
    currentUploadPageIndex = null;
    currentUploadCharIndex = null;
    currentUploadType = 'cover';
    const modal = document.getElementById('illustrationUploadModal');
    const title = modal.querySelector('h2');
    title.innerHTML = '<i class="fas fa-upload mr-3 text-indigo-600"></i>표지 이미지 업로드';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // 기본 탭으로 설정
    switchUploadTab('file');
}

// 삽화 업로드 모달 닫기
function closeIllustrationUploadModal() {
    const modal = document.getElementById('illustrationUploadModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // 입력 초기화
    document.getElementById('illustrationFileInput').value = '';
    document.getElementById('illustrationUrlInput').value = '';
    currentUploadPageIndex = null;
    currentUploadCharIndex = null;
    currentUploadType = 'illustration';
}

// 업로드 탭 전환
function switchUploadTab(tab) {
    currentUploadTab = tab;
    
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

// 삽화/캐릭터/표지 업로드 실행
async function uploadIllustration() {
    const uploadBtn = document.getElementById('uploadIllustrationBtn');
    const originalText = uploadBtn.innerHTML;
    
    try {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>업로드 중...';
        
        let imageUrl = null;
        
        if (currentUploadTab === 'file') {
            // 파일 업로드
            const fileInput = document.getElementById('illustrationFileInput');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('파일을 선택해주세요.');
                return;
            }
            
            // 이미지를 R2에 업로드
            const formData = new FormData();
            formData.append('image', file);
            formData.append('storybookId', currentStorybook.id);
            formData.append('storybookTitle', currentStorybook.title);
            formData.append('type', currentUploadType);
            
            if (currentUploadType === 'illustration' && currentUploadPageIndex !== null) {
                formData.append('pageNumber', currentStorybook.pages[currentUploadPageIndex].pageNumber);
            } else if (currentUploadType === 'character' && currentUploadCharIndex !== null) {
                formData.append('characterIndex', currentUploadCharIndex);
                formData.append('characterName', currentStorybook.characters[currentUploadCharIndex].name);
            } else if (currentUploadType === 'cover') {
                // 표지는 pageNumber 불필요
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
        if (currentUploadType === 'illustration' && currentUploadPageIndex !== null) {
            // 페이지 삽화 - 히스토리 관리
            const page = currentStorybook.pages[currentUploadPageIndex];
            
            // 기존 이미지가 있으면 히스토리에 추가
            if (page.illustrationImage) {
                if (!page.illustrationHistory) {
                    page.illustrationHistory = [];
                }
                page.illustrationHistory.unshift(page.illustrationImage);
                console.log(`📸 이전 이미지를 히스토리에 추가 (총 ${page.illustrationHistory.length}개)`);
                
                // 히스토리 10개 제한
                if (page.illustrationHistory.length > 10) {
                    page.illustrationHistory.splice(10);
                }
            }
            
            page.illustrationImage = imageUrl;
        } else if (currentUploadType === 'character' && currentUploadCharIndex !== null) {
            // 캐릭터 레퍼런스
            currentStorybook.characters[currentUploadCharIndex].referenceImage = imageUrl;
        } else if (currentUploadType === 'cover') {
            // 표지
            currentStorybook.coverImage = imageUrl;
        }
        
        saveCurrentStorybook();
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        
        // 모달 닫기
        closeIllustrationUploadModal();
        
        const uploadTypeText = currentUploadType === 'illustration' ? '삽화' : 
                               currentUploadType === 'character' ? '캐릭터 레퍼런스' : '표지';
        showNotification('success', '업로드 완료', `${uploadTypeText} 이미지가 업로드되었습니다.`);
        
    } catch (error) {
        console.error('업로드 오류:', error);
        alert('업로드 실패: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalText;
    }
}

// 일괄 업로드 모달 열기
function openBatchUploadModal() {
    if (!currentStorybook || !currentStorybook.pages) {
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
        
        // 가나다순으로 파일 정렬
        files.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        
        const totalPages = currentStorybook.pages.length;
        
        if (files.length > totalPages) {
            if (!confirm(`선택한 파일(${files.length}개)이 페이지 수(${totalPages}개)보다 많습니다. 처음 ${totalPages}개만 업로드하시겠습니까?`)) {
                return;
            }
            files.splice(totalPages);
        }
        
        if (!confirm(`${files.length}개의 이미지를 페이지 1부터 순서대로 업로드하시겠습니까?`)) {
            return;
        }
        
        await batchUploadIllustrations(files);
    };
    
    input.click();
}

// 일괄 업로드 실행
async function batchUploadIllustrations(files) {
    batchUploadCancelled = false;
    batchUploadInProgress = true;
    
    const btn = document.getElementById('batch-upload-btn');
    const originalHTML = btn.innerHTML;
    
    let successCount = 0;
    let failCount = 0;
    
    try {
        for (let i = 0; i < files.length; i++) {
            if (batchUploadCancelled) {
                showNotification('warning', '업로드 취소', `${successCount}개 업로드 완료, ${files.length - i}개 취소됨`);
                break;
            }
            
            const file = files[i];
            const pageIndex = i;
            
            // 버튼 업데이트 (애니메이션 효과)
            btn.innerHTML = `
                <i class="fas fa-spinner fa-spin text-xl"></i>
                <span class="animate-pulse">${i + 1}/${files.length} 업로드 중...</span>
                <button onclick="cancelBatchUpload()" class="ml-2 px-2 py-1 bg-red-500 rounded hover:bg-red-600 text-xs">
                    취소
                </button>
            `;
            
            try {
                // 이미지를 R2에 업로드
                const formData = new FormData();
                formData.append('image', file);
                formData.append('storybookId', currentStorybook.id);
                formData.append('storybookTitle', currentStorybook.title);
                formData.append('type', 'illustration');
                formData.append('pageNumber', currentStorybook.pages[pageIndex].pageNumber);
                
                const response = await axios.post('/api/upload-image', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                if (response.data.success) {
                    const page = currentStorybook.pages[pageIndex];
                    
                    // 기존 이미지가 있으면 히스토리에 추가
                    if (page.illustrationImage) {
                        if (!page.illustrationHistory) {
                            page.illustrationHistory = [];
                        }
                        page.illustrationHistory.unshift(page.illustrationImage);
                        
                        // 히스토리 10개 제한
                        if (page.illustrationHistory.length > 10) {
                            page.illustrationHistory.splice(10);
                        }
                    }
                    
                    page.illustrationImage = response.data.imageUrl;
                    successCount++;
                    console.log(`✅ 페이지 ${pageIndex + 1} 업로드 완료:`, file.name);
                } else {
                    failCount++;
                    console.error(`❌ 페이지 ${pageIndex + 1} 업로드 실패:`, file.name);
                }
            } catch (error) {
                failCount++;
                console.error(`❌ 페이지 ${pageIndex + 1} 업로드 오류:`, error.message);
            }
            
            // 진행률 표시 (0.5초 대기)
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 저장 및 UI 업데이트
        if (successCount > 0) {
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
        }
        
        // 결과 알림
        if (failCount === 0 && !batchUploadCancelled) {
            showNotification('success', '업로드 완료', `${successCount}개의 삽화가 업로드되었습니다.`);
        } else if (successCount > 0) {
            showNotification('warning', '일부 업로드 완료', `성공: ${successCount}개, 실패: ${failCount}개`);
        } else {
            showNotification('error', '업로드 실패', '모든 이미지 업로드에 실패했습니다.');
        }
        
    } catch (error) {
        console.error('일괄 업로드 오류:', error);
        showNotification('error', '업로드 오류', error.message);
    } finally {
        btn.innerHTML = originalHTML;
        batchUploadInProgress = false;
        batchUploadCancelled = false;
    }
}

// 일괄 업로드 취소
function cancelBatchUpload() {
    if (batchUploadInProgress) {
        batchUploadCancelled = true;
        console.log('⏹️ 일괄 업로드 취소 요청');
    }
}

// 삽화 히스토리에서 선택
function selectIllustrationFromHistory(pageIndex, historyIndex) {
    if (!currentStorybook || !currentStorybook.pages[pageIndex]) return;
    
    const page = currentStorybook.pages[pageIndex];
    const history = page.illustrationHistory || [];
    
    if (historyIndex >= history.length) return;
    
    const selectedImage = history[historyIndex];
    
    // 현재 이미지를 히스토리 맨 앞에 추가
    history.splice(historyIndex, 1); // 선택된 항목 제거
    history.unshift(page.illustrationImage); // 현재 이미지를 맨 앞에 추가
    
    // 선택된 이미지를 현재 이미지로 설정
    page.illustrationImage = selectedImage;
    
    // 10개 제한 유지
    if (history.length > 10) {
        history.splice(10);
    }
    
    page.illustrationHistory = history;
    
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    showNotification('success', '이미지 변경', '이전 버전으로 변경되었습니다.');
}

// 오디오 다운로드
async function downloadAudio(audioUrl, filename) {
    try {
        const downloadUrl = `/api/download-image?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`;
        
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showNotification('success', '다운로드 완료', filename + '이 다운로드되었습니다.');
    } catch (error) {
        console.error('다운로드 오류:', error);
        alert('다운로드 실패: ' + error.message);
    }
}

// 모든 오디오 다운로드
async function downloadAllAudio() {
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    // 현재 언어의 TTS가 있는 페이지만 필터링
    const pagesWithAudio = currentStorybook.pages.filter(page => getPageTTS(page, currentLanguage));
    
    if (pagesWithAudio.length === 0) {
        alert('생성된 TTS가 없습니다. 먼저 TTS를 생성해주세요.');
        return;
    }
    
    // 언어 이름 가져오기
    const languageNames = {
        ko: '한국어',
        en: 'English',
        zh: '中文',
        ja: '日本語',
        es: 'Español',
        fr: 'Français'
    };
    const langName = languageNames[currentLanguage] || currentLanguage;
    
    if (!confirm(`${langName} TTS ${pagesWithAudio.length}개의 오디오 파일을 다운로드하시겠습니까?`)) {
        return;
    }
    
    let downloadCount = 0;
    
    for (let i = 0; i < pagesWithAudio.length; i++) {
        const page = pagesWithAudio[i];
        const audioUrl = getPageTTS(page, currentLanguage);
        const filename = `${currentStorybook.title}_${currentLanguage}_페이지_${page.pageNumber}.wav`;
        
        try {
            await downloadAudio(audioUrl, filename);
            downloadCount++;
            
            // 다운로드 간 약간의 지연 (브라우저 제한 방지)
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`페이지 ${page.pageNumber} 다운로드 실패:`, error);
        }
    }
    
    showNotification('success', '일괄 다운로드 완료', `${langName} ${downloadCount}개의 오디오 파일이 다운로드되었습니다.`);
}

// 전체 TTS 일괄 업로드
async function openBatchTTSUploadModal() {
    if (!currentStorybook || !currentStorybook.pages || currentStorybook.pages.length === 0) {
        alert('동화책 페이지가 없습니다.');
        return;
    }
    
    // 파일 입력 요소 생성
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) {
            return;
        }
        
        // 페이지를 페이지 번호순으로 정렬 (이미 정렬되어 있지만 확인)
        const sortedPages = [...currentStorybook.pages].sort((a, b) => a.pageNumber - b.pageNumber);
        
        // 파일을 이름순으로 정렬 (가나다순)
        files.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        
        // 개수 확인
        if (files.length !== sortedPages.length) {
            const proceed = confirm(
                `⚠️ 파일 개수(${files.length}개)와 페이지 개수(${sortedPages.length}개)가 일치하지 않습니다.\n\n` +
                `순서대로 매칭:\n` +
                sortedPages.slice(0, Math.min(files.length, 5)).map((page, i) => 
                    `${i + 1}. ${files[i]?.name || '없음'} → 페이지 ${page.pageNumber}`
                ).join('\n') +
                (sortedPages.length > 5 ? `\n...\n` : '') +
                `\n계속하시겠습니까?`
            );
            
            if (!proceed) {
                return;
            }
        }
        
        await batchUploadTTSFiles(files, sortedPages);
    };
    
    input.click();
}

// TTS 파일 일괄 업로드 실행
async function batchUploadTTSFiles(files, sortedPages) {
    console.log(`📤 TTS 일괄 업로드 시작: ${files.length}개 파일`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 진행 상황 표시
    showNotification('info', '업로드 중', `TTS 파일을 업로드하는 중입니다... (0/${files.length})`);
    
    for (let i = 0; i < Math.min(files.length, sortedPages.length); i++) {
        const file = files[i];
        const page = sortedPages[i];
        
        try {
            console.log(`📤 업로드 중 (${i + 1}/${files.length}): ${file.name} → 페이지 ${page.pageNumber}`);
            
            // 파일을 Base64로 변환
            const base64Audio = await fileToBase64(file);
            
            // 서버에 업로드
            const response = await axios.post('/api/upload-audio', {
                audioData: base64Audio,
                filename: `${currentStorybook.id}_page_${page.pageNumber}.wav`,
                storybookId: currentStorybook.id,
                storybookTitle: currentStorybook.title
            });
            
            if (response.data.success && response.data.audioUrl) {
                // 해당 페이지의 audioUrl 업데이트
                const pageIndex = currentStorybook.pages.findIndex(p => p.pageNumber === page.pageNumber);
                if (pageIndex !== -1) {
                    currentStorybook.pages[pageIndex].audioUrl = response.data.audioUrl;
                }
                
                successCount++;
                console.log(`✅ 페이지 ${page.pageNumber} 업로드 성공`);
            } else {
                throw new Error(response.data.error || '업로드 실패');
            }
            
            // 진행 상황 업데이트
            showNotification('info', '업로드 중', `TTS 파일을 업로드하는 중입니다... (${i + 1}/${files.length})`);
            
        } catch (error) {
            console.error(`❌ 페이지 ${page.pageNumber} 업로드 실패:`, error);
            failCount++;
        }
    }
    
    // 저장 및 UI 업데이트
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    // 결과 알림
    if (failCount === 0) {
        showNotification('success', '업로드 완료!', `${successCount}개의 TTS 파일이 성공적으로 업로드되었습니다.`);
    } else {
        showNotification('warning', '업로드 완료', `성공: ${successCount}개, 실패: ${failCount}개`);
    }
    
    console.log(`✅ TTS 일괄 업로드 완료 - 성공: ${successCount}, 실패: ${failCount}`);
}

// 전체 삽화 텍스트 다운로드
async function downloadAllIllustrationTexts() {
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    if (!confirm(`${currentStorybook.pages.length}개 페이지의 텍스트를 다운로드하시겠습니까?`)) {
        return;
    }
    
    // 텍스트 파일 생성 (페이지 텍스트만)
    let content = `동화책: ${currentStorybook.title}\n`;
    content += `생성 일시: ${new Date().toLocaleString('ko-KR')}\n`;
    content += `총 페이지: ${currentStorybook.pages.length}\n`;
    content += `=`.repeat(80) + '\n\n';
    
    currentStorybook.pages.forEach((page, idx) => {
        content += `📖 페이지 ${page.pageNumber}\n`;
        content += `${page.text || '(텍스트 없음)'}\n\n`;
    });
    
    // Blob 생성 및 다운로드
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStorybook.title}_페이지텍스트.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('success', '다운로드 완료', `${currentStorybook.pages.length}개 페이지의 텍스트가 다운로드되었습니다.`);
}

// 단어 업데이트 함수
function updateVocabularyWord(wordIndex, newValue, field = 'word') {
    if (newValue.trim()) {
        const vocab = currentStorybook.educational_content.vocabulary[wordIndex];
        
        // 객체 형식인지 확인
        if (typeof vocab === 'object') {
            vocab[field] = newValue.trim();
        } else {
            // 문자열이면 객체로 변환
            if (field === 'word') {
                currentStorybook.educational_content.vocabulary[wordIndex] = {
                    word: newValue.trim(),
                    korean: ''
                };
            }
        }
        
        // 해당 단어의 이미지도 업데이트 (있다면)
        if (currentStorybook.vocabularyImages && currentStorybook.vocabularyImages[wordIndex]) {
            const word = typeof currentStorybook.educational_content.vocabulary[wordIndex] === 'object' 
                ? currentStorybook.educational_content.vocabulary[wordIndex].word 
                : currentStorybook.educational_content.vocabulary[wordIndex];
            currentStorybook.vocabularyImages[wordIndex].word = word;
        }
        
        saveCurrentStorybook();
    }
}

// 한 번에 모든 캐릭터 레퍼런스 생성 (병렬 처리)
async function generateAllCharacterReferences() {
    const toGenerate = currentStorybook.characters.filter(char => !char.referenceImage);
    
    if (toGenerate.length === 0) {
        alert('모든 캐릭터 레퍼런스가 이미 생성되었습니다.');
        return;
    }
    
    if (!confirm(`${toGenerate.length}개의 캐릭터 레퍼런스를 동시에 생성하시겠습니까?\n\n예상 소요 시간: 약 8초`)) {
        return;
    }
    
    // 모든 캐릭터의 로딩 상태 표시
    currentStorybook.characters.forEach((char, i) => {
        if (!char.referenceImage) {
            const refDiv = document.getElementById(`char-ref-${i}`);
            if (refDiv) {
                refDiv.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-3"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div><p class="text-white text-sm font-semibold">AI가 이미지 생성 중...</p><p class="text-white text-xs opacity-75 mt-1">실패 시 자동으로 재시도합니다</p></div>';
            }
        }
    });
    
    try {
        // 모든 캐릭터를 병렬로 생성
        const promises = currentStorybook.characters.map(async (char, i) => {
            try {
                const promptTextarea = document.getElementById(`char-prompt-${i}`);
                const customPrompt = promptTextarea ? promptTextarea.value.trim() : char.description;
                
                console.log(`🎨 캐릭터 "${char.name}" 이미지 생성 시작 (배치 생성)`);
                
                // 🔥 서버 API 호출 (R2 업로드 포함)
                console.log(`📤 API 요청 - storybookId: ${currentStorybook.id}, title: ${currentStorybook.title}`);
                
                const response = await axios.post('/api/generate-character-image', {
                    character: {
                        name: char.name,
                        description: customPrompt,
                        age: char.age
                    },
                    artStyle: currentStorybook.artStyle || '디즈니 스타일',
                    settings: {
                        aspectRatio: '16:9',
                        enforceNoText: true,
                        characterModel: imageSettings.characterModel || 'gemini-3-pro-image-preview'
                    },
                    storybookId: currentStorybook.id,
                    storybookTitle: currentStorybook.title
                });
                
                if (response.data.success && response.data.imageUrl) {
                    const imageUrl = response.data.imageUrl; // R2 URL
                    console.log(`📥 API 응답 - imageUrl: ${imageUrl}`);
                    currentStorybook.characters[i].referenceImage = imageUrl;
                    console.log(`✅ 캐릭터 "${char.name}" 이미지 생성 완료 (R2 업로드 포함)`);
                    return { index: i, success: true, imageUrl: imageUrl };
                } else {
                    throw new Error(response.data.error || '이미지 URL을 받지 못했습니다.');
                }
            } catch (error) {
                console.error(`❌ 캐릭터 ${i} 생성 실패:`, error);
                
                // 서버 응답에서 상세 에러 메시지 추출
                let errorMessage = '이미지 생성 실패';
                if (error.response && error.response.data) {
                    if (error.response.data.error) {
                        errorMessage = error.response.data.error;
                        console.error('📡 서버 에러 메시지:', errorMessage);
                    } else if (error.response.data.message) {
                        errorMessage = error.response.data.message;
                        console.error('📡 서버 에러 메시지:', errorMessage);
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                return { index: i, success: false, error: errorMessage };
            }
        });
        
        const results = await Promise.all(promises);
        
        // 결과 저장
        saveCurrentStorybook();
        
        // 각 캐릭터의 이미지 div만 업데이트 (텍스트 필드는 유지)
        results.forEach(result => {
            if (result.success) {
                const refDiv = document.getElementById(`char-ref-${result.index}`);
                if (refDiv) {
                    const char = currentStorybook.characters[result.index];
                    refDiv.innerHTML = `<img src="${result.imageUrl}" alt="${char.name}" class="w-full h-full object-cover rounded-lg"/>`;
                    
                    // 다운로드 버튼 추가
                    const charCard = refDiv.closest('.character-card');
                    if (charCard) {
                        const existingDownloadBtn = charCard.querySelector('.download-char-btn');
                        if (!existingDownloadBtn) {
                            const promptTextarea = charCard.querySelector(`#char-prompt-${result.index}`);
                            if (promptTextarea) {
                                const downloadBtn = document.createElement('button');
                                downloadBtn.className = 'w-full bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition mb-2 download-char-btn';
                                downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>이미지 다운로드';
                                downloadBtn.onclick = () => downloadImage(result.imageUrl, `캐릭터_${char.name}.png`);
                                promptTextarea.parentNode.insertBefore(downloadBtn, promptTextarea);
                            }
                        }
                    }
                }
            } else if (!result.success) {
                // 실패한 경우 에러 표시
                const refDiv = document.getElementById(`char-ref-${result.index}`);
                if (refDiv) {
                    refDiv.innerHTML = `
                        <div class="p-4 text-center">
                            <p class="text-white text-xs mt-2">⚠️ 이미지 생성 실패</p>
                            <p class="text-white text-xs opacity-75 mt-1">${result.error}</p>
                            <button onclick="generateCharacterReference(${result.index})" class="mt-2 px-3 py-1 bg-white text-purple-600 rounded text-xs">재시도</button>
                        </div>
                    `;
                }
            }
        });
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (failCount > 0) {
            alert(`캐릭터 레퍼런스 생성/재생성 완료!\n성공: ${successCount}개\n실패: ${failCount}개`);
        } else {
            alert(`모든 캐릭터 레퍼런스 생성/재생성이 완료되었습니다! (${successCount}개)`);
        }
    } catch (error) {
        console.error('Batch generation error:', error);
        alert('배치 생성 중 오류가 발생했습니다: ' + error.message);
        // 에러 시에도 UI 전체를 다시 그리지 않음
    }
}

// 캐릭터 레퍼런스 생성
async function generateCharacterReference(charIndex) {
    const character = currentStorybook.characters[charIndex];
    const refDiv = document.getElementById(`char-ref-${charIndex}`);
    
    const promptTextarea = document.getElementById(`char-prompt-${charIndex}`);
    const customPrompt = promptTextarea ? promptTextarea.value.trim() : character.description;
    
    refDiv.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-3"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div><p class="text-white text-sm font-semibold">AI가 이미지 생성 중...</p><p class="text-white text-xs opacity-75 mt-1">실패 시 자동으로 재시도합니다</p></div>';

    try {
        // 재생성 여부 판단 (기존 이미지가 있으면 재생성 모드)
        const isRegeneration = !!character.referenceImage;
        
        // 클라이언트에서 직접 Gemini API 호출
        const prompt = buildCharacterPrompt(customPrompt, currentStorybook.artStyle, imageSettings, isRegeneration);
        
        // 재생성인 경우 기존 이미지를 레퍼런스로 추가
        const refImageUrls = [];
        if (character.referenceImage) {
            console.log('🔄 캐릭터 재생성 모드: 기존 이미지를 레퍼런스로 추가');
            refImageUrls.push(character.referenceImage);
        }
        
        console.log(`🎨 캐릭터 "${character.name}" 이미지 생성 ${isRegeneration ? '(재생성 모드 - 사용자 수정사항 반영)' : '(초기 생성)'}`);
        console.log('🤖 사용 모델:', imageSettings.characterModel || 'gemini-3-pro-image-preview');
        console.log('📝 프롬프트:', customPrompt.substring(0, 100) + '...');
        if (refImageUrls.length > 0) {
            console.log('🖼️ 참조 이미지:', refImageUrls.length, '개');
        }
        
        // 🔥 서버 API 호출 (R2 업로드 포함)
        console.log(`📤 단일 생성 API 요청 - storybookId: ${currentStorybook.id}, title: ${currentStorybook.title}`);
        
        const response = await axios.post('/api/generate-character-image', {
            character: {
                name: character.name,
                description: customPrompt,
                age: character.age
            },
            artStyle: currentStorybook.artStyle || '디즈니 스타일',
            settings: {
                aspectRatio: '16:9',
                enforceNoText: true,
                characterModel: imageSettings.characterModel || 'gemini-3-pro-image-preview'
            },
            storybookId: currentStorybook.id,
            storybookTitle: currentStorybook.title
        });
        
        if (response.data.success && response.data.imageUrl) {
            const imageUrl = response.data.imageUrl; // R2 URL
            console.log(`📥 단일 생성 API 응답 - imageUrl: ${imageUrl}`);
            
            // 히스토리에 추가 (최대 10개 유지)
            if (!character.imageHistory) {
                character.imageHistory = [];
            }
            
            // 현재 이미지가 있으면 히스토리에 추가
            if (character.referenceImage) {
                character.imageHistory.unshift(character.referenceImage);
                
                // 10개 초과 시 가장 오래된 이미지 삭제 요청
                if (character.imageHistory.length > 10) {
                    const oldestImageUrl = character.imageHistory[10];
                    
                    // 서버에 삭제 요청 (비동기, 실패해도 계속 진행)
                    if (oldestImageUrl && oldestImageUrl.includes('r2.dev')) {
                        axios.delete('/api/cleanup-image', {
                            data: { imageUrl: oldestImageUrl }
                        }).catch(err => {
                            console.warn('⚠️ 히스토리 이미지 삭제 실패:', err.message);
                        });
                    }
                    
                    // 배열에서 제거
                    character.imageHistory = character.imageHistory.slice(0, 10);
                    console.log('🗑️ 오래된 히스토리 이미지 정리 완료');
                }
            }
            
            currentStorybook.characters[charIndex].referenceImage = imageUrl;
            saveCurrentStorybook();
            
            // UI 업데이트 - 히스토리 포함
            renderCharacterImageWithHistory(charIndex);
            
        } else {
            throw new Error(response.data.error || '이미지 URL을 받지 못했습니다.');
        }

    } catch (error) {
        console.error('Error:', error);
        
        let errorMsg = error.message || '알 수 없는 오류';
        
        // 서버에서 온 상세 에러 메시지 추출
        if (error.response && error.response.data && error.response.data.error) {
            errorMsg = error.response.data.error;
        }
        
        // API 키 관련 에러 처리
        if (errorMsg.includes('API key') || errorMsg.includes('403') || errorMsg.includes('PERMISSION_DENIED')) {
            errorMsg = 'API 키 오류: Gemini API 키가 만료되었거나 유효하지 않습니다. 새로운 API 키가 필요합니다.';
        }
        
        // 기존 이미지가 있으면 유지하고 에러 메시지만 표시
        if (character.referenceImage) {
            // UI 업데이트하여 기존 이미지 복원
            renderCharacterImageWithHistory(charIndex);
            // 에러 알림
            showNotification('error', '재생성 실패', `${errorMsg}\n기존 이미지가 유지됩니다.`);
        } else {
            // 기존 이미지가 없으면 재시도 버튼 표시
            refDiv.innerHTML = `
                <div class="p-4 text-center">
                    <i class="fas fa-exclamation-triangle text-white text-2xl mb-2"></i>
                    <p class="text-white text-xs font-bold mt-2">⚠️ 이미지 생성 실패</p>
                    <p class="text-white text-xs opacity-75 mt-1">${errorMsg}</p>
                    <button onclick="generateCharacterReference(${charIndex})" class="mt-3 px-4 py-2 bg-white text-purple-600 rounded text-xs font-semibold hover:bg-opacity-90 transition">
                        <i class="fas fa-redo mr-1"></i>재시도
                    </button>
                </div>
            `;
            
            // 알림도 표시
            showNotification('error', '생성 실패', errorMsg);
        }
    }
}

// 캐릭터 이미지를 히스토리와 함께 렌더링
function renderCharacterImageWithHistory(charIndex) {
    const character = currentStorybook.characters[charIndex];
    const refDiv = document.getElementById(`char-ref-${charIndex}`);
    
    if (!character.referenceImage) {
        refDiv.innerHTML = '<p class="text-white text-xs md:text-sm text-center p-4">이미지 생성 대기중</p>';
        return;
    }
    
    const history = character.imageHistory || [];
    
    let html = `
        <div class="flex gap-2 h-full">
            <!-- 메인 이미지 -->
            <div class="flex-1 relative group">
                <img src="${character.referenceImage}" alt="${character.name}" class="w-full h-full object-cover rounded-lg"/>
                <button 
                    onclick="downloadImage('${character.referenceImage}', '캐릭터_${character.name}.png')"
                    class="absolute top-2 right-2 bg-white bg-opacity-90 text-purple-600 w-10 h-10 rounded-full hover:bg-opacity-100 transition shadow-lg opacity-0 group-hover:opacity-100 flex items-center justify-center"
                    title="다운로드"
                >
                    <i class="fas fa-download"></i>
                </button>
            </div>
    `;
    
    if (history.length > 0) {
        html += `
            <!-- 히스토리 -->
            <div class="w-20 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-100">
                ${history.map((url, idx) => `
                    <div class="relative group cursor-pointer border-2 border-transparent hover:border-purple-400 rounded transition" onclick="selectCharacterImageFromHistory(${charIndex}, ${idx})">
                        <img src="${url}" alt="이전 ${idx + 1}" class="w-full h-16 object-cover rounded"/>
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                            <i class="fas fa-check text-white opacity-0 group-hover:opacity-100 transition"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    html += `</div>`;
    refDiv.innerHTML = html;
}

// 히스토리에서 이미지 선택
function selectCharacterImageFromHistory(charIndex, historyIndex) {
    const character = currentStorybook.characters[charIndex];
    const selectedImage = character.imageHistory[historyIndex];
    
    // 현재 이미지를 히스토리에 추가
    character.imageHistory.splice(historyIndex, 1); // 선택된 항목 제거
    character.imageHistory.unshift(character.referenceImage); // 현재 이미지를 맨 앞에 추가
    
    // 선택한 이미지를 현재 이미지로 설정
    character.referenceImage = selectedImage;
    
    saveCurrentStorybook();
    renderCharacterImageWithHistory(charIndex);
    
    showNotification('✅ 이미지가 변경되었습니다.', 'success');
}

// 병렬/순차 생성 모드 설명 표시
function showGenerationModeHelp(mode) {
    const helpContent = mode === 'parallel' ? `
        <div class="space-y-4">
            <h3 class="text-xl font-bold text-blue-600 mb-3">
                <i class="fas fa-bolt mr-2"></i>병렬 생성 (빠르게)
            </h3>
            
            <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">✨ 특징</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>모든 페이지를 <strong>동시에</strong> 생성</li>
                    <li>캐릭터 레퍼런스만 참조</li>
                    <li>빠른 속도로 전체 완성</li>
                </ul>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">⚡ 추천 상황</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li><strong>초안 확인:</strong> 스토리 전개와 장면 구성을 빠르게 확인</li>
                    <li><strong>테스트 생성:</strong> 그림체나 설정을 테스트</li>
                    <li><strong>시간 제약:</strong> 빠른 결과가 필요할 때</li>
                    <li><strong>독립적인 장면:</strong> 각 페이지가 독립적일 때</li>
                </ul>
            </div>
            
            <div class="bg-yellow-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">⚠️ 주의사항</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>장면 간 연속성이 약할 수 있음</li>
                    <li>캐릭터 포즈나 분위기 변화가 급격할 수 있음</li>
                </ul>
            </div>
            
            <div class="text-center text-sm text-gray-600 mt-4">
                <i class="fas fa-clock mr-1"></i>
                예상 시간: 약 <strong>${Math.ceil(currentStorybook.pages.filter(p => !p.illustrationImage).length / 5) * 8}초</strong>
            </div>
        </div>
    ` : `
        <div class="space-y-4">
            <h3 class="text-xl font-bold text-indigo-600 mb-3">
                <i class="fas fa-layer-group mr-2"></i>순차 생성 (정확하게)
            </h3>
            
            <div class="bg-indigo-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">✨ 특징</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>페이지를 <strong>하나씩 순서대로</strong> 생성</li>
                    <li>각 페이지가 <strong>바로 전 페이지를 자동 참조</strong></li>
                    <li>캐릭터 레퍼런스 + 전 페이지 이미지 조합</li>
                </ul>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">🎯 추천 상황</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li><strong>최종 출판물:</strong> 출판하거나 공유할 완성본</li>
                    <li><strong>연속성 중요:</strong> 인어공주처럼 변신 스토리나 시간 흐름</li>
                    <li><strong>일관성 중시:</strong> 캐릭터 포즈, 색감, 분위기의 연속성</li>
                    <li><strong>프로페셔널:</strong> 전문적인 품질이 필요할 때</li>
                </ul>
            </div>
            
            <div class="bg-purple-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">🌟 장점</h4>
                <ul class="list-disc list-inside text-gray-700 space-y-1 text-sm">
                    <li>높은 시각적 연속성</li>
                    <li>자연스러운 장면 전환</li>
                    <li>스토리 몰입도 향상</li>
                </ul>
            </div>
            
            <div class="text-center text-sm text-gray-600 mt-4">
                <i class="fas fa-clock mr-1"></i>
                예상 시간: 약 <strong>${currentStorybook.pages.filter(p => !p.illustrationImage).length * 8}초</strong>
            </div>
        </div>
    `;
    
    showModal('생성 모드 가이드', helpContent);
}

// 한 번에 모든 삽화 생성 - 병렬 (빠르게)
async function generateAllIllustrationsParallel() {
    const hasCharacterReferences = currentStorybook.characters.some(char => char.referenceImage);
    if (!hasCharacterReferences) {
        alert('먼저 캐릭터 레퍼런스 이미지를 생성해주세요!');
        return;
    }
    
    const pagesToGenerate = currentStorybook.pages.filter(page => !page.illustrationImage);
    
    if (pagesToGenerate.length === 0) {
        alert('이미 모든 페이지의 삽화가 생성되었습니다.');
        return;
    }
    
    const estimatedTime = Math.ceil(pagesToGenerate.length / 5) * 8; // 병렬로 약 5개씩 동시 처리
    if (!confirm(`${pagesToGenerate.length}개의 삽화를 병렬로 생성하시겠습니까?\n\n⚡ 빠른 생성: 모든 페이지를 동시에 생성합니다.\n⚠️ 주의: 연속성이 순차 생성보다 약할 수 있습니다.\n\n예상 소요 시간: 약 ${estimatedTime}초`)) {
        return;
    }
    
    // 캐릭터 레퍼런스 준비 (전체 캐릭터 객체 사용)
    const characterReferences = currentStorybook.characters
        .filter(char => char.referenceImage);
    
    // 모든 페이지의 로딩 상태 표시
    currentStorybook.pages.forEach((page, i) => {
        if (!page.illustrationImage) {
            const illustrationDiv = document.getElementById(`illustration-${i}`);
            if (illustrationDiv) {
                illustrationDiv.innerHTML = '<div class="min-h-[200px] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg"><div class="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mb-4"></div><p class="text-blue-800 text-base font-bold">⚡ 생성 중...</p><p class="text-blue-600 text-sm mt-2">병렬 생성 (빠르게)</p><p class="text-blue-500 text-xs mt-1">페이지 ' + (i + 1) + '</p></div>';
            }
        }
    });
    
    try {
        const promises = [];
        
        // 병렬로 모든 페이지 생성
        for (let i = 0; i < currentStorybook.pages.length; i++) {
            const page = currentStorybook.pages[i];
            
            // 이미 이미지가 있으면 건너뛰기
            if (page.illustrationImage) {
                continue;
            }
            
            const generatePromise = (async (pageIndex) => {
                try {
                    const sceneCombinedElem = document.getElementById(`scene-combined-${pageIndex}`);
                    const sceneDesc = sceneCombinedElem ? sceneCombinedElem.value : page.scene_description;
                    const artStyleElem = document.getElementById(`artstyle-${pageIndex}`);
                    const artStyle = artStyleElem ? artStyleElem.value : (page.artStyle || currentStorybook.artStyle);
                    
                    // scene-combined에서 장면 구조 파싱 (또는 기존 값 사용)
                    const sceneStructure = {
                        characters: page.scene_structure?.characters || '',
                        background: page.scene_structure?.background || '',
                        atmosphere: page.scene_structure?.atmosphere || ''
                    };
                    
                    // 클라이언트에서 직접 Gemini API 호출
                    const pageData = {
                        ...page,
                        scene_description: sceneDesc,
                        scene_structure: sceneStructure
                    };
                    
                    const prompt = buildIllustrationPrompt(pageData, artStyle, characterReferences, imageSettings, '');
                    
                    // 🎯 페이지에 등장하는 캐릭터 자동 감지
                    const pageText = page.text || '';
                    const sceneCharacters = (sceneStructure && sceneStructure.characters) || '';
                    const allText = `${pageText} ${sceneCharacters}`.toLowerCase();
                    
                    // 이 페이지에 등장하는 캐릭터만 필터링
                    const relevantCharacters = characterReferences.filter(char => {
                        const charName = char.name.toLowerCase();
                        return allText.includes(charName) || 
                               allText.includes(char.description.toLowerCase().split(' ')[0]);
                    });
                    
                    // 등장하지 않으면 모든 캐릭터 포함 (안전장치)
                    const filteredCharacterRefs = relevantCharacters.length > 0 ? relevantCharacters : characterReferences;
                    
                    // 레퍼런스 이미지 URL만 추출 (R2 URL 사용)
                    const refImageUrls = filteredCharacterRefs
                        .map(char => char.referenceImage)
                        .filter(url => url); // null/undefined 제거
                    
                    console.log(`📸 캐릭터 레퍼런스 이미지: ${refImageUrls.length}개`, refImageUrls);
                    
                    // 🔥 서버 API 호출 (R2 업로드 포함)
                    const response = await axios.post('/api/generate-illustration', {
                        page: pageData,
                        artStyle: artStyle,
                        characterReferences: refImageUrls, // URL 배열 전달
                        settings: {
                            ...imageSettings,
                            illustrationModel: imageSettings.illustrationModel || 'gemini-3-pro-image-preview'
                        },
                        storybookId: currentStorybook.id,
                        storybookTitle: currentStorybook.title
                    });
                    
                    if (response.data.success && response.data.imageUrl) {
                        const result = response.data; // R2 URL 포함
                        const page = currentStorybook.pages[pageIndex];
                        
                        // 기존 이미지가 있으면 히스토리에 추가
                        if (page.illustrationImage) {
                            if (!page.illustrationHistory) {
                                page.illustrationHistory = [];
                            }
                            page.illustrationHistory.unshift(page.illustrationImage);
                            
                            // 히스토리 10개 제한
                            if (page.illustrationHistory.length > 10) {
                                page.illustrationHistory.splice(10);
                            }
                        }
                        
                        currentStorybook.pages[pageIndex].illustrationImage = result.imageUrl;
                        currentStorybook.pages[pageIndex].scene_description = sceneDesc;
                        currentStorybook.pages[pageIndex].scene_structure = sceneStructure;
                        currentStorybook.pages[pageIndex].artStyle = artStyle;
                        
                        // 성공 표시
                        const illustrationDiv = document.getElementById(`illustration-${pageIndex}`);
                        if (illustrationDiv) {
                            illustrationDiv.innerHTML = `<img src="${result.imageUrl}" alt="Page ${page.pageNumber}" class="w-full h-full object-cover rounded-lg"/>`;
                        }
                        
                        return { success: true, pageIndex };
                    } else {
                        throw new Error(result.error || '이미지 생성 실패');
                    }
                } catch (error) {
                    console.error(`❌ 삽화 ${pageIndex} 생성 실패:`, error);
                    
                    // 서버 응답에서 상세 에러 메시지 추출
                    let errorMessage = '이미지 생성 실패';
                    if (error.response && error.response.data) {
                        if (error.response.data.error) {
                            errorMessage = error.response.data.error;
                            console.error('📡 서버 에러 메시지:', errorMessage);
                        } else if (error.response.data.message) {
                            errorMessage = error.response.data.message;
                            console.error('📡 서버 에러 메시지:', errorMessage);
                        }
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    // 실패 표시
                    const illustrationDiv = document.getElementById(`illustration-${pageIndex}`);
                    if (illustrationDiv) {
                        illustrationDiv.innerHTML = `
                            <div class="p-6 text-center">
                                <p class="text-red-600 text-sm mb-2 font-bold">⚠️ 생성 실패</p>
                                <p class="text-gray-700 text-xs">${errorMessage}</p>
                            </div>
                        `;
                    }
                    
                    return { success: false, pageIndex, error: error.message };
                }
            })(i);
            
            promises.push(generatePromise);
        }
        
        // 모든 병렬 생성 완료 대기
        const results = await Promise.all(promises);
        
        // 결과 저장
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (failCount > 0) {
            alert(`삽화 생성 완료!\n✅ 성공: ${successCount}개\n❌ 실패: ${failCount}개\n\n실패한 페이지는 개별적으로 재시도해주세요.`);
        } else {
            showNotification('success', '모든 삽화 생성 완료! ⚡', `${successCount}개의 페이지 삽화가 병렬로 생성되었습니다.`);
        }
    } catch (error) {
        console.error('Parallel generation error:', error);
        alert('병렬 생성 중 오류가 발생했습니다: ' + error.message);
        displayStorybook(currentStorybook);
    }
}

// 한 번에 모든 삽화 생성 - 순차 (정확하게)
async function generateAllIllustrationsSequential() {
    const hasCharacterReferences = currentStorybook.characters.some(char => char.referenceImage);
    if (!hasCharacterReferences) {
        alert('먼저 캐릭터 레퍼런스 이미지를 생성해주세요!');
        return;
    }
    
    const pagesToGenerate = currentStorybook.pages.filter(page => !page.illustrationImage);
    
    if (pagesToGenerate.length === 0) {
        alert('이미 모든 페이지의 삽화가 생성되었습니다.');
        return;
    }
    
    const estimatedTime = pagesToGenerate.length * 8; // 페이지당 약 8초
    if (!confirm(`${pagesToGenerate.length}개의 삽화를 순차적으로 생성하시겠습니까?\n\n⭐ 각 페이지가 바로 전 페이지를 참조하여 더 자연스러운 연속성을 만듭니다.\n\n예상 소요 시간: 약 ${estimatedTime}초`)) {
        return;
    }
    
    // 캐릭터 레퍼런스 준비 (전체 캐릭터 객체 사용)
    const characterReferences = currentStorybook.characters
        .filter(char => char.referenceImage);
    
    // 모든 페이지의 로딩 상태 표시
    currentStorybook.pages.forEach((page, i) => {
        if (!page.illustrationImage) {
            const illustrationDiv = document.getElementById(`illustration-${i}`);
            if (illustrationDiv) {
                illustrationDiv.innerHTML = '<div class="min-h-[200px] flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg"><div class="animate-pulse rounded-full h-20 w-20 bg-purple-300 mb-4"></div><p class="text-purple-800 text-base font-bold">🔷 대기 중...</p><p class="text-purple-600 text-sm mt-2">순차적으로 생성됩니다</p><p class="text-purple-500 text-xs mt-1">페이지 ' + (i + 1) + '</p></div>';
            }
        }
    });
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        // 순차적으로 페이지별 생성 (앞 페이지부터)
        for (let i = 0; i < currentStorybook.pages.length; i++) {
            const page = currentStorybook.pages[i];
            
            // 이미 이미지가 있으면 건너뛰기
            if (page.illustrationImage) {
                continue;
            }
            
            const illustrationDiv = document.getElementById(`illustration-${i}`);
            if (illustrationDiv) {
                illustrationDiv.innerHTML = `<div class="min-h-[200px] flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg"><div class="animate-spin rounded-full h-20 w-20 border-b-4 border-purple-600 mb-4"></div><p class="text-purple-800 text-base font-bold">🔷 페이지 ${page.pageNumber} 생성 중...</p><p class="text-purple-600 text-sm mt-2">${successCount + failCount + 1}/${pagesToGenerate.length}</p><p class="text-purple-500 text-xs mt-1">순차 생성 (정확하게)</p></div>`;
            }
            
            try {
                const sceneCombinedElem = document.getElementById(`scene-combined-${i}`);
                const sceneDesc = sceneCombinedElem ? sceneCombinedElem.value : page.scene_description;
                const artStyleElem = document.getElementById(`artstyle-${i}`);
                const artStyle = artStyleElem ? artStyleElem.value : (page.artStyle || currentStorybook.artStyle);
                
                // scene-combined에서 장면 구조 파싱 (또는 기존 값 사용)
                const sceneStructure = {
                    characters: page.scene_structure?.characters || '',
                    background: page.scene_structure?.background || '',
                    atmosphere: page.scene_structure?.atmosphere || ''
                };
                
                // 클라이언트에서 직접 Gemini API 호출
                const pageData = {
                    ...page,
                    scene_description: sceneDesc,
                    scene_structure: sceneStructure
                };
                
                const prompt = buildIllustrationPrompt(pageData, artStyle, characterReferences, imageSettings, '');
                
                // 🎯 페이지에 등장하는 캐릭터 자동 감지
                const pageText = page.text || '';
                const sceneCharacters = (sceneStructure && sceneStructure.characters) || '';
                const allText = `${pageText} ${sceneCharacters}`.toLowerCase();
                
                // 이 페이지에 등장하는 캐릭터만 필터링
                const relevantCharacters = characterReferences.filter(char => {
                    const charName = char.name.toLowerCase();
                    return allText.includes(charName) || 
                           allText.includes(char.description.toLowerCase().split(' ')[0]);
                });
                
                // 등장하지 않으면 모든 캐릭터 포함 (안전장치)
                const filteredCharacterRefs = relevantCharacters.length > 0 ? relevantCharacters : characterReferences;
                
                // 레퍼런스 이미지 URL만 추출 (R2 URL 사용)
                const refImageUrls = filteredCharacterRefs
                    .map(char => char.referenceImage)
                    .filter(url => url); // null/undefined 제거
                
                console.log(`📸 페이지 ${page.pageNumber} - 캐릭터 레퍼런스: ${refImageUrls.length}개`, refImageUrls);
                
                // ⭐ 바로 전 페이지의 이미지를 자동으로 참조 (연속성 향상)
                let previousPages = [];
                if (i > 0) {
                    const previousPage = currentStorybook.pages[i - 1];
                    if (previousPage && previousPage.illustrationImage) {
                        console.log(`📖 페이지 ${page.pageNumber}: 바로 전 페이지(${previousPage.pageNumber})의 이미지를 자동 참조`);
                        previousPages = [previousPage];
                    }
                }
                
                // 🔥 서버 API 호출 (R2 업로드 포함)
                const response = await axios.post('/api/generate-illustration', {
                    page: pageData,
                    artStyle: artStyle,
                    characterReferences: refImageUrls, // URL 배열 전달
                    settings: {
                        ...imageSettings,
                        illustrationModel: imageSettings.illustrationModel || 'gemini-3-pro-image-preview'
                    },
                    previousPages: previousPages,
                    storybookId: currentStorybook.id,
                    storybookTitle: currentStorybook.title
                });
                
                if (response.data.success && response.data.imageUrl) {
                    const result = response.data; // R2 URL 포함
                    const page = currentStorybook.pages[i];
                    
                    // 기존 이미지가 있으면 히스토리에 추가
                    if (page.illustrationImage) {
                        if (!page.illustrationHistory) {
                            page.illustrationHistory = [];
                        }
                        page.illustrationHistory.unshift(page.illustrationImage);
                        
                        // 히스토리 10개 제한
                        if (page.illustrationHistory.length > 10) {
                            page.illustrationHistory.splice(10);
                        }
                    }
                    
                    currentStorybook.pages[i].illustrationImage = result.imageUrl;
                    currentStorybook.pages[i].scene_description = sceneDesc;
                    currentStorybook.pages[i].scene_structure = sceneStructure;
                    currentStorybook.pages[i].artStyle = artStyle;
                    saveCurrentStorybook(); // 각 페이지마다 저장
                    successCount++;
                    
                    // 성공 표시
                    if (illustrationDiv) {
                        illustrationDiv.innerHTML = `<img src="${result.imageUrl}" alt="Page ${page.pageNumber}" class="w-full h-full object-cover rounded-lg"/>`;
                    }
                } else {
                    throw new Error(result.error || '이미지 생성 실패');
                }
            } catch (error) {
                console.error(`❌ 삽화 ${i} 생성 실패:`, error);
                failCount++;
                
                // 서버 응답에서 상세 에러 메시지 추출
                let errorMessage = '이미지 생성 실패';
                if (error.response && error.response.data) {
                    if (error.response.data.error) {
                        errorMessage = error.response.data.error;
                        console.error('📡 서버 에러 메시지:', errorMessage);
                    } else if (error.response.data.message) {
                        errorMessage = error.response.data.message;
                        console.error('📡 서버 에러 메시지:', errorMessage);
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                // 실패 표시
                if (illustrationDiv) {
                    illustrationDiv.innerHTML = `
                        <div class="p-6 text-center">
                            <p class="text-red-600 text-sm mb-2 font-bold">⚠️ 생성 실패</p>
                            <p class="text-gray-700 text-xs">${errorMessage}</p>
                        </div>
                    `;
                }
            }
        }
        
        // 최종 결과 표시 및 UI 업데이트
        displayStorybook(currentStorybook);
        
        if (failCount > 0) {
            alert(`삽화 생성 완료!\n✅ 성공: ${successCount}개\n❌ 실패: ${failCount}개\n\n실패한 페이지는 개별적으로 재시도해주세요.`);
        } else {
            showNotification('success', '모든 삽화 생성 완료! 🎯', `${successCount}개의 페이지 삽화가 순차적으로 생성되었습니다.`);
        }
    } catch (error) {
        console.error('Batch generation error:', error);
        alert('배치 생성 중 오류가 발생했습니다: ' + error.message);
        displayStorybook(currentStorybook);
    }
}

// 모든 TTS 생성 (순차적)
async function generateAllTTS() {
    if (!currentStorybook || !currentStorybook.pages || currentStorybook.pages.length === 0) {
        alert('동화책 페이지가 없습니다.');
        return;
    }
    
    // 현재 언어의 TTS가 없는 페이지 필터링
    const pagesToGenerate = currentStorybook.pages.filter(page => {
        const pageText = getPageText(page, currentLanguage);
        const pageTTS = getPageTTS(page, currentLanguage);
        
        // 디버깅 로그
        console.log(`📄 Page ${page.pageNumber}: text=${!!pageText && pageText.trim() !== ''}, tts=${!!pageTTS}`);
        
        // 텍스트가 있고 TTS가 없는 경우
        return pageText && pageText.trim() !== '' && !pageTTS;
    });
    
    if (pagesToGenerate.length === 0) {
        alert('이미 모든 페이지의 TTS가 생성되었습니다.');
        return;
    }
    
    const estimatedTime = pagesToGenerate.length * 3; // 페이지당 약 3초
    const geminiModel = imageSettings.geminiTTSModel || 'gemini-2.0-flash-exp';
    const geminiModelDisplay = geminiModel.replace('gemini-', 'Gemini ').replace('-exp', ' Exp').replace('-tts', ' TTS');
    if (!confirm(`${pagesToGenerate.length}개의 페이지 TTS를 생성하시겠습니까?\n\n모델: ${geminiModelDisplay}\n음성: ${imageSettings.ttsModel}\n언어: ${currentLanguage}\n예상 소요 시간: 약 ${estimatedTime}초`)) {
        return;
    }
    
    try {
        let successCount = 0;
        let failCount = 0;
        const totalPages = pagesToGenerate.length;
        
        console.log(`🎤 모든 TTS 생성 시작 (${totalPages}개 페이지, 언어: ${currentLanguage})`);
        
        // 순차적으로 페이지별 TTS 생성
        for (let i = 0; i < currentStorybook.pages.length; i++) {
            const page = currentStorybook.pages[i];
            const pageText = getPageText(page, currentLanguage);
            const pageTTS = getPageTTS(page, currentLanguage);
            
            // 텍스트가 없거나 이미 TTS가 있으면 건너뛰기
            if (!pageText || pageText.trim() === '' || pageTTS) {
                continue;
            }
            
            // 버튼 업데이트
            const ttsButton = document.getElementById(`tts-btn-${i}`);
            if (ttsButton) {
                ttsButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i>생성중 (${successCount + failCount + 1}/${totalPages})`;
                ttsButton.disabled = true;
            }
            
            try {
                console.log(`🎤 페이지 ${page.pageNumber} TTS 생성 중... (${currentLanguage})`);
                
                // TTS 생성 API 호출
                const response = await axios.post('/api/generate-tts', {
                    text: pageText,
                    language: currentLanguage,
                    geminiModel: imageSettings.geminiTTSModel || 'gemini-2.5-flash-preview-tts',  // Gemini TTS 생성 모델
                    model: imageSettings.ttsModel || 'Aoede',  // TTS Voice (Puck, Kore 등)
                    voiceConfig: imageSettings.ttsVoiceConfig,
                    storybookId: currentStorybook?.id,
                    storybookTitle: currentStorybook?.title,
                    pageNumber: page.pageNumber
                }, {
                    timeout: 180000 // 3분 타임아웃
                });
                
                if (response.data.success && response.data.audioUrl) {
                    // TTS 저장 (언어별로 저장)
                    if (!currentStorybook.pages[i].ttsAudio) {
                        currentStorybook.pages[i].ttsAudio = {};
                    }
                    
                    if (currentLanguage === 'ko') {
                        // 한국어는 기본 위치에 저장
                        currentStorybook.pages[i].ttsAudio.url = response.data.audioUrl;
                        currentStorybook.pages[i].ttsAudio.model = imageSettings.ttsModel;
                        currentStorybook.pages[i].audioUrl = response.data.audioUrl;
                    } else {
                        // 다른 언어는 언어 코드로 저장
                        if (!currentStorybook.pages[i].ttsAudio[currentLanguage]) {
                            currentStorybook.pages[i].ttsAudio[currentLanguage] = {};
                        }
                        currentStorybook.pages[i].ttsAudio[currentLanguage].url = response.data.audioUrl;
                        currentStorybook.pages[i].ttsAudio[currentLanguage].model = imageSettings.ttsModel;
                    }
                    
                    successCount++;
                    console.log(`✅ 페이지 ${page.pageNumber} TTS 생성 완료 (${currentLanguage})`);
                    
                    // 5페이지마다 중간 저장 및 1분 휴식
                    if (successCount % 5 === 0) {
                        try {
                            console.log(`💾 중간 저장 중... (${successCount}개 완료)`);
                            await saveToR2(currentStorybook);
                            console.log(`✅ 중간 저장 완료 (${successCount}개)`);
                        } catch (saveError) {
                            console.error(`⚠️ 중간 저장 실패 (TTS는 메모리에 유지):`, saveError.message);
                            // 저장 실패해도 계속 진행
                        }
                        
                        // API 할당량 보호를 위해 1분 휴식
                        if (successCount < totalPages) {
                            console.log(`⏸️ API 할당량 보호: 60초 대기 중... (${successCount}/${totalPages})`);
                            showNotification('info', '잠시 대기 중...', `API 할당량 보호를 위해 60초 대기합니다. (${successCount}/${totalPages} 완료)`);
                            
                            // 60초 대기
                            await new Promise(resolve => setTimeout(resolve, 60000));
                            
                            console.log(`✅ 대기 완료, 계속 진행합니다.`);
                        }
                    }
                } else {
                    throw new Error('TTS 생성 실패');
                }
                
            } catch (error) {
                failCount++;
                console.error(`❌ 페이지 ${page.pageNumber} TTS 생성 실패:`, error);
                
                // 에러 메시지 추출
                let errorMessage = error.message || '알 수 없는 오류';
                if (error.response?.data?.error) {
                    errorMessage = error.response.data.error;
                }
                
                // 할당량 초과 에러 감지
                if (errorMessage.includes('quota') || errorMessage.includes('Quota') || error.response?.status === 429) {
                    console.error('🚫 API 할당량 초과! 더 이상 진행할 수 없습니다.');
                    showNotification('error', 'API 할당량 초과', 'Gemini TTS API 일일 할당량을 초과했습니다. 내일 다시 시도하거나 Google AI Studio에서 할당량을 늘려주세요.');
                    
                    // 진행 중단
                    break;
                }
                
                // 버튼 복원
                if (ttsButton) {
                    ttsButton.innerHTML = '<i class="fas fa-volume-up mr-1"></i>음성 생성';
                    ttsButton.disabled = false;
                }
            }
        }
        
        // 최종 저장
        if (successCount > 0) {
            try {
                console.log('💾 최종 저장 중...');
                await saveToR2(currentStorybook);
                console.log('✅ 최종 저장 완료');
            } catch (saveError) {
                console.error('❌ 최종 저장 실패:', saveError);
                showNotification('warning', '저장 실패', 'TTS는 생성되었지만 최종 저장에 실패했습니다.');
            }
        }
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        
        // 결과 알림
        if (successCount > 0) {
            showNotification('success', '모든 TTS 생성 완료! 🎤', `${successCount}개의 페이지 음성이 생성되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`);
        } else if (failCount > 0) {
            // 모두 실패한 경우 상세 에러 메시지
            showNotification('error', 'TTS 생성 실패', `모든 페이지(${failCount}개)에서 TTS 생성에 실패했습니다. API 할당량을 확인해주세요.`);
        }
        
        console.log(`✅ 모든 TTS 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
        
    } catch (error) {
        console.error('TTS 배치 생성 오류:', error);
        alert('TTS 생성 중 오류가 발생했습니다: ' + error.message);
        displayStorybook(currentStorybook);
    }
}

// 페이지 삽화 생성
async function generateIllustration(pageIndex) {
    const page = currentStorybook.pages[pageIndex];
    const sceneCombinedElem = document.getElementById(`scene-combined-${pageIndex}`);
    const sceneDesc = sceneCombinedElem ? sceneCombinedElem.value : (page.scene_description || '');
    const artStyleElem = document.getElementById(`artstyle-${pageIndex}`);
    const artStyle = artStyleElem ? artStyleElem.value : currentStorybook.artStyle;
    const illustrationDiv = document.getElementById(`illustration-${pageIndex}`);
    
    // 수정사항 입력 필드 읽기
    const editNoteElem = document.getElementById(`edit-note-${pageIndex}`);
    const editNote = editNoteElem ? editNoteElem.value.trim() : '';
    
    // scene-combined에서 장면 구조 파싱
    const sceneStructure = {
        characters: '',
        background: '',
        atmosphere: ''
    };
    
    const characterReferences = currentStorybook.characters
        .filter(char => char.referenceImage)
        .map(char => ({
            name: char.name,
            description: char.description,
            referenceImage: char.referenceImage
        }));
    
    if (characterReferences.length === 0) {
        alert('먼저 캐릭터 레퍼런스 이미지를 생성해주세요!');
        return;
    }
    
    illustrationDiv.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-4"><div class="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-3"></div><p class="text-gray-600 text-sm font-semibold">AI가 삽화를 생성하는 중...</p><p class="text-gray-500 text-xs mt-1">실패 시 자동으로 재시도합니다</p></div>';

    try {
        // 클라이언트에서 직접 Gemini API 호출
        const pageData = {
            ...page,
            scene_description: sceneDesc,
            scene_structure: sceneStructure
        };
        
        const prompt = buildIllustrationPrompt(pageData, artStyle, characterReferences, imageSettings, editNote);
        
        // 레퍼런스 이미지 수집 전략 (사용자 요청: 재생성 시 제한 해제):
        // - 재생성 + editNote 있음: 모든 필요한 캐릭터 + 현재 이미지 + 전 페이지
        // - 재생성 + editNote 없음: 모든 필요한 캐릭터 + 전 페이지 + 현재 이미지
        // - 신규 생성: 모든 필요한 캐릭터 + 전 페이지 + 사용자 선택
        
        const isRegeneration = !!page.illustrationImage;
        const hasEditNote = editNote && editNote.trim().length > 0;
        
        // 🎯 페이지에 등장하는 캐릭터 자동 감지
        const pageText = page.text || '';
        const sceneCharacters = (sceneStructure && sceneStructure.characters) || '';
        const allText = `${pageText} ${sceneCharacters} ${editNote}`.toLowerCase();
        
        // 이 페이지에 등장하는 캐릭터만 필터링
        const relevantCharacters = characterReferences.filter(char => {
            const charName = char.name.toLowerCase();
            return allText.includes(charName) || 
                   allText.includes(char.description.toLowerCase().split(' ')[0]);
        });
        
        // 등장하지 않으면 모든 캐릭터 포함 (안전장치)
        const filteredCharacterRefs = relevantCharacters.length > 0 ? relevantCharacters : characterReferences;
        
        console.log(`👥 캐릭터 필터링: 전체 ${characterReferences.length}명 → 등장 ${filteredCharacterRefs.length}명`);
        if (filteredCharacterRefs.length < characterReferences.length) {
            console.log(`   등장 캐릭터: ${filteredCharacterRefs.map(c => c.name).join(', ')}`);
        }
        
        let refImageUrls = [];
        
        // 1. 등장하는 캐릭터 레퍼런스만 포함 (URL만 추출)
        refImageUrls = filteredCharacterRefs
            .map(char => char.referenceImage)
            .filter(url => url); // null/undefined 제거
        console.log(`👥 등장 캐릭터 레퍼런스: ${refImageUrls.length}개`, refImageUrls);
        
        // 2. 재생성 + 수정사항 있음 → 전 페이지 + 현재 이미지 (제한 해제)
        if (isRegeneration && hasEditNote) {
            console.log('🔄 재생성 모드 (수정사항 있음): 모든 참조 이미지 사용 (제한 해제)');
            // 바로 전 페이지
            if (pageIndex > 0) {
                const previousPage = currentStorybook.pages[pageIndex - 1];
                if (previousPage && previousPage.illustrationImage) {
                    refImageUrls.push(previousPage.illustrationImage);
                }
            }
            // 현재 이미지
            if (page.illustrationImage) {
                refImageUrls.push(page.illustrationImage);
            }
            // 사용자 선택 참조도 포함
            const selectedRefImages = getSelectedReferenceImages(pageIndex);
            if (selectedRefImages.length > 0) {
                console.log(`🖼️ ${selectedRefImages.length}개의 참조 이미지 추가`);
                selectedRefImages.forEach(refImg => {
                    if (refImg.imageUrl) {
                        refImageUrls.push(refImg.imageUrl);
                    }
                });
            }
        }
        // 3. 재생성 + 수정사항 없음 → 전 페이지 + 현재 이미지
        else if (isRegeneration && !hasEditNote) {
            console.log('🔄 재생성 모드 (변형): 전 페이지 + 현재 이미지 참조');
            // 바로 전 페이지
            if (pageIndex > 0) {
                const previousPage = currentStorybook.pages[pageIndex - 1];
                if (previousPage && previousPage.illustrationImage) {
                    refImageUrls.push(previousPage.illustrationImage);
                }
            }
            // 현재 이미지
            if (page.illustrationImage) {
                refImageUrls.push(page.illustrationImage);
            }
        }
        // 4. 신규 생성 → 전 페이지 + 사용자 선택
        else {
            console.log('✨ 신규 생성 모드: 전 페이지 + 사용자 선택 참조');
            // 바로 전 페이지
            if (pageIndex > 0) {
                const previousPage = currentStorybook.pages[pageIndex - 1];
                if (previousPage && previousPage.illustrationImage) {
                    console.log(`📖 바로 전 페이지(${pageIndex})의 이미지를 자동 참조`);
                    refImageUrls.push(previousPage.illustrationImage);
                }
            }
            
            // 사용자가 선택한 참조 이미지
            const selectedRefImages = getSelectedReferenceImages(pageIndex);
            if (selectedRefImages.length > 0) {
                console.log(`🖼️ ${selectedRefImages.length}개의 참조 이미지 추가`);
                selectedRefImages.forEach(refImg => {
                    if (refImg.imageUrl) {
                        refImageUrls.push(refImg.imageUrl);
                    }
                });
            }
        }
        
        console.log(`📊 최종 레퍼런스 이미지 개수: ${refImageUrls.length}`, refImageUrls);

        // 🔥 서버 API 호출 (R2 업로드 포함)
        const response = await axios.post('/api/generate-illustration', {
            page: pageData,
            artStyle: artStyle,
            characterReferences: refImageUrls, // URL 배열 전달
            settings: {
                ...imageSettings,
                illustrationModel: imageSettings.illustrationModel || 'gemini-3-pro-image-preview'
            },
            editNote: editNote,
            previousPages: pageIndex > 0 ? [currentStorybook.pages[pageIndex - 1]] : [],
            storybookId: currentStorybook.id,
            storybookTitle: currentStorybook.title
        });

        if (response.data.success && response.data.imageUrl) {
            const result = response.data; // R2 URL 포함
            const imageUrl = result.imageUrl;
            
            // 히스토리 관리: 기존 이미지가 있으면 히스토리에 추가
            const page = currentStorybook.pages[pageIndex];
            if (page.illustrationImage) {
                // 히스토리 배열 초기화
                if (!page.illustrationHistory) {
                    page.illustrationHistory = [];
                }
                
                // 현재 이미지를 히스토리 맨 앞에 추가
                page.illustrationHistory.unshift(page.illustrationImage);
                console.log(`📸 이전 이미지를 히스토리에 추가 (총 ${page.illustrationHistory.length}개)`);
                
                // 히스토리 10개 제한
                if (page.illustrationHistory.length > 10) {
                    const removed = page.illustrationHistory.splice(10);
                    console.log(`🗑️ 오래된 히스토리 ${removed.length}개 제거`);
                }
            }
            
            currentStorybook.pages[pageIndex].illustrationImage = imageUrl;
            currentStorybook.pages[pageIndex].scene_description = sceneDesc;
            currentStorybook.pages[pageIndex].scene_structure = sceneStructure;
            currentStorybook.pages[pageIndex].artStyle = artStyle;
            currentStorybook.pages[pageIndex].editNote = editNote; // 수정사항 저장
            saveCurrentStorybook();
            
            // displayStorybook을 호출하여 수정사항 입력 필드가 표시되도록 함
            displayStorybook(currentStorybook);
        } else {
            throw new Error(result.error || '이미지 URL을 받지 못했습니다.');
        }

    } catch (error) {
        console.error('❌ 삽화 생성 실패:', error);
        
        // 서버 응답에서 상세 에러 메시지 추출
        let errorMessage = '이미지 생성 실패';
        if (error.response && error.response.data) {
            if (error.response.data.error) {
                errorMessage = error.response.data.error;
                console.error('📡 서버 에러 메시지:', errorMessage);
            } else if (error.response.data.message) {
                errorMessage = error.response.data.message;
                console.error('📡 서버 에러 메시지:', errorMessage);
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        // 기존 이미지가 있으면 유지하고 에러 메시지만 표시
        if (page.illustrationImage) {
            // displayStorybook을 호출하여 기존 이미지 복원
            displayStorybook(currentStorybook);
            // 에러 알림
            showNotification('error', '재생성 실패', `${errorMessage}\n기존 이미지가 유지됩니다.`);
        } else {
            // 기존 이미지가 없으면 재시도 버튼 표시
            illustrationDiv.innerHTML = `
                <div class="p-6 text-center">
                    <p class="text-red-600 text-sm mb-2 font-bold">⚠️ 이미지 생성 실패</p>
                    <p class="text-gray-700 text-xs mb-2">${errorMessage}</p>
                    <button 
                        onclick="generateIllustration(${pageIndex})"
                        class="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                    >
                        <i class="fas fa-redo mr-2"></i>재시도
                    </button>
                </div>
            `;
        }
    }
}

function saveCurrentStorybook() {
    const index = storybooks.findIndex(b => b.id === currentStorybook.id);
    if (index !== -1) {
        storybooks[index] = currentStorybook;
    } else {
        storybooks.push(currentStorybook);
    }
    
    // ❌ localStorage 저장 제거
    // saveStorybooks(); // 더 이상 호출하지 않음
    
    renderBookList();
    
    // ✅ R2에만 저장 (비동기, 백그라운드)
    saveToR2(currentStorybook).catch(error => {
        console.error('R2 저장 실패:', error);
    });
}

// R2에 동화책 저장 (서버 API 호출) - 재시도 로직 포함
async function saveToR2(storybook, retryCount = 0) {
    const maxRetries = 3;
    
    try {
        console.log(`💾 R2 저장 시작: ${storybook.title}${retryCount > 0 ? ` (재시도 ${retryCount}/${maxRetries})` : ''}`);
        
        const response = await axios.post('/api/storybooks', storybook, {
            timeout: 300000, // 300초 타임아웃 (5분)
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.success) {
            console.log(`✅ R2 저장 완료: ${storybook.title}`);
            
            // 공개된 동화책이면 뷰어 메타데이터도 업데이트
            if (storybook.isPublic) {
                console.log('🔄 공개 동화책 - 뷰어 메타데이터 업데이트 중...');
                try {
                    const metaResponse = await axios.post('/api/viewer/refresh-metadata');
                    if (metaResponse.data.success) {
                        console.log('✅ 뷰어 메타데이터 업데이트 완료');
                    }
                } catch (metaError) {
                    console.warn('⚠️ 뷰어 메타데이터 업데이트 실패:', metaError.message);
                }
            }
            
            return true; // 성공
        } else {
            console.error('R2 저장 실패:', response.data.error);
            throw new Error(response.data.error || 'R2 저장 실패');
        }
    } catch (error) {
        console.error(`❌ R2 저장 오류 (시도 ${retryCount + 1}/${maxRetries + 1}):`, error.message);
        
        // 524 에러 또는 타임아웃인 경우 재시도
        const shouldRetry = (
            error.response?.status === 524 || 
            error.code === 'ECONNABORTED' || 
            error.message.includes('timeout')
        ) && retryCount < maxRetries;
        
        if (shouldRetry) {
            const waitTime = Math.min(5000 * Math.pow(2, retryCount), 30000); // 지수 백오프: 5초, 10초, 20초 (최대 30초)
            console.log(`⏳ ${waitTime/1000}초 후 재시도...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return saveToR2(storybook, retryCount + 1); // 재귀 호출
        } else {
            // 최대 재시도 횟수 초과 또는 재시도 불가능한 에러
            if (retryCount >= maxRetries) {
                console.error('❌ 최대 재시도 횟수 초과');
                showNotification('error', 'R2 저장 실패', `${maxRetries + 1}번의 시도 후에도 저장에 실패했습니다. 나중에 다시 시도해주세요.`);
            }
            throw error; // 에러 전파
        }
    }
}

// 미리보기 함수
function openPreview() {
    if (!currentStorybook) {
        alert('동화책이 없습니다.');
        return;
    }
    
    // 삽화가 있는 페이지만 필터링
    const pagesWithImages = currentStorybook.pages.filter(page => page.illustrationImage);
    
    if (pagesWithImages.length === 0) {
        alert('먼저 삽화를 생성해주세요!');
        return;
    }
    
    // 미리보기 데이터를 localStorage에 임시 저장
    const previewData = {
        title: currentStorybook.title,
        pages: pagesWithImages.map(page => ({
            pageNumber: page.pageNumber,
            text: page.text || '',
            illustrationImage: page.illustrationImage
        }))
    };
    
    localStorage.setItem('preview_data', JSON.stringify(previewData));
    
    // 새 창으로 미리보기 열기
    window.open('/preview.html', '_blank', 'width=1200,height=800');
}

// 다운로드 함수들
// 모든 캐릭터 레퍼런스 다운로드
async function downloadAllCharacterReferences() {
    const characters = currentStorybook.characters.filter(char => char.referenceImage);
    
    if (characters.length === 0) {
        alert('다운로드할 캐릭터 레퍼런스가 없습니다.');
        return;
    }
    
    for (const char of characters) {
        try {
            const filename = `캐릭터_${char.name}.png`;
            const downloadUrl = `/api/download-image?url=${encodeURIComponent(char.referenceImage)}&filename=${encodeURIComponent(filename)}`;
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 다운로드 간 짧은 지연
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error(`Download error for ${char.name}:`, error);
        }
    }
    
    showNotification('success', '다운로드 완료', `${characters.length}개의 캐릭터 레퍼런스를 다운로드했습니다.`);
}

async function downloadAllIllustrations() {
    const images = currentStorybook.pages
        .filter(page => page.illustrationImage)
        .map((page, idx) => ({
            url: page.illustrationImage,
            filename: `${currentStorybook.title}_page_${page.pageNumber}.png`
        }));
    
    if (images.length === 0) {
        alert('다운로드할 삽화가 없습니다.');
        return;
    }
    
    for (const img of images) {
        try {
            const downloadUrl = `/api/download-image?url=${encodeURIComponent(img.url)}&filename=${encodeURIComponent(img.filename)}`;
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = img.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error('Download error:', error);
        }
    }
    
    showNotification('success', '다운로드 완료', `${images.length}개의 삽화를 다운로드했습니다.`);
}

function downloadAllText() {
    if (!currentStorybook || !currentStorybook.pages || currentStorybook.pages.length === 0) {
        alert('다운로드할 텍스트가 없습니다.');
        return;
    }
    
    let textContent = `${currentStorybook.title}\n\n`;
    textContent += `대상 연령: ${currentStorybook.targetAge}세\n`;
    textContent += `그림체: ${currentStorybook.artStyle}\n\n`;
    textContent += `주제: ${currentStorybook.theme}\n\n`;
    textContent += `=`.repeat(50) + '\n\n';
    
    // 동화책 페이지
    currentStorybook.pages.forEach((page, idx) => {
        textContent += `[페이지 ${page.pageNumber}]\n${page.text}\n`;
        if (idx < currentStorybook.pages.length - 1) {
            textContent += '\n---\n\n';
        }
    });
    
    // 학습 단어 섹션 추가
    if (currentStorybook.educational_content && 
        currentStorybook.educational_content.vocabulary && 
        currentStorybook.educational_content.vocabulary.length > 0) {
        
        textContent += '\n\n' + `=`.repeat(50) + '\n';
        textContent += '영어 학습 단어\n';
        textContent += `=`.repeat(50) + '\n\n';
        
        currentStorybook.educational_content.vocabulary.forEach((vocabItem, idx) => {
            const word = typeof vocabItem === 'object' ? vocabItem.word : vocabItem;
            const korean = typeof vocabItem === 'object' ? vocabItem.korean : '';
            const definition = typeof vocabItem === 'object' ? vocabItem.definition : '';
            const exampleSentence = typeof vocabItem === 'object' ? vocabItem.example_sentence : '';
            
            textContent += `[영어] ${word}\n`;
            if (korean) textContent += `[한글] ${korean}\n`;
            if (definition) textContent += `[설명] ${definition}\n`;
            if (exampleSentence) textContent += `[예문] ${exampleSentence}\n`;
            
            if (idx < currentStorybook.educational_content.vocabulary.length - 1) {
                textContent += '\n---\n\n';
            }
        });
    }
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStorybook.title}_전체_텍스트.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('success', '다운로드 완료', `전체 텍스트를 다운로드했습니다.`);
}

// 전체 이미지 URL 다운로드
function downloadAllImageUrls() {
    if (!currentStorybook || !currentStorybook.pages || currentStorybook.pages.length === 0) {
        alert('다운로드할 이미지가 없습니다.');
        return;
    }
    
    let urlContent = '';
    
    // 페이지별 이미지 URL (URL만 한 줄씩)
    currentStorybook.pages.forEach((page) => {
        if (page.illustrationImage) {
            urlContent += `${page.illustrationImage}\n`;
        }
    });
    
    const imageCount = currentStorybook.pages.filter(p => p.illustrationImage).length;
    
    const blob = new Blob([urlContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStorybook.title}_이미지_URL.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('success', '다운로드 완료', `${imageCount}개의 이미지 URL을 다운로드했습니다.`);
}

// 전체 텍스트 번역 함수
async function translateAllText() {
    if (!currentStorybook || !currentStorybook.pages || currentStorybook.pages.length === 0) {
        alert('번역할 텍스트가 없습니다.');
        return;
    }
    
    const targetLanguage = document.getElementById('translationLanguage').value;
    const languageNames = {
        'en': 'English',
        'ja': '日本語',
        'zh': '中文',
        'es': 'Español',
        'fr': 'Français',
        'de': 'Deutsch',
        'vi': 'Tiếng Việt',
        'th': 'ไทย'
    };
    
    if (!confirm(`모든 페이지를 ${languageNames[targetLanguage]}로 번역하시겠습니까?\n\n이 작업은 약 ${Math.ceil(currentStorybook.pages.length * 2)}초 정도 소요됩니다.`)) {
        return;
    }
    
    // 로딩 표시
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'translation-loading';
    loadingDiv.className = 'fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50';
    loadingDiv.innerHTML = `
        <div class="bg-white rounded-lg p-8 max-w-md">
            <div class="flex flex-col items-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                <p class="text-lg font-semibold text-gray-800 mb-2">텍스트 번역 중...</p>
                <p class="text-sm text-gray-600">잠시만 기다려주세요</p>
            </div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    
    try {
        const response = await axios.post('/api/translate-storybook', {
            storybook: currentStorybook,
            targetLanguage: targetLanguage
        });
        
        if (response.data.success) {
            // 번역된 내용으로 업데이트
            currentStorybook.pages = response.data.translatedPages;
            currentStorybook.title = response.data.translatedTitle;
            
            if (response.data.translatedTheme) {
                currentStorybook.theme = response.data.translatedTheme;
            }
            
            // 저장 및 표시
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
            
            showNotification('success', '번역 완료!', `모든 텍스트가 ${languageNames[targetLanguage]}로 번역되었습니다.`);
        } else {
            throw new Error(response.data.error || '번역 실패');
        }
    } catch (error) {
        console.error('Translation error:', error);
        alert('번역 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
    } finally {
        // 로딩 제거
        if (document.getElementById('translation-loading')) {
            document.getElementById('translation-loading').remove();
        }
    }
}


async function downloadImage(imageUrl, filename) {
    try {
        const downloadUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
        
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error('Download error:', error);
        alert('이미지 다운로드에 실패했습니다.');
    }
}

// 참조 이미지 토글
function toggleReferenceImage(currentPageIdx, refPageIdx) {
    const checkbox = document.getElementById(`ref-check-${currentPageIdx}-${refPageIdx}`);
    const img = document.getElementById(`ref-img-${currentPageIdx}-${refPageIdx}`);
    
    if (checkbox && img) {
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            img.classList.remove('border-gray-300');
            img.classList.add('border-blue-500', 'ring-2', 'ring-blue-300');
        } else {
            img.classList.add('border-gray-300');
            img.classList.remove('border-blue-500', 'ring-2', 'ring-blue-300');
        }
    }
}

// 선택된 참조 이미지 가져오기
function getSelectedReferenceImages(pageIndex) {
    const selectedImages = [];
    
    // 1. 다른 페이지의 참조 이미지
    const pageCheckboxes = document.querySelectorAll(`input[id^="ref-check-${pageIndex}-"]:checked`);
    
    pageCheckboxes.forEach(checkbox => {
        const refPageIdx = parseInt(checkbox.id.split('-').pop());
        const refPage = currentStorybook.pages[refPageIdx];
        
        if (refPage && refPage.illustrationImage) {
            selectedImages.push({
                type: 'page',
                pageNumber: refPage.pageNumber,
                imageUrl: refPage.illustrationImage
            });
        }
    });
    
    // 2. Key Object 참조 이미지
    const keyObjCheckboxes = document.querySelectorAll(`input[id^="ref-keyobj-check-${pageIndex}-"]:checked`);
    
    keyObjCheckboxes.forEach(checkbox => {
        const objIdx = parseInt(checkbox.id.split('-').pop());
        const keyObjImage = currentStorybook.keyObjectImages && currentStorybook.keyObjectImages[objIdx];
        
        if (keyObjImage && keyObjImage.imageUrl) {
            selectedImages.push({
                type: 'key_object',
                name: keyObjImage.name,
                korean: keyObjImage.korean,
                imageUrl: keyObjImage.imageUrl
            });
        }
    });
    
    console.log(`📸 페이지 ${pageIndex + 1} - 선택된 참조 이미지:`, selectedImages.length, 
                `(페이지: ${selectedImages.filter(img => img.type === 'page').length}, Key Objects: ${selectedImages.filter(img => img.type === 'key_object').length})`);
    return selectedImages;
}


// 단어 이미지 생성 - 개별 단어 (캐릭터와 사물 일관성 강화)
async function generateSingleVocabularyImage(wordIndex) {
    if (!currentStorybook.educational_content || !currentStorybook.educational_content.vocabulary) {
        alert('단어 목록이 없습니다.');
        return;
    }
    
    const vocabItem = currentStorybook.educational_content.vocabulary[wordIndex];
    const word = typeof vocabItem === 'object' ? vocabItem.word : vocabItem;
    const korean = typeof vocabItem === 'object' ? vocabItem.korean : '';
    const vocabImgDiv = document.getElementById(`vocab-img-${wordIndex}`);
    
    vocabImgDiv.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-4"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-2"></div><p class="text-gray-600 text-xs">생성 중...</p></div>';
    
    try {
        // ⭐ 1. Key Objects에서 매칭 확인 (정확한 매칭만) - 우선 확인!
        // 8단어 이미지는 Key Object만 참조 (캐릭터 레퍼런스 제외)
        const matchingKeyObject = currentStorybook.key_objects && currentStorybook.key_objects.find((obj, idx) => {
            const hasImage = currentStorybook.keyObjectImages && currentStorybook.keyObjectImages[idx] && currentStorybook.keyObjectImages[idx].imageUrl;
            if (!hasImage) return false;
            
            const objNameLower = obj.name.toLowerCase().trim();
            const objKoreanLower = obj.korean.toLowerCase().trim();
            const wordLower = word.toLowerCase().trim();
            const koreanLower = korean.toLowerCase().trim();
            
            // 정확히 일치하는 경우만 매칭
            return objNameLower === wordLower || objKoreanLower === koreanLower;
        });
        
        const matchingKeyObjectIndex = matchingKeyObject ? currentStorybook.key_objects.indexOf(matchingKeyObject) : -1;
        
        // ⭐ 2. 매칭되는 Key Object 이미지가 있으면 재사용
        if (matchingKeyObject && matchingKeyObjectIndex >= 0) {
            const keyObjImage = currentStorybook.keyObjectImages[matchingKeyObjectIndex];
            if (keyObjImage && keyObjImage.imageUrl) {
                console.log(`✅ Reusing Key Object image for "${word}" (${korean}): ${matchingKeyObject.name}`);
                
                const imageUrl = keyObjImage.imageUrl;
                
                if (!currentStorybook.vocabularyImages) {
                    currentStorybook.vocabularyImages = new Array(currentStorybook.educational_content.vocabulary.length).fill(null);
                }
                
                currentStorybook.vocabularyImages[wordIndex] = {
                    word: word,
                    korean: korean,
                    imageUrl: imageUrl,
                    success: true,
                    isKeyObject: true,
                    reused: true
                };
                
                // ⭐ vocabulary 객체에도 image 필드 추가 (게임용)
                if (typeof currentStorybook.educational_content.vocabulary[wordIndex] === 'object') {
                    currentStorybook.educational_content.vocabulary[wordIndex].image = imageUrl;
                    console.log(`✅ Added reused image URL to vocabulary[${wordIndex}].image: ${imageUrl}`);
                }
                
                saveCurrentStorybook();
                
                const badge = '<span class="absolute top-1 right-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded">핵심사물</span>';
                vocabImgDiv.innerHTML = `<div class="relative w-full h-full">${badge}<img src="${imageUrl}" alt="${word}" class="w-full h-full object-cover rounded-lg"/></div>`;
                
                console.log(`✅ Vocabulary image reused from Key Object: ${word}`);
                return { index: wordIndex, success: true, imageUrl: imageUrl, reused: true };
            }
        }
        
        // ⭐ 4. 매칭되는 이미지가 없으면 새로 생성
        console.log(`🎨 Generating new image for "${word}" (${korean})`);
        
        // 이 단어가 주요 사물인지 확인 (scene_structure)
        const allKeyObjects = [];
        currentStorybook.pages.forEach(page => {
            if (page.scene_structure && page.scene_structure.key_objects) {
                allKeyObjects.push(page.scene_structure.key_objects);
            }
        });
        const isKeyObject = allKeyObjects.some(objDesc => 
            objDesc && objDesc.toLowerCase().includes(korean.toLowerCase())
        );
        
        let prompt;
        let referenceImages = [];
        
        // 8단어 이미지는 Key Object만 참조하므로 캐릭터 매칭 로직 제거됨
        // 주요 사물인 경우 - scene_structure의 key_objects 설명 활용
        if (isKeyObject) {
            console.log(`🔑 Key object found for "${word}" (${korean})`);
            
            // key_objects에서 관련 설명 찾기
            const objectDescription = allKeyObjects.find(objDesc => 
                objDesc && objDesc.toLowerCase().includes(korean.toLowerCase())
            );
            
            prompt = `Create a simple, clear, educational illustration for a children's vocabulary learning card showing an important story object.

**Object to Illustrate:** ${word}${korean ? ` (${korean})` : ''}

**Object Description from Story:**
${objectDescription || '이 동화에서 중요한 역할을 하는 사물입니다.'}

**Art Style:** ${currentStorybook.artStyle} style for children's book illustration.

**Requirements:**
- Show the object clearly and simply
- Clean white background
- **Match the visual description from the story above**
- Bright, vibrant colors
- Child-friendly, appealing design
- Age-appropriate for 4-8 years old
- Focus on the object's distinctive features as described
- Make it consistent with how it appears in the storybook illustrations

**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, or captions in the image. Show ONLY the visual representation.

Create a single, clear object illustration that matches the storybook's visual style.`;
        }
        // 일반 단어인 경우 - 기본 프롬프트
        else {
            console.log(`📝 General word: "${word}" (${korean})`);
            
            // vocabularyPrompt 참조
            const customPrompt = currentStorybook.vocabularyPrompt ? `\n\n**Additional Requirements:**\n${currentStorybook.vocabularyPrompt}` : '';
            
            prompt = `Create a simple, clear educational illustration of: ${word}${korean ? ` (${korean})` : ''}

Requirements:
- Single object or concept clearly shown
- Clean, white background
- High contrast and vibrant colors
- Professional, educational style
- Suitable for children ages 4-8
- Art style: ${currentStorybook.artStyle}${customPrompt}

**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, or captions in the image. Show ONLY the visual representation of the word.

Example: For "Apple", show only a red apple fruit. No text.`;
        }

        // 서버 API를 통해 이미지 생성 (보안)
        const response = await axios.post('/api/generate-vocabulary-images', {
            vocabularyItems: [{
                word: word,
                korean: korean,
                definition: vocabItem.definition || '',
                example: vocabItem.example || ''
            }],
            artStyle: currentStorybook.artStyle || '디즈니 스타일',
            settings: {
                aspectRatio: '16:9',
                enforceNoText: true,
                keyObjectModel: imageSettings.keyObjectModel || 'gemini-3-pro-image-preview'
            },
            customPrompt: prompt,
            storybookId: currentStorybook.id,
            storybookTitle: currentStorybook.title
        });
        
        if (response.data.success && response.data.results && response.data.results[0] && response.data.results[0].success) {
            const result = response.data.results[0];
            const imageUrl = result.imageUrl;
            
            // vocabularyImages 배열 초기화
            if (!currentStorybook.vocabularyImages) {
                currentStorybook.vocabularyImages = new Array(currentStorybook.educational_content.vocabulary.length).fill(null);
            }
            
            currentStorybook.vocabularyImages[wordIndex] = {
                word: word,
                korean: korean,
                imageUrl: imageUrl,
                success: true,
                isCharacter: false,  // 8단어는 캐릭터 매칭 안 함
                isKeyObject: isKeyObject
            };
            
            // ⭐ vocabulary 객체에도 image 필드 추가 (게임용)
            if (typeof currentStorybook.educational_content.vocabulary[wordIndex] === 'object') {
                currentStorybook.educational_content.vocabulary[wordIndex].image = imageUrl;
                console.log(`✅ Added image URL to vocabulary[${wordIndex}].image: ${imageUrl}`);
            }
            
            saveCurrentStorybook();
            
            // UI만 업데이트 (전체 재렌더링 안 함)
            const badge = isKeyObject ? '<span class="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">핵심사물</span>' : '';
            vocabImgDiv.innerHTML = `<div class="relative">${badge}<img src="${imageUrl}" alt="${word}" class="w-full h-full object-cover rounded-lg"/></div>`;
            
            return { index: wordIndex, success: true, imageUrl: imageUrl };
        } else {
            const errorMsg = response.data.error || result.error || '이미지 생성 실패';
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        console.error('Vocabulary image generation error:', error);
        
        let errorMsg = error.message || '알 수 없는 오류';
        
        // 서버 에러 메시지 추출
        if (error.response && error.response.data && error.response.data.error) {
            errorMsg = error.response.data.error;
        }
        
        vocabImgDiv.innerHTML = `
            <div class="p-4 text-center">
                <i class="fas fa-exclamation-triangle text-red-600 text-xl mb-2"></i>
                <p class="text-red-600 text-xs font-bold mb-2">⚠️ 생성 실패</p>
                <p class="text-gray-500 text-xs mb-3">${errorMsg}</p>
                <button 
                    onclick="generateSingleVocabularyImage(${wordIndex})"
                    class="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                >
                    <i class="fas fa-redo mr-1"></i>재시도
                </button>
            </div>
        `;
        return { index: wordIndex, success: false, error: error.message };
    }
}

// 모든 단어 이미지 생성 (병렬)
async function generateAllVocabularyImages() {
    if (!currentStorybook.educational_content || !currentStorybook.educational_content.vocabulary) {
        alert('단어 목록이 없습니다.');
        return;
    }
    
    const vocabulary = currentStorybook.educational_content.vocabulary;
    
    if (!confirm(`${vocabulary.length}개의 단어 이미지를 병렬로 생성하시겠습니까?\n\n모든 이미지가 동시에 생성되어 빠릅니다.`)) {
        return;
    }
    
    console.log('모든 단어 이미지를 병렬로 생성 시작...');
    
    // 병렬로 모든 이미지 생성
    const promises = vocabulary.map((_, index) => 
        generateSingleVocabularyImage(index)
    );
    
    // 모든 생성 완료 대기
    const results = await Promise.all(promises);
    
    // 결과 집계
    const successCount = results.filter(r => r && r.success).length;
    const failCount = results.filter(r => r && !r.success).length;
    
    if (failCount > 0) {
        alert(`단어 이미지 생성 완료!\n\n성공: ${successCount}개\n실패: ${failCount}개\n\n실패한 이미지는 개별적으로 재시도할 수 있습니다.`);
    } else {
        alert(`모든 단어 이미지 생성이 완료되었습니다! (${successCount}개)`);
    }
}

// 모든 단어 이미지 다운로드
async function downloadAllVocabularyImages() {
    if (!currentStorybook.vocabularyImages || currentStorybook.vocabularyImages.length === 0) {
        alert('다운로드할 단어 이미지가 없습니다.');
        return;
    }
    
    const images = currentStorybook.vocabularyImages
        .filter(vocab => vocab && vocab.imageUrl)
        .map(vocab => ({
            url: vocab.imageUrl,
            filename: `단어_${vocab.word}.png`
        }));
    
    if (images.length === 0) {
        alert('다운로드할 단어 이미지가 없습니다.');
        return;
    }
    
    for (const img of images) {
        try {
            const downloadUrl = `/api/download-image?url=${encodeURIComponent(img.url)}&filename=${encodeURIComponent(img.filename)}`;
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = img.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error('Download error:', error);
        }
    }
    
    showNotification('success', '다운로드 완료', `${images.length}개의 단어 이미지를 다운로드했습니다.`);
}

// 기존 함수 (호환성 유지)
async function generateVocabularyImages() {
    await generateAllVocabularyImages();
}

function viewVocabularyImage(index) {
    if (currentStorybook.vocabularyImages && currentStorybook.vocabularyImages[index]) {
        const vocabImg = currentStorybook.vocabularyImages[index];
        if (vocabImg && vocabImg.imageUrl) {
            window.open(vocabImg.imageUrl, '_blank');
        }
    }
}

// ===== 프롬프트 생성 함수들 =====

/**
 * 캐릭터 이미지 생성 프롬프트 빌드
 * @param {string} description - 캐릭터 설명
 * @param {string} artStyle - 그림체 스타일
 * @param {object} settings - 이미지 설정
 * @param {boolean} isRegeneration - 재생성 여부 (기존 이미지가 있는 경우)
 * @returns {string} - 완성된 프롬프트
 */
function buildCharacterPrompt(description, artStyle, settings, isRegeneration = false) {
    const noTextPrompt = settings.enforceNoText ? 
        '\n\n**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, captions, or titles anywhere in the image. Absolutely NO TEXT of any kind.' : 
        '\n\n**NO TEXT:** Do NOT include any text, labels, words, letters, or captions in the image.';
    
    // 재생성 안내 (기존 이미지가 있는 경우)
    const regenerationNote = isRegeneration ? 
        '\n\n**🔄 REGENERATION MODE - CRITICAL INSTRUCTIONS:**\n' +
        '**YOU MUST USE THE PROVIDED REFERENCE IMAGE AS YOUR PRIMARY GUIDE.**\n' +
        '1. CAREFULLY ANALYZE the reference image to understand:\n' +
        '   - Current character design, facial features, body proportions\n' +
        '   - Exact colors (clothing, hair, skin tone, accessories)\n' +
        '   - Art style, line work, and shading technique\n' +
        '   - Overall visual identity and character personality\n' +
        '2. MAINTAIN these exact elements from the reference:\n' +
        '   - Core character design and recognizability\n' +
        '   - Color palette (unless explicitly changed in description)\n' +
        '   - Art style consistency\n' +
        '3. ONLY modify what is explicitly mentioned in the updated character description below.\n' +
        '4. Keep everything else EXACTLY THE SAME as the reference image.\n' +
        '5. The goal is to make a recognizable update, not create a completely new character.\n\n' +
        '**Priority Order:**\n' +
        '1st: Reference Image (base design)\n' +
        '2nd: Updated Character Description (modifications only)\n' +
        '3rd: Art Style (already established in reference)' : 
        '';
    
    const prompt = `Create a professional character design reference sheet for a children's storybook character.

**Character Description:** ${description}
${regenerationNote}

**Art Style:** ${artStyle} style for children's book illustration, suitable for ages 4-8.

**Reference Sheet Layout:**
1. **Center (Front View):** Full-body front view of the character in a neutral standing pose. Show all details clearly.
2. **Side Views:** Three-quarter view and side profile showing the character's proportions and features from different angles.
3. **Expressions:** Three different facial expressions showing the character's personality and emotional range (happy, surprised, thoughtful).
4. **Details:** Clear, consistent details of clothing, colors, and distinctive features that make this character unique and recognizable.

**Background:** Clean white background with subtle grid or guidelines.

**Art Quality:** High-detail, professional children's book illustration quality. Vibrant, appealing colors. Clear, consistent character design suitable for multiple illustrations.

**Character Age Range:** Design appropriate for a children's storybook (ages 4-8).

**Image Aspect Ratio:** ${settings.aspectRatio}
${settings.additionalPrompt ? `\n\n**Additional Instructions:** ${settings.additionalPrompt}` : ''}
${noTextPrompt}`;

    return prompt;
}

/**
 * 페이지 삽화 이미지 생성 프롬프트 빌드
 * @param {object} page - 페이지 객체
 * @param {string} artStyle - 그림체 스타일
 * @param {Array<string>} characterReferences - 캐릭터 레퍼런스 이미지 URL 배열
 * @param {object} settings - 이미지 설정
 * @param {string} editNote - 수정사항 (선택)
 * @returns {string} - 완성된 프롬프트
 */
function buildIllustrationPrompt(page, artStyle, characterReferences, settings, editNote = '') {
    // 재생성 모드 확인
    const isRegeneration = !!page.illustrationImage;
    const hasEditNote = editNote && editNote.trim().length > 0;
    
    // 🎯 페이지에 등장하는 캐릭터 자동 감지
    const pageText = page.text || '';
    const sceneCharacters = (page.scene_structure && page.scene_structure.characters) || '';
    const editNoteText = editNote || '';
    
    // 모든 관련 텍스트 합치기
    const allText = `${pageText} ${sceneCharacters} ${editNoteText}`.toLowerCase();
    
    // 이 페이지에 등장하는 캐릭터만 필터링
    const relevantCharacters = characterReferences.filter(char => {
        const charName = char.name.toLowerCase();
        // 캐릭터 이름이나 설명이 텍스트에 포함되어 있는지 확인
        return allText.includes(charName) || 
               allText.includes(char.description.toLowerCase().split(' ')[0]); // 설명의 첫 단어
    });
    
    // 등장하지 않으면 모든 캐릭터 포함 (안전장치)
    const filteredCharacters = relevantCharacters.length > 0 ? relevantCharacters : characterReferences;
    
    console.log(`👥 캐릭터 필터링: 전체 ${characterReferences.length}명 → 등장 ${filteredCharacters.length}명`);
    if (filteredCharacters.length < characterReferences.length) {
        console.log(`   등장 캐릭터: ${filteredCharacters.map(c => c.name).join(', ')}`);
    }
    
    // 전체 스토리 맥락 구성 (재생성 시 제한)
    let storyContext = '';
    let previousPageNote = '';
    
    // 재생성 + editNote가 있으면 스토리 컨텍스트 생략 (타임아웃 방지)
    if (!isRegeneration || !hasEditNote) {
        if (currentStorybook && currentStorybook.pages) {
            const previousPages = currentStorybook.pages
                .filter(p => p.pageNumber < page.pageNumber)
                .sort((a, b) => a.pageNumber - b.pageNumber);
            
            if (previousPages.length > 0) {
                // 최근 3페이지만 포함 (타임아웃 방지)
                const recentPages = previousPages.slice(-3);
                console.log(`📖 Including story context from ${recentPages.length} recent pages (limited for performance)`);
                const previousTexts = recentPages
                    .map(p => `Page ${p.pageNumber}: ${p.text}`)
                    .join('\n');
                
                // 바로 전 페이지 강조
                const immediatelyPreviousPage = previousPages[previousPages.length - 1];
                if (immediatelyPreviousPage && immediatelyPreviousPage.illustrationImage) {
                    previousPageNote = `\n\n**🎨 PREVIOUS PAGE REFERENCE (Page ${immediatelyPreviousPage.pageNumber}):**
I have provided the illustration from the immediately previous page as a reference image. Use it to maintain visual continuity and art style.`;
                }
                
                storyContext = `\n\n**RECENT STORY CONTEXT:**
${previousTexts}

**CURRENT PAGE ${page.pageNumber}:** ${page.text}
${previousPageNote}`;
            }
        }
    } else {
        console.log('📖 Skipping story context (regeneration with editNote - timeout prevention)');
    }
    
    let characterInfo = '';
    
    // 캐릭터 레퍼런스 정보 추가 (필터링된 캐릭터만)
    if (filteredCharacters.length > 0 && settings.enforceCharacterConsistency) {
        characterInfo = '\n\n**Character References (MUST FOLLOW EXACTLY):**\n';
        characterInfo += 'You have been provided with character reference images. ';
        
        if (settings.enforceCharacterConsistency) {
            characterInfo += '**ABSOLUTE REQUIREMENT:** Recreate each character PIXEL-FOR-PIXEL from the reference images. ';
            characterInfo += 'Match EXACTLY: facial features, body proportions, clothing, colors, hairstyle, and all visual details. ';
            characterInfo += 'The characters in this illustration MUST be visually identical to the reference images.\n\n';
        }
        
        filteredCharacters.forEach((char, index) => {
            if (char.referenceImage) {
                characterInfo += `${index + 1}. **${char.name}:** ${char.description}\n`;
                if (settings.enforceCharacterConsistency) {
                    characterInfo += `   - **CRITICAL:** Use reference image to ensure ABSOLUTE PIXEL-PERFECT consistency.\n`;
                    characterInfo += `   - Match ALL visual details from the reference image exactly.\n`;
                }
            }
        });
    }
    
    // 장면 구조 정보 추가
    let sceneDetails = '';
    if (page.scene_structure) {
        sceneDetails = `\n\n**Scene Structure:**
- **Characters & Actions:** ${page.scene_structure.characters}
- **Background Setting:** ${page.scene_structure.background}
- **Mood & Atmosphere:** ${page.scene_structure.atmosphere}`;
    }
    
    const noTextPrompt = settings.enforceNoText ? 
        '\n\n**CRITICAL - NO TEXT:** Do NOT include ANY text, labels, words, letters, captions, titles, speech bubbles, or text overlays in the image. Absolutely NO TEXT of any kind. Pure illustration only.' : 
        '\n\n**IMPORTANT:** Do NOT include any text, labels, words, letters, or captions in the image. No speech bubbles, no titles, no text overlays. Pure illustration only.';
    
    // 재생성 안내 (기존 이미지가 있는 경우) - isRegeneration은 이미 위에서 선언됨
    const regenerationNote = isRegeneration ? 
        '\n\n**🔄 REGENERATION MODE - CRITICAL INSTRUCTIONS:**\n' +
        '**YOU ARE REGENERATING AN EXISTING ILLUSTRATION WITH USER\'S SPECIFIC MODIFICATIONS.**\n\n' +
        '**STEP 1 - ANALYZE REFERENCE IMAGES:**\n' +
        '1. CAREFULLY study the provided reference images:\n' +
        '   - Current illustration (what it looks like now)\n' +
        '   - Character reference sheets (how characters should look)\n' +
        '   - Selected reference pages (additional context)\n' +
        '   - Overall composition, color palette, and art style\n\n' +
        '**STEP 2 - READ MODIFICATION REQUEST:**\n' +
        (editNote ? 
        '2. User\'s modification request:\n' +
        `   "${editNote}"\n\n` +
        '   **YOUR TASK:**\n' +
        '   - CREATE the scene based on this modification request\n' +
        '   - USE the reference images to maintain:\n' +
        '     • Character visual consistency (faces, clothing, proportions)\n' +
        '     • Art style and color palette\n' +
        '     • Overall composition quality\n' +
        '   - IGNORE the original scene description below\n' +
        '   - FOCUS on what the user wants to see\n\n' : 
        '2. No specific modification request provided.\n' +
        '   - Create a slightly varied version\n' +
        '   - Keep characters and composition similar\n' +
        '   - Maintain art style consistency\n\n') +
        '**⚠️ CRITICAL REQUIREMENTS:**\n' +
        '• Characters MUST be visually IDENTICAL to reference sheets\n' +
        '• Follow the modification request (not the original scene description)\n' +
        '• Reference images are for VISUAL STYLE only, not for scene content\n' +
        '• Create what the user wants to see now\n\n' +
        '**Priority Order for REGENERATION:**\n' +
        '1st: User\'s Modification Request (what to create)\n' +
        '2nd: Character Reference Sheets (how characters look)\n' +
        '3rd: Reference Images (visual style guide)\n' +
        '4th: Art Style (maintain consistency)\n\n' +
        '**IGNORE these during regeneration:**\n' +
        '❌ Original scene description (shown below for reference only)\n' +
        '❌ Original scene structure (outdated)\n' : 
        '';
    
    const prompt = `Create a beautiful, professional illustration for a children's storybook page.
${storyContext}

${isRegeneration && editNote ? 
`**🎯 YOUR TASK (Regeneration with Modification):**
${editNote}

**Reference Information (for visual style only):**
- Original scene description: ${page.scene_description}
${sceneDetails ? `${sceneDetails}` : ''}

**IMPORTANT:** Create the scene based on the modification request above, NOT the original scene description. Use the original description only to understand context.` 
: 
isRegeneration ? 
`**🎯 YOUR TASK (Regeneration - Variation):**
Create a slight variation of the current illustration while maintaining the same scene.

**Scene Description:** ${page.scene_description}
${sceneDetails}` 
: 
`**Main Scene Description:** ${page.scene_description}
${sceneDetails}`}
${characterInfo}
${regenerationNote}

**Art Style:** ${artStyle} style for children's book illustration.

**Image Aspect Ratio:** ${settings.aspectRatio}
${isRegeneration ? '\n**⚠️ CRITICAL: MAINTAIN EXACT ASPECT RATIO** - The image MUST be exactly ' + settings.aspectRatio + '. Do NOT change the aspect ratio from the original image.' : ''}

**Composition:** Create a warm, inviting scene that captures the emotion and action of the story moment. Use a horizontal composition suitable for a storybook spread.
${currentStorybook && currentStorybook.pages && page.pageNumber > 1 ? '\n**🎯 DIRECTIONAL CONSISTENCY:** Analyze the previous page\'s character positions and maintain consistent left-right orientation throughout the story. If a character was facing right in the previous scene, keep them facing right unless the story requires a directional change.' : ''}

**Lighting & Atmosphere:** Soft, warm lighting with gentle shadows. The scene should feel magical yet safe and welcoming for young children.

**Color Palette:** Vibrant, cheerful colors appropriate for children ages 4-8. Use color psychology to enhance the emotional impact of the scene.

**Art Quality:** High-detail, professional children's book illustration quality with painterly texture and depth.

**Target Audience:** Children ages 4-8. The illustration should be engaging, age-appropriate, and emotionally resonant.
${settings.additionalPrompt ? `\n\n**Additional Instructions:** ${settings.additionalPrompt}` : ''}
${noTextPrompt}`;

    return prompt;
}

// ===== 캐릭터 이미지 업로드 =====
// 캐릭터 레퍼런스 업로드 모달
let currentCharacterUploadIndex = null;
let currentCharacterUploadTab = 'file';


async function uploadCharacter() {
    if (!currentStorybook || currentCharacterUploadIndex === null) return;
    
    const uploadBtn = document.getElementById('characterUploadBtn');
    
    try {
        let imageUrl = '';
        
        if (currentCharacterUploadTab === 'file') {
            // 파일 업로드
            const fileInput = document.getElementById('characterFileInput');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('파일을 선택해주세요.');
                return;
            }
            
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>업로드 중...';
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('storybookId', currentStorybook.id);
            formData.append('storybookTitle', currentStorybook.title);
            formData.append('type', 'character');
            formData.append('characterIndex', currentCharacterUploadIndex);
            formData.append('characterName', currentStorybook.characters[currentCharacterUploadIndex]?.name || '');
            
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
            const urlInput = document.getElementById('characterUrlInput');
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
        
        // 캐릭터 레퍼런스 이미지 저장
        currentStorybook.characters[currentCharacterUploadIndex].referenceImage = imageUrl;
        await saveCurrentStorybook();
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        
        closeCharacterUploadModal();
        
        showNotification('✅ 이미지가 업로드되었습니다.', 'success');
    } catch (error) {
        console.error('Character upload error:', error);
        alert('이미지 업로드 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>업로드';
    }
}

// 기존 uploadCharacterImage 함수 (사용하지 않음)
async function uploadCharacterImage_old(charIndex, inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    
    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
    }
    
    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
    }
    
    try {
        const refDiv = document.getElementById(`char-ref-${charIndex}`);
        refDiv.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-3"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div><p class="text-white text-sm font-semibold">이미지 업로드 중...</p></div>';
        
        // FileReader로 이미지를 Base64로 변환
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            
            // Blob URL로 변환 (로컬 저장용)
            const response = await fetch(base64);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // 캐릭터 레퍼런스 이미지 저장
            currentStorybook.characters[charIndex].referenceImage = blobUrl;
            saveCurrentStorybook();
            
            // UI 업데이트
            refDiv.innerHTML = `<img src="${blobUrl}" alt="${currentStorybook.characters[charIndex].name}" class="w-full h-full object-cover rounded-lg"/>`;
            
            // 다운로드 버튼 추가
            const charCard = refDiv.closest('.character-card');
            if (charCard) {
                const existingDownloadBtn = charCard.querySelector('.download-char-btn');
                if (!existingDownloadBtn) {
                    const promptTextarea = charCard.querySelector(`#char-prompt-${charIndex}`);
                    if (promptTextarea) {
                        const downloadBtn = document.createElement('button');
                        downloadBtn.className = 'w-full bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition mb-2 download-char-btn';
                        downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>이미지 다운로드';
                        downloadBtn.onclick = () => downloadImage(blobUrl, `캐릭터_${currentStorybook.characters[charIndex].name}.png`);
                        promptTextarea.parentNode.insertBefore(downloadBtn, promptTextarea);
                    }
                }
            }
            
            console.log(`✅ 캐릭터 "${currentStorybook.characters[charIndex].name}" 이미지 업로드 완료`);
        };
        
        reader.onerror = () => {
            refDiv.innerHTML = '<div class="p-4 text-center"><p class="text-white text-xs">⚠️ 이미지 업로드 실패</p></div>';
            alert('이미지 업로드 중 오류가 발생했습니다.');
        };
        
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Upload error:', error);
        alert('이미지 업로드 중 오류가 발생했습니다: ' + error.message);
    }
}

// ===== 다시 만들기 모달 =====
function openRegenerateModal() {
    if (!currentStorybook) {
        alert('동화책이 생성되지 않았습니다.');
        return;
    }
    
    // 현재 값으로 모달 필드 채우기
    document.getElementById('regenerateTitle').value = currentStorybook.title;
    document.getElementById('regenerateAge').value = currentStorybook.targetAge;
    document.getElementById('regeneratePages').value = currentStorybook.pages.length;
    document.getElementById('regenerateArtStyle').value = currentStorybook.artStyle;
    document.getElementById('regenerateNotes').value = '';
    
    // 모달 표시
    document.getElementById('regenerateModal').classList.remove('hidden');
}

function closeRegenerateModal() {
    document.getElementById('regenerateModal').classList.add('hidden');
}

async function executeRegenerate() {
    const title = document.getElementById('regenerateTitle').value.trim();
    const targetAge = document.getElementById('regenerateAge').value;
    const totalPages = parseInt(document.getElementById('regeneratePages').value) || 0; // 0 = AI 자동 결정
    const geminiModel = document.getElementById('regenerateModel').value; // AI 모델 선택
    const artStyle = document.getElementById('regenerateArtStyle').value.trim();
    const notes = document.getElementById('regenerateNotes').value.trim();
    
    if (!title) {
        alert('제목을 입력해주세요.');
        return;
    }
    
    // 페이지 수 검증 (0은 자동, 1-30은 사용자 지정)
    if (totalPages < 0 || totalPages > 30) {
        alert('페이지 수는 0(자동) 또는 1-30 사이여야 합니다.');
        return;
    }
    
    if (!confirm('현재 동화책의 캐릭터는 유지하고 스토리만 다시 생성하시겠습니까?')) {
        return;
    }
    
    try {
        // 모달 닫기
        closeRegenerateModal();
        
        // 로딩 표시
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('storybookResult').innerHTML = '';
        
        // 기존 캐릭터 정보 저장
        const existingCharacters = currentStorybook.characters;
        
        // 서버에 재생성 요청
        const response = await axios.post('/api/generate-storybook', {
            title: title,
            targetAge: targetAge,
            totalPages: totalPages,
            geminiModel: geminiModel, // AI 모델 전달
            artStyle: artStyle,
            languages: ['ko'], // 무조건 한국어만
            referenceContent: notes, // 수정 요청사항을 참고 내용으로 전달
            existingCharacters: existingCharacters.map(char => ({
                name: char.name,
                role: char.role,
                description: char.description
            }))
        });
        
        // 응답 형식 확인
        const newStorybook = response.data.storybook || response.data;
        
        // 기존 캐릭터의 레퍼런스 이미지 복원
        if (newStorybook && newStorybook.characters) {
            newStorybook.characters.forEach((char, index) => {
                if (existingCharacters[index] && existingCharacters[index].referenceImage) {
                    char.referenceImage = existingCharacters[index].referenceImage;
                }
            });
        }
        
        // 현재 동화책 업데이트
        currentStorybook = newStorybook;
        saveCurrentStorybook();
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        
        // 로딩 숨기기
        document.getElementById('loading').classList.add('hidden');
        
        alert('동화책이 성공적으로 재생성되었습니다!');
    } catch (error) {
        console.error('Regeneration error:', error);
        document.getElementById('loading').classList.add('hidden');
        alert('동화책 재생성 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
    }
}

// ==================== 퀴즈 관련 함수 ====================

// 퀴즈 생성
async function generateQuiz(count = 5) {
    if (!currentStorybook || !currentStorybook.pages || currentStorybook.pages.length === 0) {
        alert('동화책을 먼저 생성해주세요.');
        return;
    }
    
    // Key Objects 체크
    if (!currentStorybook.key_objects || currentStorybook.key_objects.length === 0) {
        alert('퀴즈를 생성하려면 먼저 Key Objects(핵심 사물)를 생성해주세요.\n\n"Key Objects(핵심 사물)" 섹션에서 사물을 추가할 수 있습니다.');
        return;
    }
    
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer) return;
    
    // 로딩 표시
    quizContainer.innerHTML = `
        <div class="text-center py-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Key Objects 기반 퀴즈를 생성하고 있습니다...</p>
            <p class="text-xs text-gray-500 mt-2">Key Objects: ${currentStorybook.key_objects.map(obj => obj.name).join(', ')}</p>
        </div>
    `;
    
    try {
        console.log(`🎯 Generating ${count} quiz questions based on Key Objects...`);
        console.log('📦 Key Objects:', currentStorybook.key_objects.map(obj => obj.name).join(', '));
        
        const response = await axios.post('/api/generate-quiz', {
            storybook: currentStorybook,
            count: count
        });
        
        if (response.data.success && response.data.quizzes) {
            // quizzes 배열 초기화 (없으면)
            if (!currentStorybook.quizzes) {
                currentStorybook.quizzes = [];
            }
            
            // 새로운 퀴즈 추가
            currentStorybook.quizzes.push(...response.data.quizzes);
            
            // 저장
            saveCurrentStorybook();
            
            // UI 업데이트
            displayStorybook(currentStorybook);
            
            console.log(`✅ Generated ${response.data.quizzes.length} Key Object-based quiz questions`);
            
            // 성공 메시지
            const successQuizzes = response.data.quizzes.filter(q => q.relatedKeyObject).length;
            if (successQuizzes > 0) {
                console.log(`🔑 ${successQuizzes}개의 퀴즈가 Key Objects와 연결되었습니다.`);
            }
        } else {
            throw new Error('퀴즈 생성 실패');
        }
    } catch (error) {
        console.error('퀴즈 생성 오류:', error);
        
        quizContainer.innerHTML = `
            <div class="text-center py-8 text-red-600">
                <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                <p>퀴즈 생성 중 오류가 발생했습니다.</p>
                <p class="text-sm mt-2">${error.response?.data?.error || error.message}</p>
                <button 
                    onclick="generateQuiz()"
                    class="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                    <i class="fas fa-redo mr-1"></i>다시 시도
                </button>
            </div>
        `;
    }
}

// 퀴즈 정답 보기
function showQuizAnswer(quizIndex) {
    const explanationDiv = document.getElementById(`quiz-explanation-${quizIndex}`);
    if (explanationDiv) {
        explanationDiv.classList.toggle('hidden');
    }
}

// 퀴즈 삭제
function deleteQuiz(quizIndex) {
    if (confirm('이 퀴즈를 삭제하시겠습니까?')) {
        currentStorybook.quizzes.splice(quizIndex, 1);
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
    }
}

// ==================== Key Objects 관련 함수 ====================

// Key Object 필드 업데이트
function updateKeyObjectField(objIndex, field, value) {
    if (!currentStorybook.key_objects || !currentStorybook.key_objects[objIndex]) return;
    
    currentStorybook.key_objects[objIndex][field] = value;
    saveCurrentStorybook();
}

// Key Object 단일 이미지 생성
async function generateSingleKeyObjectImage(objIndex) {
    if (!currentStorybook || !currentStorybook.key_objects || !currentStorybook.key_objects[objIndex]) {
        alert('Key Object 정보가 없습니다.');
        return;
    }
    
    const obj = currentStorybook.key_objects[objIndex];
    const objImgDiv = document.getElementById(`keyobj-img-${objIndex}`);
    
    if (!objImgDiv) return;
    
    // 로딩 표시
    objImgDiv.innerHTML = '<div class="flex flex-col items-center justify-center h-full p-4"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-2"></div><p class="text-gray-600 text-xs">생성 중...</p></div>';
    
    try {
        console.log(`🎨 Generating Key Object image for: ${obj.name} (${obj.korean})`);
        
        // 🔥 서버 API 호출 (R2 업로드 포함)
        const response = await axios.post('/api/generate-key-object', {
            keyObject: {
                name: obj.name,
                description: obj.description,
                korean: obj.korean,
                size: obj.size
            },
            artStyle: currentStorybook.artStyle || '디즈니 스타일',
            settings: {
                aspectRatio: imageSettings.aspectRatio || '1:1',
                enforceNoText: true,
                additionalPrompt: imageSettings.additionalPrompt,
                keyObjectModel: imageSettings.keyObjectModel || 'gemini-3-pro-image-preview'  // Key Object 모델 전달
            },
            storybookId: currentStorybook.id,
            storybookTitle: currentStorybook.title
        });
        
        if (response.data.success && response.data.imageUrl) {
            const imageUrl = response.data.imageUrl; // R2 URL
            
            // keyObjectImages 배열 초기화
            if (!currentStorybook.keyObjectImages) {
                currentStorybook.keyObjectImages = [];
            }
            
            // 해당 인덱스에 이미지 저장
            currentStorybook.keyObjectImages[objIndex] = {
                name: obj.name,
                korean: obj.korean,
                imageUrl: imageUrl,
                success: true
            };
            
            // 저장
            saveCurrentStorybook();
            
            // UI 업데이트 - 해당 Key Object 이미지만 업데이트
            objImgDiv.innerHTML = `<img src="${imageUrl}" alt="${obj.name}" class="w-full h-full object-cover rounded-lg"/>`;
            
            console.log(`✅ Key Object "${obj.name}" 이미지 생성 완료 (R2 업로드 포함)`);
            
            // ⭐ 모든 페이지의 참조 이미지 섹션 새로고침
            refreshAllPageReferenceImages();
            
            return {
                index: objIndex,
                success: true,
                imageUrl: imageUrl
            };
        } else {
            throw new Error(response.data.error || '이미지 URL을 받지 못했습니다.');
        }
    } catch (error) {
        console.error(`Key Object 이미지 생성 오류 (${obj.name}):`, error);
        
        // 기존 이미지가 있는지 확인
        const existingImage = currentStorybook.keyObjectImages && currentStorybook.keyObjectImages[objIndex];
        
        if (existingImage && existingImage.imageUrl) {
            // 기존 이미지가 있으면 유지하고 에러 알림만 표시
            objImgDiv.innerHTML = `<img src="${existingImage.imageUrl}" alt="${obj.name}" class="w-full h-full object-cover rounded-lg"/>`;
            showNotification('error', '재생성 실패', `${obj.korean} 이미지 재생성에 실패했습니다.\n기존 이미지가 유지됩니다.`);
        } else {
            // 기존 이미지가 없으면 재시도 버튼 표시
            objImgDiv.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-2"></i>
                    <p class="text-red-600 text-xs mb-2">생성 실패</p>
                    <button 
                        onclick="generateSingleKeyObjectImage(${objIndex})"
                        class="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600"
                    >
                        <i class="fas fa-redo mr-1"></i>재시도
                    </button>
                </div>
            `;
        }
        
        return {
            index: objIndex,
            success: false,
            error: error.message
        };
    }
}

// 모든 Key Object 이미지 생성
async function generateAllKeyObjectImages() {
    if (!currentStorybook || !currentStorybook.key_objects || currentStorybook.key_objects.length === 0) {
        alert('Key Object 정보가 없습니다.');
        return;
    }
    
    if (!confirm(`${currentStorybook.key_objects.length}개의 Key Object 이미지를 동시에 생성하시겠습니까?`)) {
        return;
    }
    
    console.log(`🎨 Generating all ${currentStorybook.key_objects.length} Key Object images in parallel...`);
    
    // keyObjectImages 배열 초기화
    if (!currentStorybook.keyObjectImages) {
        currentStorybook.keyObjectImages = new Array(currentStorybook.key_objects.length);
    }
    
    // ⭐ 병렬 생성 (Promise.all 사용)
    const promises = [];
    for (let i = 0; i < currentStorybook.key_objects.length; i++) {
        promises.push(generateSingleKeyObjectImage(i));
    }
    
    try {
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        console.log(`✅ All Key Object images generated: ${successCount}/${currentStorybook.key_objects.length} succeeded`);
        alert(`모든 Key Object 이미지 생성 완료!\n성공: ${successCount}/${currentStorybook.key_objects.length}개`);
    } catch (error) {
        console.error('❌ Error generating Key Object images:', error);
        alert('일부 이미지 생성에 실패했습니다. 개별적으로 다시 시도해주세요.');
    }
}

// 모든 Key Object 이미지 다운로드
function downloadAllKeyObjectImages() {
    if (!currentStorybook || !currentStorybook.keyObjectImages) {
        alert('다운로드할 Key Object 이미지가 없습니다.');
        return;
    }
    
    const images = currentStorybook.keyObjectImages.filter(img => img && img.imageUrl);
    
    if (images.length === 0) {
        alert('다운로드할 Key Object 이미지가 없습니다.');
        return;
    }
    
    images.forEach((img, index) => {
        setTimeout(() => {
            downloadImage(img.imageUrl, `keyobject_${img.name}.png`);
        }, index * 500);
    });
    
    alert(`${images.length}개의 Key Object 이미지 다운로드를 시작합니다.`);
}

// Key Object 참조 토글 (페이지 삽화 생성 시)
function toggleKeyObjectReference(pageIndex, objIndex) {
    const checkbox = document.getElementById(`ref-keyobj-check-${pageIndex}-${objIndex}`);
    const img = document.getElementById(`ref-keyobj-${pageIndex}-${objIndex}`);
    
    if (checkbox && img) {
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            img.classList.remove('border-orange-300');
            img.classList.add('border-orange-600', 'border-4');
        } else {
            img.classList.remove('border-orange-600', 'border-4');
            img.classList.add('border-orange-300');
        }
    }
}

// Key Object 추가
async function addNewKeyObject() {
    if (!currentStorybook.key_objects) {
        currentStorybook.key_objects = [];
    }
    
    // 사물 이름 입력받기
    const objectName = prompt('핵심 사물의 이름을 입력하세요 (예: 사과, 호랑이, 성)\n\n⚠️ 반드시 명사(동물/물건)를 입력하세요.\n동사, 형용사, 추상적 개념은 안됩니다.');
    
    if (!objectName || objectName.trim() === '') {
        return; // 취소
    }
    
    const trimmedName = objectName.trim();
    
    // 임시 객체 추가 (로딩 중)
    const newKeyObject = {
        name: trimmedName,
        korean: trimmedName,
        size: "medium",
        sizeCm: 100,
        description: "🔄 설명 생성 중...",
        example: "🔄 예문 생성 중..."
    };
    
    currentStorybook.key_objects.push(newKeyObject);
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    // 동화 텍스트 수집
    const storyText = currentStorybook.pages.map(p => p.text || '').join('\n\n');
    
    if (!storyText || storyText.trim().length === 0) {
        alert('동화 텍스트가 없어서 설명을 자동 생성할 수 없습니다.\n수동으로 설명과 예문을 입력해주세요.');
        newKeyObject.description = "이 사물의 상세한 시각적 설명을 입력하세요.";
        newKeyObject.example = "이 사물이 등장하는 예시 문장을 입력하세요.";
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
        return;
    }
    
    try {
        console.log(`🔍 핵심 사물 설명 자동 생성: ${trimmedName}`);
        
        // API 호출로 설명과 예문 생성
        const response = await axios.post('/api/generate-keyobject-description', {
            objectName: trimmedName,
            storyText: storyText
        }, {
            headers: {
                'X-API-Key': getAPIKey()
            }
        });
        
        if (response.data.success) {
            // 생성된 설명과 예문 적용
            const objIndex = currentStorybook.key_objects.length - 1;
            currentStorybook.key_objects[objIndex].description = response.data.description;
            currentStorybook.key_objects[objIndex].example = response.data.example;
            
            saveCurrentStorybook();
            displayStorybook(currentStorybook);
            
            showNotification('success', '핵심 사물 추가 완료!', `"${trimmedName}"의 설명과 예문이 자동 생성되었습니다.`);
            console.log(`✅ 설명: ${response.data.description}`);
            console.log(`✅ 예문: ${response.data.example}`);
        } else {
            throw new Error(response.data.error || '설명 생성 실패');
        }
        
    } catch (error) {
        console.error('설명 생성 오류:', error);
        alert(`설명 자동 생성에 실패했습니다.\n수동으로 설명과 예문을 입력해주세요.\n\n오류: ${error.message}`);
        
        // 실패 시 기본값으로 설정
        const objIndex = currentStorybook.key_objects.length - 1;
        currentStorybook.key_objects[objIndex].description = "이 사물의 상세한 시각적 설명을 입력하세요.";
        currentStorybook.key_objects[objIndex].example = "이 사물이 등장하는 예시 문장을 입력하세요.";
        
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
    }
}

// Key Object 삭제
function deleteKeyObject(objIndex) {
    if (confirm(`"${currentStorybook.key_objects[objIndex].name}" 사물을 삭제하시겠습니까?`)) {
        currentStorybook.key_objects.splice(objIndex, 1);
        
        // 이미지도 함께 삭제
        if (currentStorybook.keyObjectImages && currentStorybook.keyObjectImages[objIndex]) {
            currentStorybook.keyObjectImages.splice(objIndex, 1);
        }
        
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
        
        alert('Key Object가 삭제되었습니다.');
    }
}

// 핵심 단어 이미지 일괄 업로드
async function bulkUploadKeyObjectImages() {
    if (!currentStorybook || !currentStorybook.key_objects || currentStorybook.key_objects.length === 0) {
        alert('핵심 사물이 없습니다. 먼저 핵심 사물을 추가해주세요.');
        return;
    }
    
    // 파일 입력 요소 생성
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) {
            return;
        }
        
        // 핵심 사물을 가나다순으로 정렬
        const sortedKeyObjects = currentStorybook.key_objects
            .map((obj, idx) => ({ obj, originalIdx: idx }))
            .sort((a, b) => {
                const nameA = (a.obj.korean || a.obj.name).toLowerCase();
                const nameB = (b.obj.korean || b.obj.name).toLowerCase();
                return nameA.localeCompare(nameB, 'ko');
            });
        
        // 파일을 이름순으로 정렬
        files.sort((a, b) => a.name.localeCompare(b.name));
        
        if (files.length !== sortedKeyObjects.length) {
            const proceed = confirm(
                `⚠️ 파일 개수(${files.length}개)와 핵심 사물 개수(${sortedKeyObjects.length}개)가 일치하지 않습니다.\n\n` +
                `가나다순 매칭:\n` +
                sortedKeyObjects.slice(0, Math.min(files.length, 5)).map((item, i) => 
                    `${i + 1}. ${files[i]?.name || '없음'} → ${item.obj.korean || item.obj.name}`
                ).join('\n') +
                (sortedKeyObjects.length > 5 ? `\n...\n` : '') +
                `\n\n계속하시겠습니까?`
            );
            
            if (!proceed) {
                return;
            }
        }
        
        // 업로드 진행
        showNotification('info', '일괄 업로드 시작', `${files.length}개 파일 업로드 중...`);
        
        // keyObjectImages 배열 초기화
        if (!currentStorybook.keyObjectImages) {
            currentStorybook.keyObjectImages = [];
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < Math.min(files.length, sortedKeyObjects.length); i++) {
            const file = files[i];
            const { obj, originalIdx } = sortedKeyObjects[i];
            
            try {
                console.log(`📤 업로드 중 (${i + 1}/${files.length}): ${file.name} → ${obj.korean || obj.name}`);
                
                // Base64로 변환
                const base64 = await fileToBase64(file);
                
                // R2에 업로드
                const response = await axios.post('/api/upload-image', {
                    image: base64,
                    filename: `keyobject-${currentStorybook.id}-${originalIdx}-${Date.now()}.png`
                }, {
                    headers: {
                        'X-API-Key': getAPIKey()
                    }
                });
                
                if (response.data.success) {
                    // keyObjectImages 배열에 저장 (원래 인덱스 위치에)
                    currentStorybook.keyObjectImages[originalIdx] = {
                        imageUrl: response.data.url,
                        uploadedAt: new Date().toISOString()
                    };
                    
                    successCount++;
                    console.log(`✅ 업로드 성공: ${obj.korean || obj.name}`);
                } else {
                    failCount++;
                    console.error(`❌ 업로드 실패: ${obj.korean || obj.name}`);
                }
                
            } catch (error) {
                failCount++;
                console.error(`❌ 업로드 오류: ${obj.korean || obj.name}`, error);
            }
        }
        
        // 저장 및 화면 업데이트
        saveCurrentStorybook();
        displayStorybook(currentStorybook);
        
        // 결과 알림
        if (failCount === 0) {
            showNotification('success', '일괄 업로드 완료!', `${successCount}개 이미지가 성공적으로 업로드되었습니다.`);
        } else {
            showNotification('warning', '일괄 업로드 완료', `성공: ${successCount}개, 실패: ${failCount}개`);
        }
    };
    
    input.click();
}

// 파일을 Base64로 변환하는 헬퍼 함수
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 모든 페이지의 참조 이미지 섹션 새로고침
function refreshAllPageReferenceImages() {
    console.log('🔄 Refreshing all page reference images...');
    
    // displayStorybook을 다시 호출하여 전체 UI 갱신
    // 이렇게 하면 모든 페이지의 Key Object 참조 이미지가 업데이트됨
    displayStorybook(currentStorybook);
}

// 8단어 TXT 다운로드
function downloadVocabularyTxt() {
    if (!currentStorybook || !currentStorybook.educational_content || !currentStorybook.educational_content.vocabulary) {
        alert('다운로드할 단어가 없습니다.');
        return;
    }
    
    const vocabulary = currentStorybook.educational_content.vocabulary;
    let txtContent = `========================================\n`;
    txtContent += `   ${currentStorybook.title} - 영어 단어 학습\n`;
    txtContent += `========================================\n\n`;
    txtContent += `대상 연령: ${currentStorybook.targetAge}세\n`;
    txtContent += `생성 일시: ${new Date(currentStorybook.createdAt).toLocaleString('ko-KR')}\n`;
    txtContent += `총 단어 수: ${vocabulary.length}개\n\n`;
    txtContent += `========================================\n\n`;
    
    vocabulary.forEach((vocabItem, index) => {
        const word = typeof vocabItem === 'object' ? vocabItem.word : vocabItem;
        const korean = typeof vocabItem === 'object' ? vocabItem.korean : '';
        const definition = typeof vocabItem === 'object' ? vocabItem.definition : '';
        const example = typeof vocabItem === 'object' ? vocabItem.example : '';
        
        txtContent += `${index + 1}. ${word}${korean ? ` (${korean})` : ''}\n`;
        txtContent += `${'='.repeat(50)}\n`;
        
        if (definition) {
            txtContent += `\n[설명]\n${definition}\n`;
        }
        
        if (example) {
            txtContent += `\n[예문]\n${example}\n`;
        }
        
        txtContent += `\n\n`;
    });
    
    txtContent += `========================================\n`;
    txtContent += `파일 생성: ${new Date().toLocaleString('ko-KR')}\n`;
    txtContent += `========================================\n`;
    
    // TXT 파일 다운로드
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStorybook.title}_영어단어학습_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log(`✅ Vocabulary TXT downloaded: ${vocabulary.length} words`);
}

// ========================================
// Review 모달 관련 함수들
// ========================================

let reviewStorybookData = null;
let reviewSelectedLanguages = [];
let reviewDraggedElement = null;
let reviewDraggedLang = null;
let reviewDraggedPageIdx = null;

// Review 모달 열기
function openReviewModal(storybookData) {
    reviewStorybookData = storybookData;
    reviewSelectedLanguages = storybookData.languages || ['ko', 'en'];
    
    // UI 렌더링
    renderReviewHeader();
    renderReviewLanguageTabs();
    renderReviewLanguageContents();
    
    // 모달 표시
    const modal = document.getElementById('reviewModal');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    
    console.log('📖 Review 모달 열림:', storybookData.title);
}

// Review 모달 닫기
function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
    
    console.log('📖 Review 모달 닫힘');
}

// Review 헤더 렌더링
function renderReviewHeader() {
    document.getElementById('reviewStoryTitle').textContent = reviewStorybookData.title;
    document.getElementById('reviewTargetAge').textContent = `${reviewStorybookData.targetAge}세 대상`;
    document.getElementById('reviewTotalPages').textContent = `${reviewStorybookData.pages?.length || 0}페이지`;
    
    // 카테고리 선택 초기화
    const categorySelect = document.getElementById('storybookCategory');
    if (categorySelect) {
        categorySelect.value = reviewStorybookData.category || '';
    }
}

// Review 언어 탭 렌더링
function renderReviewLanguageTabs() {
    const tabsContainer = document.getElementById('reviewLanguageTabs');
    const languageNames = {
        'ko': '🇰🇷 한국어',
        'en': '🇺🇸 English',
        'zh': '🇨🇳 中文',
        'ja': '🇯🇵 日本語',
        'es': '🇪🇸 Español',
        'fr': '🇫🇷 Français'
    };

    tabsContainer.innerHTML = reviewSelectedLanguages.map((lang, idx) => `
        <button 
            class="tab-button px-4 py-2 rounded-lg font-semibold border-2 border-purple-300 text-sm ${idx === 0 ? 'active' : ''}"
            onclick="switchReviewLanguage('${lang}')"
            data-lang="${lang}"
        >
            ${languageNames[lang] || lang}
        </button>
    `).join('');
}

// Review 언어별 콘텐츠 렌더링
function renderReviewLanguageContents() {
    const contentsContainer = document.getElementById('reviewLanguageContents');
    
    contentsContainer.innerHTML = reviewSelectedLanguages.map((lang, idx) => {
        // translations[lang] 또는 기본 pages 사용
        const pages = reviewStorybookData.translations?.[lang] || reviewStorybookData.pages || [];
        
        return `
            <div class="language-content ${idx === 0 ? 'active' : ''}" data-lang="${lang}">
                <div id="review-pages-container-${lang}" class="space-y-2">
                    ${pages.map((page, pageIdx) => `
                        <div 
                            class="page-item bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-purple-300"
                            data-lang="${lang}"
                            data-page-idx="${pageIdx}"
                            draggable="true"
                            ondragstart="handleReviewDragStart(event)"
                            ondragover="handleReviewDragOver(event)"
                            ondrop="handleReviewDrop(event)"
                            ondragend="handleReviewDragEnd(event)"
                        >
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-grip-vertical text-gray-400 cursor-move text-sm"></i>
                                    <h4 class="text-sm font-bold text-gray-700">
                                        <i class="fas fa-file-alt mr-1 text-purple-600 text-xs"></i>
                                        페이지 ${page.pageNumber || pageIdx + 1}
                                    </h4>
                                </div>
                                <button 
                                    onclick="deleteReviewPage('${lang}', ${pageIdx})"
                                    class="text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition text-xs"
                                >
                                    <i class="fas fa-trash mr-1"></i>삭제
                                </button>
                            </div>
                            <textarea
                                id="review-page-text-${lang}-${pageIdx}"
                                class="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition resize-y text-sm"
                                rows="2"
                                onchange="updateReviewPageText('${lang}', ${pageIdx}, this.value)"
                            >${page.text || ''}</textarea>
                            <p class="text-[10px] text-gray-400 mt-1">
                                <i class="fas fa-info-circle mr-1"></i>
                                텍스트 수정 후 다른 곳 클릭 시 자동 저장
                            </p>
                        </div>
                    `).join('')}
                </div>
                
                <!-- 페이지 추가 버튼 -->
                <div class="mt-3">
                    <button 
                        onclick="addReviewNewPage('${lang}')"
                        class="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition shadow-md text-sm"
                    >
                        <i class="fas fa-plus mr-2"></i>
                        새 페이지 추가
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Review 언어 전환
function switchReviewLanguage(lang) {
    // 탭 활성화
    document.querySelectorAll('#reviewLanguageTabs .tab-button').forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 콘텐츠 표시
    document.querySelectorAll('#reviewLanguageContents .language-content').forEach(content => {
        if (content.dataset.lang === lang) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Review 페이지 텍스트 업데이트
function updateReviewPageText(lang, pageIdx, newText) {
    // 데이터 업데이트
    if (!reviewStorybookData.translations) {
        reviewStorybookData.translations = {};
    }
    if (!reviewStorybookData.translations[lang]) {
        reviewStorybookData.translations[lang] = reviewStorybookData.pages || [];
    }
    
    reviewStorybookData.translations[lang][pageIdx].text = newText.trim();
    
    console.log(`✅ Review 페이지 ${pageIdx + 1} (${lang}) 텍스트 업데이트됨`);
}

// Review 페이지 삭제
function deleteReviewPage(lang, pageIdx) {
    const pages = reviewStorybookData.translations?.[lang] || reviewStorybookData.pages || [];
    const pageNumber = pages[pageIdx]?.pageNumber || pageIdx + 1;
    
    if (!confirm(`페이지 ${pageNumber}을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }
    
    // 데이터에서 삭제
    if (reviewStorybookData.translations && reviewStorybookData.translations[lang]) {
        reviewStorybookData.translations[lang].splice(pageIdx, 1);
        
        // 페이지 번호 재정렬
        reviewStorybookData.translations[lang].forEach((page, idx) => {
            page.pageNumber = idx + 1;
        });
    }
    
    // UI 재렌더링
    renderReviewLanguageContents();
    
    console.log(`✅ Review 페이지 ${pageNumber} (${lang}) 삭제됨`);
}

// Review 새 페이지 추가
function addReviewNewPage(lang) {
    const pages = reviewStorybookData.translations?.[lang] || reviewStorybookData.pages || [];
    const newPageNumber = pages.length + 1;
    
    const newPage = {
        pageNumber: newPageNumber,
        text: ''
    };
    
    // 데이터 업데이트
    if (!reviewStorybookData.translations) {
        reviewStorybookData.translations = {};
    }
    if (!reviewStorybookData.translations[lang]) {
        reviewStorybookData.translations[lang] = [];
    }
    
    reviewStorybookData.translations[lang].push(newPage);
    
    // UI 재렌더링
    renderReviewLanguageContents();
    
    // 새로 추가된 페이지로 스크롤
    setTimeout(() => {
        const newPageElement = document.querySelector(`#reviewLanguageContents [data-lang="${lang}"][data-page-idx="${pages.length}"]`);
        if (newPageElement) {
            newPageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newPageElement.querySelector('textarea')?.focus();
        }
    }, 100);
    
    console.log(`✅ Review 새 페이지 ${newPageNumber} (${lang}) 추가됨`);
}

// Review 드래그 시작
function handleReviewDragStart(event) {
    reviewDraggedElement = event.target.closest('.page-item');
    reviewDraggedLang = reviewDraggedElement.dataset.lang;
    reviewDraggedPageIdx = parseInt(reviewDraggedElement.dataset.pageIdx);
    
    reviewDraggedElement.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', reviewDraggedElement.innerHTML);
}

// Review 드래그 오버
function handleReviewDragOver(event) {
    if (event.preventDefault) {
        event.preventDefault();
    }
    event.dataTransfer.dropEffect = 'move';
    
    const target = event.target.closest('.page-item');
    if (target && target !== reviewDraggedElement) {
        target.classList.add('drag-over');
    }
    
    return false;
}

// Review 드롭
function handleReviewDrop(event) {
    if (event.stopPropagation) {
        event.stopPropagation();
    }
    
    const targetElement = event.target.closest('.page-item');
    if (!targetElement || targetElement === reviewDraggedElement) {
        return false;
    }
    
    const targetLang = targetElement.dataset.lang;
    const targetPageIdx = parseInt(targetElement.dataset.pageIdx);
    
    // 같은 언어 내에서만 순서 변경 가능
    if (reviewDraggedLang !== targetLang) {
        alert('같은 언어 내에서만 순서를 변경할 수 있습니다.');
        return false;
    }
    
    // 데이터 순서 변경
    const pages = reviewStorybookData.translations?.[reviewDraggedLang] || reviewStorybookData.pages || [];
    const [movedPage] = pages.splice(reviewDraggedPageIdx, 1);
    pages.splice(targetPageIdx, 0, movedPage);
    
    // 페이지 번호 재정렬
    pages.forEach((page, idx) => {
        page.pageNumber = idx + 1;
    });
    
    // UI 재렌더링
    renderReviewLanguageContents();
    
    console.log(`✅ Review 페이지 순서 변경: ${reviewDraggedPageIdx + 1} → ${targetPageIdx + 1}`);
    
    return false;
}

// Review 드래그 종료
function handleReviewDragEnd(event) {
    const allItems = document.querySelectorAll('#reviewLanguageContents .page-item');
    allItems.forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
}

// Review 검토 완료 (모달에서)
async function completeReviewFromModal() {
    if (!confirm('검토를 완료하고 저장하시겠습니까?')) {
        return;
    }

    // 로딩 표시
    const btn = document.getElementById('reviewCompleteBtn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>저장 중...';

    try {
        // currentStorybook 업데이트
        currentStorybook = reviewStorybookData;
        
        // 동화책 목록에서 찾아서 업데이트
        const index = storybooks.findIndex(s => s && s.id === currentStorybook.id);
        if (index !== -1) {
            storybooks[index] = currentStorybook;
        } else {
            storybooks.push(currentStorybook);
        }
        
        // localStorage에 저장
        saveStorybooks();
        
        // 모달 닫기
        closeReviewModal();
        
        // UI 업데이트
        displayStorybook(currentStorybook);
        renderBookList();
        
        showNotification('✅ 동화책이 저장되었습니다!', 'success');
        
        console.log('✅ Review 완료 및 저장됨');
    } catch (error) {
        console.error('Review 저장 오류:', error);
        alert(`❌ 저장에 실패했습니다.\n${error.message}`);
    } finally {
        // 항상 버튼 복구
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// ========================================
// 언어 전환 관련 함수들
// ========================================

// 언어 전환
function switchLanguage(lang) {
    currentLanguage = lang;
    console.log(`🌐 언어 전환: ${lang}`);
    
    // 페이지 다시 렌더링
    if (currentStorybook) {
        displayStorybook(currentStorybook);
    }
}

// 현재 언어에 해당하는 페이지 텍스트 가져오기
function getPageText(page, lang) {
    if (!currentStorybook || !currentStorybook.translations) {
        return page.text || '';
    }
    
    const translations = currentStorybook.translations[lang];
    if (!translations || !Array.isArray(translations)) {
        return page.text || '';
    }
    
    // 페이지 번호로 찾기
    const translatedPage = translations.find(p => p.pageNumber === page.pageNumber);
    return translatedPage ? translatedPage.text : (page.text || '');
}

// 현재 언어에 해당하는 TTS URL 가져오기
function getPageTTS(page, lang) {
    if (!page) return null;
    
    // 한국어인 경우
    if (lang === 'ko') {
        return page.audioUrl || page.ttsAudio?.url || null;
    }
    
    // 다른 언어인 경우
    if (page.ttsAudio && page.ttsAudio[lang]) {
        return page.ttsAudio[lang].url || null;
    }
    
    return null;
}

// 동화책 뷰어 열기
function openReader(bookId) {
    console.log('📖 openReader 호출됨, bookId:', bookId);
    
    const book = storybooks.find(b => b.id === bookId);
    if (!book) {
        console.error('❌ 동화책을 찾을 수 없습니다. bookId:', bookId);
        alert('동화책을 찾을 수 없습니다.');
        return;
    }
    
    console.log('✅ 동화책 발견:', book.title);
    
    // localStorage quota 문제 해결: bookId만 저장
    try {
        localStorage.setItem('temp_reader_book_id', bookId);
        console.log('💾 localStorage에 bookId 저장 완료');
        // reader.html로 이동
        const newWindow = window.open('/reader.html', '_blank');
        if (!newWindow) {
            console.error('❌ 새 창 열기 실패 (팝업 차단?)');
            alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
        } else {
            console.log('✅ reader.html 새 창 열기 성공');
        }
    } catch (e) {
        // localStorage 실패 시 URL 파라미터 사용
        console.error('❌ localStorage 오류:', e);
        const newWindow = window.open(`/reader.html?id=${bookId}`, '_blank');
        if (!newWindow) {
            console.error('❌ 새 창 열기 실패 (팝업 차단?)');
            alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
        }
    }
}

// 퀴즈 페이지 열기
function openQuiz(bookId) {
    const book = storybooks.find(b => b.id === bookId);
    if (!book) {
        alert('동화책을 찾을 수 없습니다.');
        return;
    }
    
    // 퀴즈가 있는지 확인
    if (!book.educational_content || !book.educational_content.comprehension_questions || book.educational_content.comprehension_questions.length === 0) {
        if (confirm('이 동화책에는 아직 퀴즈가 없습니다.\n퀴즈를 생성하시겠습니까?')) {
            // 퀴즈 생성 페이지로 이동하거나 생성 함수 호출
            alert('퀴즈 생성 기능은 준비 중입니다.');
        }
        return;
    }
    
    // 퀴즈 데이터를 localStorage에 임시 저장
    localStorage.setItem('temp_quiz_book', JSON.stringify(book));
    
    // quiz.html로 이동
    window.open('/quiz.html', '_blank');
}

// 페이지별 번역 함수
async function translateSinglePage(pageIndex) {
    if (!currentStorybook || !currentStorybook.pages[pageIndex]) {
        alert('페이지를 찾을 수 없습니다.');
        return;
    }
    
    if (currentLanguage === 'ko') {
        alert('한국어는 번역할 필요가 없습니다.');
        return;
    }
    
    const page = currentStorybook.pages[pageIndex];
    const sourceText = page.text;
    
    if (!sourceText || sourceText.trim() === '') {
        alert('번역할 텍스트가 없습니다.');
        return;
    }
    
    // 번역 버튼 찾기
    const translateBtn = document.querySelector(`[data-translate-page="${pageIndex}"]`);
    if (translateBtn) {
        translateBtn.disabled = true;
        translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>번역 중...';
    }
    
    try {
        const response = await axios.post('/api/translate-page', {
            text: sourceText,
            targetLanguage: currentLanguage,
            context: {
                title: currentStorybook.title,
                theme: currentStorybook.theme,
                characters: currentStorybook.characters ? currentStorybook.characters.map(c => c.name).join(', ') : ''
            }
        }, {
            timeout: 30000  // 30초
        });
        
        if (response.data.success) {
            // translations 업데이트
            if (!currentStorybook.translations) {
                currentStorybook.translations = {};
            }
            if (!currentStorybook.translations[currentLanguage]) {
                currentStorybook.translations[currentLanguage] = currentStorybook.pages.map(p => ({
                    pageNumber: p.pageNumber,
                    text: ''
                }));
            }
            
            // 해당 페이지 번역 텍스트 저장
            const translationPage = currentStorybook.translations[currentLanguage].find(p => p.pageNumber === page.pageNumber);
            if (translationPage) {
                translationPage.text = response.data.translatedText;
            }
            
            // ✅ 실시간 UI 업데이트 - 해당 페이지의 textarea만 업데이트 (전체 리렌더링 방지)
            const pageTextarea = document.querySelector(`textarea[onchange*="updatePageText(${pageIndex},"]`);
            if (pageTextarea) {
                pageTextarea.value = response.data.translatedText;
                console.log(`🔄 페이지 ${page.pageNumber} textarea 업데이트 완료`);
            }
            
            // 저장
            saveCurrentStorybook();
            
            // 버튼 복원
            if (translateBtn) {
                translateBtn.disabled = false;
                translateBtn.innerHTML = '<i class="fas fa-language mr-1"></i>번역';
            }
            
            showNotification('success', '번역 완료', `페이지 ${page.pageNumber} 번역이 완료되었습니다.`);
        } else {
            throw new Error(response.data.error || '번역 실패');
        }
    } catch (error) {
        console.error('페이지 번역 실패:', error);
        alert(`번역 실패: ${error.response?.data?.error || error.message}`);
        
        // 버튼 복원
        if (translateBtn) {
            translateBtn.disabled = false;
            translateBtn.innerHTML = '<i class="fas fa-language mr-1"></i>번역';
        }
    }
}

// 모든 페이지 순차 번역
async function translateAllPages() {
    if (!currentStorybook || !currentStorybook.pages) {
        alert('동화책이 선택되지 않았습니다.');
        return;
    }
    
    if (currentLanguage === 'ko') {
        alert('한국어는 번역할 필요가 없습니다.');
        return;
    }
    
    const totalPages = currentStorybook.pages.length;
    
    if (!confirm(`모든 페이지를 ${currentLanguage}로 번역하시겠습니까?\n\n${totalPages}개 페이지가 순차적으로 번역됩니다.\n예상 소요 시간: 약 ${totalPages * 5}초`)) {
        return;
    }
    
    // 버튼 비활성화
    const translateAllBtn = document.getElementById('translate-all-btn');
    if (translateAllBtn) {
        translateAllBtn.disabled = true;
        translateAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-xl"></i><span>번역 중...</span>';
    }
    
    let successCount = 0;
    let failCount = 0;
    
    console.log(`🌐 모든 페이지 번역 시작 (${totalPages}개 페이지)`);
    console.log('📋 번역 데이터 구조:', {
        hasTranslations: !!currentStorybook.translations,
        hasCurrentLang: !!currentStorybook.translations?.[currentLanguage],
        translationCount: currentStorybook.translations?.[currentLanguage]?.length || 0,
        currentLanguage: currentLanguage
    });
    
    for (let i = 0; i < currentStorybook.pages.length; i++) {
        const page = currentStorybook.pages[i];
        
        // 이미 번역된 페이지는 건너뛰기
        const translatedPage = currentStorybook.translations?.[currentLanguage]?.find(p => p.pageNumber === page.pageNumber);
        const hasTranslation = translatedPage && translatedPage.text && translatedPage.text.trim() !== '';
        
        console.log(`📄 페이지 ${page.pageNumber}: 번역=${hasTranslation}, 텍스트=${translatedPage?.text?.substring(0, 50)}...`);
        
        if (hasTranslation) {
            console.log(`⏭️ 페이지 ${page.pageNumber} 이미 번역됨, 건너뛰기`);
            successCount++;
            continue;
        }
        
        console.log(`🌐 페이지 ${page.pageNumber}/${totalPages} 번역 중...`);
        
        // 버튼 업데이트
        if (translateAllBtn) {
            translateAllBtn.innerHTML = `<i class="fas fa-spinner fa-spin text-xl"></i><span>번역 중... (${i + 1}/${totalPages})</span>`;
        }
        
        try {
            const sourceText = page.text;
            
            if (!sourceText || sourceText.trim() === '') {
                console.log(`⚠️ 페이지 ${page.pageNumber} 텍스트 없음, 건너뛰기`);
                continue;
            }
            
            const response = await axios.post('/api/translate-page', {
                text: sourceText,
                targetLanguage: currentLanguage,
                context: {
                    title: currentStorybook.title,
                    theme: currentStorybook.theme,
                    characters: currentStorybook.characters ? currentStorybook.characters.map(c => c.name).join(', ') : ''
                }
            }, {
                timeout: 30000  // 30초
            });
            
            if (response.data.success) {
                // translations 업데이트
                if (!currentStorybook.translations) {
                    currentStorybook.translations = {};
                }
                if (!currentStorybook.translations[currentLanguage]) {
                    currentStorybook.translations[currentLanguage] = currentStorybook.pages.map(p => ({
                        pageNumber: p.pageNumber,
                        text: ''
                    }));
                }
                
                // 해당 페이지 번역 텍스트 저장
                const translationPage = currentStorybook.translations[currentLanguage].find(p => p.pageNumber === page.pageNumber);
                if (translationPage) {
                    translationPage.text = response.data.translatedText;
                }
                
                // ✅ 실시간 UI 업데이트 - 해당 페이지의 textarea에 번역된 텍스트 표시
                const pageTextarea = document.querySelector(`textarea[onchange*="updatePageText(${i},"]`);
                if (pageTextarea) {
                    pageTextarea.value = response.data.translatedText;
                    console.log(`🔄 페이지 ${page.pageNumber} UI 업데이트 완료`);
                }
                
                successCount++;
                console.log(`✅ 페이지 ${page.pageNumber} 번역 완료`);
                
                // 중간 저장 (5페이지마다) - await 추가하여 저장 완료 대기
                if ((i + 1) % 5 === 0) {
                    await saveToR2(currentStorybook);
                    console.log(`💾 중간 저장 완료 (${i + 1}/${totalPages})`);
                }
                
            } else {
                throw new Error(response.data.error || '번역 실패');
            }
            
        } catch (error) {
            console.error(`❌ 페이지 ${page.pageNumber} 번역 실패:`, error);
            failCount++;
            
            // 3번 재시도
            let retryCount = 0;
            const maxRetries = 3;
            let retrySuccess = false;
            
            while (retryCount < maxRetries && !retrySuccess) {
                retryCount++;
                console.log(`🔄 페이지 ${page.pageNumber} 재시도 중... (${retryCount}/${maxRetries})`);
                
                try {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
                    
                    const retryResponse = await axios.post('/api/translate-page', {
                        text: page.text,
                        targetLanguage: currentLanguage,
                        context: {
                            title: currentStorybook.title,
                            theme: currentStorybook.theme,
                            characters: currentStorybook.characters ? currentStorybook.characters.map(c => c.name).join(', ') : ''
                        }
                    }, {
                        timeout: 30000
                    });
                    
                    if (retryResponse.data.success) {
                        if (!currentStorybook.translations) {
                            currentStorybook.translations = {};
                        }
                        if (!currentStorybook.translations[currentLanguage]) {
                            currentStorybook.translations[currentLanguage] = currentStorybook.pages.map(p => ({
                                pageNumber: p.pageNumber,
                                text: ''
                            }));
                        }
                        
                        const translationPage = currentStorybook.translations[currentLanguage].find(p => p.pageNumber === page.pageNumber);
                        if (translationPage) {
                            translationPage.text = retryResponse.data.translatedText;
                        }
                        
                        // ✅ 실시간 UI 업데이트 - 재시도 성공 시에도 즉시 표시
                        const pageTextarea = document.querySelector(`textarea[onchange*="updatePageText(${i},"]`);
                        if (pageTextarea) {
                            pageTextarea.value = retryResponse.data.translatedText;
                            console.log(`🔄 페이지 ${page.pageNumber} UI 업데이트 완료 (재시도)`);
                        }
                        
                        retrySuccess = true;
                        failCount--; // 재시도 성공 시 실패 카운트 감소
                        successCount++;
                        console.log(`✅ 페이지 ${page.pageNumber} 재시도 성공!`);
                    }
                } catch (retryError) {
                    console.error(`❌ 재시도 ${retryCount} 실패:`, retryError);
                    
                    if (retryCount >= maxRetries) {
                        // 모든 재시도 실패 시에만 확인 요청
                        if (!confirm(`페이지 ${page.pageNumber} 번역이 ${maxRetries}번 모두 실패했습니다.\n\n계속 진행하시겠습니까?`)) {
                            // 최종 저장 후 종료
                            console.log('💾 중단 전 저장 중...');
                            await saveToR2(currentStorybook);
                            if (translateAllBtn) {
                                translateAllBtn.disabled = false;
                                translateAllBtn.innerHTML = '<i class="fas fa-language text-xl"></i><span>모두 번역하기</span>';
                            }
                            return;
                        }
                    }
                }
            }
        }
        
        // 다음 페이지 전 짧은 대기 (API 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 최종 저장 - R2에 확실히 저장될 때까지 대기
    console.log('💾 최종 저장 중...');
    await saveToR2(currentStorybook);
    console.log('✅ 최종 저장 완료');
    
    // UI 업데이트
    displayStorybook(currentStorybook);
    
    // 버튼 복원
    if (translateAllBtn) {
        translateAllBtn.disabled = false;
        translateAllBtn.innerHTML = '<i class="fas fa-language text-xl"></i><span>모두 번역하기</span>';
    }
    
    // 완료 알림
    if (successCount > 0) {
        showNotification('success', '모든 번역 완료! 🌐', `${successCount}개의 페이지가 번역되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`);
        alert(`✅ 번역 완료!\n\n성공: ${successCount}개\n실패: ${failCount}개`);
    } else {
        alert('번역된 페이지가 없습니다.');
    }
    
    console.log(`✅ 모든 페이지 번역 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
}

// 동화책 카테고리 업데이트
function updateStorybookCategory(category) {
    if (!currentStorybook) {
        console.error('❌ 동화책이 선택되지 않았습니다.');
        return;
    }
    
    console.log(`📚 카테고리 업데이트: ${category}`);
    
    // 카테고리 저장
    currentStorybook.category = category;
    
    // R2에 자동 저장
    saveCurrentStorybook();
    
    // 성공 알림
    showNotification('success', '카테고리 저장 완료', `"${category || '미지정'}"로 설정되었습니다.`);
}

// 📚 검색 및 필터 기능
let currentCategoryFilter = '';  // 현재 선택된 카테고리
let currentSearchText = '';      // 현재 검색어
let currentSortOption = 'title'; // 현재 정렬 옵션 (title|completion|latest)
let sortAscending = true;        // 정렬 순서 (true: 오름차순, false: 내림차순)

// 카테고리별 필터링
function filterByCategory(category) {
    console.log(`📂 카테고리 필터: ${category || '전체'}`);
    
    currentCategoryFilter = category;
    
    // 버튼 활성화 상태 업데이트
    const buttons = document.querySelectorAll('.category-filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 클릭된 버튼 활성화
    event.target.classList.add('active');
    
    // 필터 적용
    applyBookFilters();
}

// 검색어 필터링
function filterBooks() {
    const searchInput = document.getElementById('searchInput');
    currentSearchText = searchInput.value.toLowerCase().trim();
    
    console.log(`🔍 검색: "${currentSearchText}"`);
    
    // 필터 적용
    applyBookFilters();
}

// 정렬 옵션 변경
function applySortOption(sortOption) {
    console.log(`🔄 정렬 옵션: ${sortOption}`);
    currentSortOption = sortOption;
    applyBookFilters();
}

// 정렬 순서 토글
function toggleSortOrder() {
    sortAscending = !sortAscending;
    
    // 아이콘 변경
    const icon = document.getElementById('sortOrderIcon');
    if (icon) {
        if (sortAscending) {
            icon.className = 'fas fa-sort-amount-down text-gray-600';
        } else {
            icon.className = 'fas fa-sort-amount-up text-gray-600';
        }
    }
    
    console.log(`🔄 정렬 순서: ${sortAscending ? '오름차순' : '내림차순'}`);
    applyBookFilters();
}

// 통합 필터 적용
function applyBookFilters() {
    const listDiv = document.getElementById('bookList');
    const bookCountSpan = document.getElementById('bookCount');
    
    // undefined, null 항목 필터링
    const validBooks = storybooks.filter(book => book && book.id);
    
    // 필터링 로직
    const filteredBooks = validBooks.filter(book => {
        // 카테고리 매칭
        const categoryMatch = currentCategoryFilter === '' || 
                            (book.category || '') === currentCategoryFilter;
        
        // 검색어 매칭
        const searchMatch = currentSearchText === '' || 
                          (book.title || '').toLowerCase().includes(currentSearchText);
        
        return categoryMatch && searchMatch;
    });
    
    console.log(`✅ 필터링 결과: ${filteredBooks.length}개 (전체: ${validBooks.length}개)`);
    console.log(`   카테고리: "${currentCategoryFilter || '전체'}", 검색어: "${currentSearchText || '없음'}"`);
    
    // 결과 개수 업데이트
    if (bookCountSpan) {
        bookCountSpan.textContent = filteredBooks.length;
    }
    
    // 정렬
    if (currentSortOption === 'title') {
        // 가나다순 (제목)
        filteredBooks.sort((a, b) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            const result = titleA.localeCompare(titleB, 'ko');
            return sortAscending ? result : -result;
        });
    } else if (currentSortOption === 'completion') {
        // 완성도순
        filteredBooks.sort((a, b) => {
            const rateA = calculateCompletionRate(a);
            const rateB = calculateCompletionRate(b);
            const result = rateB - rateA; // 기본: 높은 순
            return sortAscending ? result : -result;
        });
    } else if (currentSortOption === 'latest') {
        // 최신순 (생성일)
        filteredBooks.sort((a, b) => {
            const timeA = a.id ? parseInt(a.id) : 0;
            const timeB = b.id ? parseInt(b.id) : 0;
            const result = timeB - timeA; // 기본: 최신 순
            return sortAscending ? result : -result;
        });
    }
    
    console.log(`📊 정렬 적용: ${currentSortOption} (${sortAscending ? '오름차순' : '내림차순'}, ${filteredBooks.length}개)`);
    
    // 빈 결과 처리
    if (filteredBooks.length === 0) {
        const message = currentSearchText !== '' || currentCategoryFilter !== '' 
            ? '검색 결과가 없습니다.' 
            : '아직 만든 동화책이 없어요';
        listDiv.innerHTML = `<p class="text-gray-500 text-center py-4">${message}</p>`;
        return;
    }
    
    // 동화책 목록 렌더링
    listDiv.innerHTML = filteredBooks.map((book, index) => `
        <div 
            class="book-item ${currentStorybook && currentStorybook.id === book.id ? 'active' : ''} p-3 rounded-lg mb-2 border border-gray-200 cursor-move"
            draggable="true"
            data-book-id="${book.id}"
            data-book-index="${index}"
            ondragstart="handleDragStart(event)"
            ondragover="handleDragOver(event)"
            ondragenter="handleDragEnter(event)"
            ondragleave="handleDragLeave(event)"
            ondrop="handleDrop(event)"
            ondragend="handleDragEnd(event)"
        >
            <!-- 드래그 핸들 & 제목 -->
            <div class="flex items-start gap-2 mb-2">
                <div class="text-gray-400 cursor-move mt-1" title="드래그하여 순서 변경">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="flex-1 min-w-0" onclick="selectStorybook('${book.id}')">
                    <input 
                        type="text" 
                        value="${book.title}"
                        class="w-full font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 outline-none text-sm px-1 -ml-1"
                        onclick="event.stopPropagation(); this.select();"
                        onchange="updateBookTitleInList('${book.id}', this.value)"
                        onblur="this.classList.remove('border-purple-500')"
                        title="클릭하여 제목 수정"
                    />
                    <p class="text-xs text-gray-500 mt-1 px-1">
                        <i class="fas fa-child mr-1"></i>${book.targetAge}세 
                        <i class="fas fa-file-alt ml-2 mr-1"></i>${book.pages.length}p
                        ${book.category ? `<i class="fas fa-tag ml-2 mr-1"></i>${book.category}` : ''}
                    </p>
                </div>
            </div>
            
            <!-- 뷰어 공개 체크박스 -->
            <div class="flex items-center gap-2 mt-2 px-1 mb-2">
                <input 
                    type="checkbox" 
                    id="public-${book.id}"
                    ${book.isPublic ? 'checked' : ''}
                    onclick="togglePublicStatus('${book.id}')"
                    class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                />
                <label for="public-${book.id}" class="text-xs text-gray-600 cursor-pointer">
                    <i class="fas fa-globe mr-1"></i>뷰어에 공개
                </label>
            </div>
            
            <!-- 액션 버튼 -->
            <div class="flex gap-1">
                <button 
                    onclick="checkStorybookStatus('${book.id}')" 
                    class="flex-1 ${getCompletionButtonColor(book)} text-white text-xs py-1.5 px-2 rounded transition"
                    title="완성도 확인"
                >
                    <i class="fas fa-check-circle mr-1"></i>확인
                </button>
                <button 
                    onclick="selectStorybook('${book.id}')" 
                    class="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs py-1.5 px-2 rounded hover:from-purple-600 hover:to-pink-600 transition"
                >
                    <i class="fas fa-edit mr-1"></i>편집
                </button>
                <button 
                    onclick="duplicateStorybookById('${book.id}')" 
                    class="bg-gradient-to-r from-green-500 to-teal-500 text-white text-xs py-1.5 px-2 rounded hover:from-green-600 hover:to-teal-600 transition"
                    title="복사"
                >
                    <i class="fas fa-copy"></i>
                </button>
                <button 
                    onclick="deleteStorybook('${book.id}')" 
                    class="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs py-1.5 px-2 rounded hover:from-red-600 hover:to-pink-600 transition"
                    title="삭제"
                >
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 동화책 완성도 계산 (간단 버전)
function calculateCompletionRate(book) {
    if (!book || !book.pages) return 0;
    
    // 사용 가능한 언어 목록
    const availableLanguages = ['ko'];
    if (book.translations && typeof book.translations === 'object') {
        availableLanguages.push(...Object.keys(book.translations));
    }
    
    // 각 항목 카운트
    const characterTotal = book.characters?.length || 0;
    const characterWithImage = book.characters?.filter(c => c.referenceImage).length || 0;
    
    const keyObjectTotal = book.key_objects?.length || 0;
    const keyObjectWithImage = book.keyObjectImages?.filter(img => img?.imageUrl).length || 0;
    
    const pageTotal = book.pages.length;
    const illustrationCount = book.pages.filter(p => p.illustrationImage).length;
    
    // 언어별 텍스트/TTS 카운트
    let textCount = 0;
    let ttsCount = 0;
    
    availableLanguages.forEach(lang => {
        book.pages.forEach((page, idx) => {
            // 텍스트 체크
            if (lang === 'ko') {
                if (page.text && page.text.trim()) textCount++;
            } else {
                const translatedText = book.translations?.[lang]?.[idx];
                if (translatedText && typeof translatedText === 'string' && translatedText.trim()) {
                    textCount++;
                }
            }
            
            // TTS 체크
            if (lang === 'ko') {
                if (page.audioUrl) ttsCount++;
            } else {
                if (page.translatedAudioUrls?.[lang]) ttsCount++;
            }
        });
    });
    
    // 총 항목 및 완료 항목
    const totalItems = 
        characterTotal + 
        keyObjectTotal + 
        pageTotal + // 삽화
        (availableLanguages.length * pageTotal) + // 텍스트
        (availableLanguages.length * pageTotal) + // TTS
        1; // 표지
    
    const completedItems = 
        characterWithImage + 
        keyObjectWithImage + 
        illustrationCount + 
        textCount + 
        ttsCount + 
        (book.coverImage ? 1 : 0);
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
}

// 완성도에 따른 버튼 색상 반환
function getCompletionButtonColor(book) {
    const rate = calculateCompletionRate(book);
    
    if (rate >= 90) {
        // 90% 이상: 진한 파란색
        return 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800';
    } else if (rate >= 70) {
        // 70-89%: 파란색
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600';
    } else if (rate >= 50) {
        // 50-69%: 초록색
        return 'bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600';
    } else if (rate >= 30) {
        // 30-49%: 주황색
        return 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600';
    } else {
        // 0-29%: 빨간색
        return 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600';
    }
}

// 동화책 완성도 확인 팝업
function checkStorybookStatus(bookId) {
    const book = storybooks.find(b => b.id === bookId);
    if (!book) {
        alert('동화책을 찾을 수 없습니다.');
        return;
    }
    
    // 사용 가능한 언어 목록 (한국어 + 번역 언어들)
    const availableLanguages = ['ko'];
    if (book.translations && typeof book.translations === 'object') {
        availableLanguages.push(...Object.keys(book.translations));
    }
    
    // 언어 이름 매핑
    const languageNames = {
        'ko': '한국어',
        'en': '영어',
        'ja': '일본어',
        'zh': '중국어',
        'es': '스페인어',
        'fr': '프랑스어',
        'de': '독일어'
    };
    
    // 상태 체크
    const status = {
        // 캐릭터 레퍼런스
        characterReferences: {
            total: book.characters?.length || 0,
            withImage: book.characters?.filter(c => c.referenceImage).length || 0,
            missing: []
        },
        // 핵심 단어
        keyObjects: {
            total: book.key_objects?.length || 0,
            withImage: book.keyObjectImages?.filter(img => img?.imageUrl).length || 0,
            missing: []
        },
        // 페이지 삽화
        illustrations: {
            total: book.pages?.length || 0,
            withIllustration: book.pages?.filter(p => p.illustrationImage).length || 0,
            missing: []
        },
        // 언어별 페이지 텍스트
        textByLanguage: {},
        // 언어별 페이지 TTS
        ttsByLanguage: {},
        // 표지
        cover: {
            hasImage: !!book.coverImage
        }
    };
    
    // 언어별 텍스트/TTS 상태 초기화
    availableLanguages.forEach(lang => {
        status.textByLanguage[lang] = {
            language: languageNames[lang] || lang,
            total: book.pages?.length || 0,
            withText: 0,
            missing: []
        };
        
        status.ttsByLanguage[lang] = {
            language: languageNames[lang] || lang,
            total: book.pages?.length || 0,
            withTTS: 0,
            missing: []
        };
    });
    
    // 캐릭터 레퍼런스 누락 항목
    if (book.characters) {
        book.characters.forEach((char, idx) => {
            if (!char.referenceImage) {
                status.characterReferences.missing.push(`${idx + 1}. ${char.name}`);
            }
        });
    }
    
    // 핵심 단어 이미지 누락 항목
    if (book.key_objects) {
        book.key_objects.forEach((obj, idx) => {
            const hasImage = book.keyObjectImages?.[idx]?.imageUrl;
            if (!hasImage) {
                status.keyObjects.missing.push(`${idx + 1}. ${obj.korean || obj.name}`);
            }
        });
    }
    
    // 페이지 삽화 누락 항목
    if (book.pages) {
        book.pages.forEach((page, idx) => {
            const pageNum = idx + 1;
            
            // 삽화 체크
            if (!page.illustrationImage) {
                status.illustrations.missing.push(`페이지 ${pageNum}`);
            }
            
            // 언어별 텍스트 체크
            availableLanguages.forEach(lang => {
                let hasText = false;
                
                if (lang === 'ko') {
                    // 한국어: 원본 텍스트
                    hasText = page.text && page.text.trim();
                } else {
                    // 번역 언어
                    const translatedText = book.translations?.[lang]?.[idx];
                    hasText = translatedText && typeof translatedText === 'string' && translatedText.trim();
                }
                
                if (hasText) {
                    status.textByLanguage[lang].withText++;
                } else {
                    status.textByLanguage[lang].missing.push(`페이지 ${pageNum}`);
                }
            });
            
            // 언어별 TTS 체크
            availableLanguages.forEach(lang => {
                let hasTTS = false;
                
                if (lang === 'ko') {
                    // 한국어: 원본 audioUrl
                    hasTTS = !!page.audioUrl;
                } else {
                    // 번역 언어
                    hasTTS = !!page.translatedAudioUrls?.[lang];
                }
                
                if (hasTTS) {
                    status.ttsByLanguage[lang].withTTS++;
                } else {
                    status.ttsByLanguage[lang].missing.push(`페이지 ${pageNum}`);
                }
            });
        });
    }
    
    // 완성도 계산 (언어별 텍스트/TTS 포함)
    const totalTextItems = availableLanguages.length * (book.pages?.length || 0);
    const completedTextItems = availableLanguages.reduce((sum, lang) => 
        sum + status.textByLanguage[lang].withText, 0);
    
    const totalTTSItems = availableLanguages.length * (book.pages?.length || 0);
    const completedTTSItems = availableLanguages.reduce((sum, lang) => 
        sum + status.ttsByLanguage[lang].withTTS, 0);
    
    const totalItems = 
        status.characterReferences.total + 
        status.keyObjects.total + 
        status.illustrations.total + 
        totalTextItems + 
        totalTTSItems + 
        1; // 표지
    
    const completedItems = 
        status.characterReferences.withImage + 
        status.keyObjects.withImage + 
        status.illustrations.withIllustration + 
        completedTextItems + 
        completedTTSItems + 
        (status.cover.hasImage ? 1 : 0);
    
    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    // 팝업 HTML 생성
    const popupHTML = `
        <div id="statusPopup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeStatusPopup()">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <!-- 헤더 -->
                <div class="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold mb-2">
                                <i class="fas fa-check-circle mr-2"></i>${book.title}
                            </h2>
                            <p class="text-sm opacity-90">완성도: ${completionRate}%</p>
                        </div>
                        <button onclick="closeStatusPopup()" class="text-white hover:text-gray-200 text-2xl">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- 진행률 바 -->
                    <div class="mt-4 bg-white bg-opacity-20 rounded-full h-4 overflow-hidden">
                        <div class="bg-white h-full transition-all duration-500" style="width: ${completionRate}%"></div>
                    </div>
                </div>
                
                <!-- 내용 -->
                <div class="p-6 space-y-6">
                    <!-- 표지 -->
                    <div class="border-2 ${status.cover.hasImage ? 'border-green-500' : 'border-red-500'} rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-800 flex items-center">
                                <i class="fas fa-image mr-2 text-indigo-500"></i>표지 이미지
                            </h3>
                            <span class="text-2xl">${status.cover.hasImage ? '✅' : '❌'}</span>
                        </div>
                        ${status.cover.hasImage ? 
                            '<p class="text-sm text-green-600"><i class="fas fa-check mr-1"></i>표지 이미지 있음</p>' :
                            '<p class="text-sm text-red-600"><i class="fas fa-exclamation-triangle mr-1"></i>표지 이미지 없음</p>'
                        }
                    </div>
                    
                    <!-- 캐릭터 레퍼런스 -->
                    <div class="border-2 ${status.characterReferences.missing.length === 0 ? 'border-green-500' : 'border-yellow-500'} rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-800 flex items-center">
                                <i class="fas fa-user-friends mr-2 text-blue-500"></i>캐릭터 레퍼런스
                            </h3>
                            <span class="text-sm font-semibold">${status.characterReferences.withImage}/${status.characterReferences.total}</span>
                        </div>
                        ${status.characterReferences.missing.length > 0 ? `
                            <p class="text-sm text-yellow-600 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>이미지 누락:</p>
                            <ul class="text-sm text-gray-700 ml-4 space-y-1">
                                ${status.characterReferences.missing.map(item => `<li>• ${item}</li>`).join('')}
                            </ul>
                        ` : '<p class="text-sm text-green-600"><i class="fas fa-check mr-1"></i>모든 캐릭터에 레퍼런스 이미지 있음</p>'}
                    </div>
                    
                    <!-- 핵심 단어 -->
                    <div class="border-2 ${status.keyObjects.missing.length === 0 ? 'border-green-500' : 'border-yellow-500'} rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-800 flex items-center">
                                <i class="fas fa-cube mr-2 text-orange-500"></i>핵심 단어 이미지
                            </h3>
                            <span class="text-sm font-semibold">${status.keyObjects.withImage}/${status.keyObjects.total}</span>
                        </div>
                        ${status.keyObjects.missing.length > 0 ? `
                            <p class="text-sm text-yellow-600 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>이미지 누락:</p>
                            <ul class="text-sm text-gray-700 ml-4 space-y-1">
                                ${status.keyObjects.missing.map(item => `<li>• ${item}</li>`).join('')}
                            </ul>
                        ` : '<p class="text-sm text-green-600"><i class="fas fa-check mr-1"></i>모든 핵심 단어에 이미지 있음</p>'}
                    </div>
                    
                    <!-- 페이지 삽화 (순서 변경: 텍스트보다 먼저) -->
                    <div class="border-2 ${status.illustrations.missing.length === 0 ? 'border-green-500' : 'border-red-500'} rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-800 flex items-center">
                                <i class="fas fa-image mr-2 text-pink-500"></i>페이지 삽화
                            </h3>
                            <span class="text-sm font-semibold">${status.illustrations.withIllustration}/${status.illustrations.total}</span>
                        </div>
                        ${status.illustrations.missing.length > 0 ? `
                            <p class="text-sm text-red-600 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>삽화 누락:</p>
                            <p class="text-sm text-gray-700 ml-4">${status.illustrations.missing.join(', ')}</p>
                        ` : '<p class="text-sm text-green-600"><i class="fas fa-check mr-1"></i>모든 페이지에 삽화 있음</p>'}
                    </div>
                    
                    <!-- 언어별 페이지 텍스트 -->
                    ${availableLanguages.map(lang => {
                        const langStatus = status.textByLanguage[lang];
                        const allComplete = langStatus.missing.length === 0;
                        return `
                        <div class="border-2 ${allComplete ? 'border-green-500' : 'border-red-500'} rounded-xl p-4">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="font-bold text-gray-800 flex items-center">
                                    <i class="fas fa-align-left mr-2 text-purple-500"></i>페이지 텍스트 (${langStatus.language})
                                </h3>
                                <span class="text-sm font-semibold">${langStatus.withText}/${langStatus.total}</span>
                            </div>
                            ${langStatus.missing.length > 0 ? `
                                <p class="text-sm text-red-600 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>텍스트 누락:</p>
                                <p class="text-sm text-gray-700 ml-4">${langStatus.missing.join(', ')}</p>
                            ` : `<p class="text-sm text-green-600"><i class="fas fa-check mr-1"></i>모든 페이지에 ${langStatus.language} 텍스트 있음</p>`}
                        </div>
                        `;
                    }).join('')}
                    
                    <!-- 언어별 페이지 TTS -->
                    ${availableLanguages.map(lang => {
                        const langStatus = status.ttsByLanguage[lang];
                        const allComplete = langStatus.missing.length === 0;
                        return `
                        <div class="border-2 ${allComplete ? 'border-green-500' : 'border-yellow-500'} rounded-xl p-4">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="font-bold text-gray-800 flex items-center">
                                    <i class="fas fa-volume-up mr-2 text-teal-500"></i>페이지 TTS 음성 (${langStatus.language})
                                </h3>
                                <span class="text-sm font-semibold">${langStatus.withTTS}/${langStatus.total}</span>
                            </div>
                            ${langStatus.missing.length > 0 ? `
                                <p class="text-sm text-yellow-600 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>TTS 누락:</p>
                                <p class="text-sm text-gray-700 ml-4">${langStatus.missing.join(', ')}</p>
                            ` : `<p class="text-sm text-green-600"><i class="fas fa-check mr-1"></i>모든 페이지에 ${langStatus.language} TTS 음성 있음</p>`}
                        </div>
                        `;
                    }).join('')}
                    
                    <!-- 요약 -->
                    <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-chart-pie mr-2 text-indigo-500"></i>전체 요약
                        </h3>
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p class="text-gray-600">총 항목</p>
                                <p class="text-xl font-bold text-gray-800">${totalItems}개</p>
                            </div>
                            <div>
                                <p class="text-gray-600">완료 항목</p>
                                <p class="text-xl font-bold text-green-600">${completedItems}개</p>
                            </div>
                            <div>
                                <p class="text-gray-600">누락 항목</p>
                                <p class="text-xl font-bold text-red-600">${totalItems - completedItems}개</p>
                            </div>
                            <div>
                                <p class="text-gray-600">완성도</p>
                                <p class="text-xl font-bold text-purple-600">${completionRate}%</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 푸터 -->
                <div class="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl border-t">
                    <button 
                        onclick="closeStatusPopup()" 
                        class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition"
                    >
                        <i class="fas fa-check mr-2"></i>확인
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 팝업 추가
    const existingPopup = document.getElementById('statusPopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

// 완성도 확인 팝업 닫기
function closeStatusPopup() {
    const popup = document.getElementById('statusPopup');
    if (popup) {
        popup.remove();
    }
}

// 이미지 삭제 버튼 토글
function toggleImageDeleteButton(imageId) {
    // 모든 삭제 버튼 숨기기
    document.querySelectorAll('[id$="-delete-btn"]').forEach(btn => {
        if (!btn.id.startsWith(imageId)) {
            btn.classList.add('hidden');
        }
    });
    
    // 클릭된 이미지의 삭제 버튼 토글
    const deleteBtn = document.getElementById(`${imageId}-delete-btn`);
    if (deleteBtn) {
        deleteBtn.classList.toggle('hidden');
    }
}

// 외부 클릭 시 모든 삭제 버튼 숨기기
document.addEventListener('click', (e) => {
    // 이미지나 삭제 버튼이 아닌 곳을 클릭한 경우
    if (!e.target.closest('img') && !e.target.closest('[id$="-delete-btn"]')) {
        document.querySelectorAll('[id$="-delete-btn"]').forEach(btn => {
            btn.classList.add('hidden');
        });
    }
});

// 캐릭터 레퍼런스 이미지 삭제
async function deleteCharacterImage(charIndex) {
    if (!confirm('이 캐릭터의 레퍼런스 이미지를 삭제하시겠습니까?')) {
        return;
    }
    
    if (!currentStorybook.characters || !currentStorybook.characters[charIndex]) {
        alert('캐릭터를 찾을 수 없습니다.');
        return;
    }
    
    // 이미지 삭제
    currentStorybook.characters[charIndex].referenceImage = null;
    
    // 저장 및 화면 갱신
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    showNotification('success', '이미지 삭제 완료', '캐릭터 레퍼런스 이미지가 삭제되었습니다.');
}

// 핵심 단어 이미지 삭제
async function deleteKeyObjectImage(objIndex) {
    if (!confirm('이 핵심 단어의 이미지를 삭제하시겠습니까?')) {
        return;
    }
    
    if (!currentStorybook.keyObjectImages || !currentStorybook.keyObjectImages[objIndex]) {
        alert('이미지를 찾을 수 없습니다.');
        return;
    }
    
    // 이미지 삭제
    currentStorybook.keyObjectImages[objIndex] = null;
    
    // 저장 및 화면 갱신
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    showNotification('success', '이미지 삭제 완료', '핵심 단어 이미지가 삭제되었습니다.');
}

// 페이지 삽화 이미지 삭제
async function deletePageIllustration(pageIndex) {
    if (!confirm('이 페이지의 삽화를 삭제하시겠습니까?')) {
        return;
    }
    
    if (!currentStorybook.pages || !currentStorybook.pages[pageIndex]) {
        alert('페이지를 찾을 수 없습니다.');
        return;
    }
    
    // 이미지 삭제
    currentStorybook.pages[pageIndex].illustrationImage = null;
    
    // 저장 및 화면 갱신
    saveCurrentStorybook();
    displayStorybook(currentStorybook);
    
    showNotification('success', '이미지 삭제 완료', '페이지 삽화가 삭제되었습니다.');
}

