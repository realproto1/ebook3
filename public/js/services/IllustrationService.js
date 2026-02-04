/**
 * IllustrationService.js
 * 삽화 생성/업데이트 통합 서비스
 * - 생성과 재생성 로직을 공통화
 * - 레퍼런스 이미지 수집 전략 통합
 * - 아트 스타일 변경 감지 및 처리
 */

class IllustrationService {
    constructor() {
        this.imageService = null;
        this.uiHelper = null;
    }

    /**
     * 초기화: 의존성 주입
     */
    initialize(imageService, uiHelper) {
        this.imageService = imageService;
        this.uiHelper = uiHelper;
    }

    /**
     * 삽화 생성/재생성 통합 메서드
     * @param {Object} storybook - 현재 스토리북
     * @param {Number} pageIndex - 페이지 인덱스
     * @param {Object} options - 옵션 { imageSettings, saveCallback, updateDisplayCallback }
     */
    async generateOrUpdate(storybook, pageIndex, options = {}) {
        const { imageSettings = {}, saveCallback, updateDisplayCallback } = options;
        
        const page = storybook.pages[pageIndex];
        const illustrationDiv = document.getElementById(`illustration-${pageIndex}`);

        try {
            // 1. 입력 데이터 수집
            const inputData = this._collectInputData(storybook, pageIndex, page);
            
            // 2. 캐릭터 레퍼런스 검증
            const characterReferences = this._getCharacterReferences(storybook);
            if (characterReferences.length === 0) {
                alert('먼저 캐릭터 레퍼런스 이미지를 생성해주세요!');
                return { success: false, error: 'No character references' };
            }

            // 3. 로딩 UI 표시
            this._showLoadingUI(illustrationDiv);

            // 4. 프롬프트 및 레퍼런스 이미지 빌드
            const { refImageUrls, filteredCharacterRefs } = await this._buildReferenceImages(
                storybook, 
                pageIndex, 
                page, 
                characterReferences, 
                inputData
            );

            // 5. API 호출
            const result = await this._callGenerateAPI(
                page, 
                inputData, 
                refImageUrls, 
                imageSettings, 
                storybook, 
                pageIndex, 
                illustrationDiv
            );

            // 6. 결과 처리
            if (result && result.success && result.imageUrl) {
                return await this._handleSuccess(
                    storybook, 
                    pageIndex, 
                    page, 
                    result.imageUrl, 
                    inputData, 
                    illustrationDiv, 
                    saveCallback, 
                    updateDisplayCallback
                );
            } else {
                throw new Error(result?.error || 'ImageService에서 이미지 URL을 받지 못했습니다.');
            }

        } catch (error) {
            return this._handleError(error, page, pageIndex, illustrationDiv);
        }
    }

    /**
     * 1. 입력 데이터 수집
     */
    _collectInputData(storybook, pageIndex, page) {
        const sceneDesc = document.getElementById(`scene-combined-${pageIndex}`)?.value || page.scene_description || '';
        const artStyle = storybook.artStyle || '디즈니 스타일';
        const editNote = document.getElementById(`edit-note-${pageIndex}`)?.value.trim() || '';
        
        const sceneStructure = {
            characters: document.getElementById(`scene-characters-${pageIndex}`)?.value || page.scene_characters || '',
            background: document.getElementById(`scene-background-${pageIndex}`)?.value || page.scene_background || '',
            atmosphere: document.getElementById(`scene-atmosphere-${pageIndex}`)?.value || page.scene_atmosphere || ''
        };

        return { sceneDesc, artStyle, editNote, sceneStructure };
    }

    /**
     * 2. 캐릭터 레퍼런스 가져오기
     */
    _getCharacterReferences(storybook) {
        return storybook.characters
            .filter(char => char.referenceImage)
            .map(char => ({ 
                name: char.name, 
                description: char.description, 
                referenceImage: char.referenceImage 
            }));
    }

    /**
     * 3. 로딩 UI 표시
     */
    _showLoadingUI(element) {
        if (this.uiHelper && element) {
            this.uiHelper.showLoadingUI(element, 'AI가 삽화를 생성하는 중...');
        }
    }

    /**
     * 4. 레퍼런스 이미지 수집 전략
     */
    async _buildReferenceImages(storybook, pageIndex, page, characterReferences, inputData) {
        const { sceneStructure, editNote, artStyle } = inputData;
        
        const isRegeneration = !!page.illustrationImage;
        const hasEditNote = editNote && editNote.trim().length > 0;

        // 🎯 페이지에 등장하는 캐릭터 자동 감지
        const pageText = page.text || '';
        const sceneCharacters = (sceneStructure && sceneStructure.characters) || '';
        const allText = `${pageText} ${sceneCharacters} ${editNote}`.toLowerCase();

        // 등장하는 캐릭터만 필터링
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

        // 레퍼런스 이미지 수집
        let refImageUrls = filteredCharacterRefs
            .map(char => char.referenceImage)
            .filter(url => url);

        console.log(`👥 등장 캐릭터 레퍼런스: ${refImageUrls.length}개`, refImageUrls);

        // 아트 스타일 변경 감지
        const artStyleChanged = storybook._artStyleChanged || false;
        const editMentionsStyle = editNote.toLowerCase().includes('스타일') || 
                                 editNote.toLowerCase().includes('style') ||
                                 editNote.toLowerCase().includes('아트');

        if (artStyleChanged || editMentionsStyle) {
            console.log('🎨 아트 스타일 변경 감지: 기존 이미지 참조 제외');
        }

        // 레퍼런스 이미지 수집 전략
        if (isRegeneration && hasEditNote) {
            // 재생성 + 수정사항 있음
            console.log('🔄 재생성 모드 (수정사항 있음): 모든 참조 이미지 사용');
            
            // 전 페이지 (스타일 변경 시 제외)
            if (pageIndex > 0 && !artStyleChanged && !editMentionsStyle) {
                const previousPage = storybook.pages[pageIndex - 1];
                if (previousPage && previousPage.illustrationImage) {
                    refImageUrls.push(previousPage.illustrationImage);
                }
            }
            
            // 현재 이미지 (스타일 변경 시 제외)
            if (page.illustrationImage && !artStyleChanged && !editMentionsStyle) {
                refImageUrls.push(page.illustrationImage);
            }
            
            // 사용자 선택 참조
            const selectedRefImages = this._getSelectedReferenceImages(pageIndex);
            if (selectedRefImages.length > 0) {
                console.log(`🖼️ ${selectedRefImages.length}개의 참조 이미지 추가`);
                selectedRefImages.forEach(refImg => {
                    if (refImg.imageUrl) {
                        refImageUrls.push(refImg.imageUrl);
                    }
                });
            }
        } else if (isRegeneration && !hasEditNote) {
            // 재생성 + 수정사항 없음
            console.log('🔄 재생성 모드 (변형): 전 페이지 + 현재 이미지 참조');
            
            if (pageIndex > 0) {
                const previousPage = storybook.pages[pageIndex - 1];
                if (previousPage && previousPage.illustrationImage) {
                    refImageUrls.push(previousPage.illustrationImage);
                }
            }
            
            if (page.illustrationImage) {
                refImageUrls.push(page.illustrationImage);
            }
        } else {
            // 신규 생성
            console.log('✨ 신규 생성 모드: 전 페이지 + 사용자 선택 참조');
            
            if (pageIndex > 0) {
                const previousPage = storybook.pages[pageIndex - 1];
                if (previousPage && previousPage.illustrationImage) {
                    console.log(`📖 바로 전 페이지(${pageIndex})의 이미지를 자동 참조`);
                    refImageUrls.push(previousPage.illustrationImage);
                }
            }
            
            const selectedRefImages = this._getSelectedReferenceImages(pageIndex);
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

        return { refImageUrls, filteredCharacterRefs };
    }

    /**
     * 사용자 선택 참조 이미지 가져오기 (window.getSelectedReferenceImages 호출)
     */
    _getSelectedReferenceImages(pageIndex) {
        if (typeof window.getSelectedReferenceImages === 'function') {
            return window.getSelectedReferenceImages(pageIndex);
        }
        return [];
    }

    /**
     * 5. API 호출
     */
    async _callGenerateAPI(page, inputData, refImageUrls, imageSettings, storybook, pageIndex, illustrationDiv) {
        const { sceneDesc, sceneStructure, artStyle, editNote } = inputData;
        
        const service = this.imageService || window.imageService;
        if (!service) {
            throw new Error('ImageService가 로드되지 않았습니다.');
        }

        const pageData = {
            ...page,
            scene_description: sceneDesc,
            scene_structure: sceneStructure
        };

        return await service.generateIllustration(pageData, refImageUrls, {
            model: imageSettings.illustrationModel || 'gemini-3-pro-image-preview',
            aspectRatio: imageSettings.aspectRatio || '16:9',
            artStyle: artStyle,
            editNote: editNote,
            previousPages: pageIndex > 0 ? [storybook.pages[pageIndex - 1]] : [],
            storybookId: storybook.id,
            storybookTitle: storybook.title,
            additionalPrompt: imageSettings.additionalPrompt,
            targetElement: illustrationDiv,
            onStart: (element) => {
                if (element && this.uiHelper) {
                    this.uiHelper.showLoadingUI(element, 'AI가 삽화를 생성하는 중...');
                }
            }
        });
    }

    /**
     * 6. 성공 처리
     */
    async _handleSuccess(storybook, pageIndex, page, imageUrl, inputData, illustrationDiv, saveCallback, updateDisplayCallback) {
        const { sceneDesc, sceneStructure, artStyle, editNote } = inputData;

        // 히스토리 관리
        if (page.illustrationImage) {
            if (!page.illustrationHistory) {
                page.illustrationHistory = [];
            }
            page.illustrationHistory.unshift(page.illustrationImage);
            console.log(`📸 이전 이미지를 히스토리에 추가 (총 ${page.illustrationHistory.length}개)`);

            // 히스토리 10개 제한
            if (page.illustrationHistory.length > 10) {
                const removed = page.illustrationHistory.splice(10);
                console.log(`🗑️ 오래된 히스토리 ${removed.length}개 제거`);
            }
        }

        // 페이지 업데이트
        storybook.pages[pageIndex].illustrationImage = imageUrl;
        storybook.pages[pageIndex].scene_description = sceneDesc;
        storybook.pages[pageIndex].scene_structure = sceneStructure;
        storybook.pages[pageIndex].artStyle = artStyle;
        storybook.pages[pageIndex].editNote = editNote;

        // 아트 스타일 변경 플래그 리셋
        if (storybook._artStyleChanged) {
            delete storybook._artStyleChanged;
            console.log('🎨 아트 스타일 변경 플래그 리셋');
        }

        // 저장 콜백
        if (saveCallback) {
            saveCallback();
        }

        // UI 렌더링
        if (this.uiHelper && illustrationDiv) {
            this.uiHelper.renderIllustration(illustrationDiv, imageUrl, {
                pageIndex: pageIndex,
                storybookTitle: storybook.title,
                history: page.illustrationHistory || []
            });
        } else if (illustrationDiv) {
            // Fallback
            illustrationDiv.innerHTML = `<img src="${imageUrl}" alt="삽화 ${pageIndex + 1}" class="w-full h-full object-cover rounded-lg"/>`;
        }

        // 디스플레이 업데이트 콜백
        if (updateDisplayCallback) {
            updateDisplayCallback();
        }

        console.log('✅ 삽화 생성 완료 및 화면 업데이트');

        return { success: true, imageUrl };
    }

    /**
     * 7. 에러 처리
     */
    _handleError(error, page, pageIndex, illustrationDiv) {
        console.error('❌ 삽화 생성 실패:', error);

        let errorMessage = error.message || '이미지 생성 실패';
        if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
            console.error('📡 서버 에러 메시지:', errorMessage);
        } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
            console.error('📡 서버 에러 메시지:', errorMessage);
        }

        // 기존 이미지가 있으면 유지
        if (page.illustrationImage) {
            if (typeof window.displayStorybook === 'function' && window.currentStorybook) {
                window.displayStorybook(window.currentStorybook);
            }
            if (typeof window.showNotification === 'function') {
                window.showNotification('error', '재생성 실패', `${errorMessage}\n기존 이미지가 유지됩니다.`);
            }
        } else {
            // 재시도 버튼 표시
            if (illustrationDiv) {
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

        return { success: false, error: errorMessage };
    }
}

// 전역 인스턴스 생성
const illustrationService = new IllustrationService();
