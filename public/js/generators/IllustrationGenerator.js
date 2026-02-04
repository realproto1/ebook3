/**
 * IllustrationGenerator - 삽화 생성 전용 클래스
 * BaseGenerator를 상속받아 삽화 생성 로직 구현
 */
class IllustrationGenerator extends BaseGenerator {
    constructor(options = {}) {
        super({
            ...options,
            buttonId: 'generate-all-illust-btn'
        });
        
        this.imageService = options.imageService || window.imageService;
        this.imageSettings = options.imageSettings || window.imageSettings || {};
        this.uiHelper = options.uiHelper || window.UIHelper;
    }

    /**
     * 단일 페이지 삽화 생성
     */
    async generate(pageIndex) {
        if (!this.storybook || !this.storybook.pages[pageIndex]) {
            throw new Error('유효하지 않은 페이지입니다.');
        }

        const page = this.storybook.pages[pageIndex];
        const illustrationDiv = document.getElementById(`illustration-${pageIndex}`);

        // 버튼 ID 동적 설정 (없으면 설정)
        if (!this.buttonId) {
            this.buttonId = `generate-illust-${pageIndex}-btn`;
        }

        try {
            // 버튼 로딩 시작
            this.setButtonLoading(true);
            
            // 로딩 UI
            this.showLoading(illustrationDiv, 'AI가 삽화를 생성하는 중...');

            // 입력 데이터 수집
            const pageData = this._collectPageData(pageIndex);
            const refImageUrls = this._getRelevantCharacterRefs(pageIndex);
            const apiOptions = this._buildApiOptions(pageIndex);

            // 이전 페이지 참조 (연속성)
            if (pageIndex > 0) {
                const prevPage = this.storybook.pages[pageIndex - 1];
                if (prevPage && prevPage.illustrationImage) {
                    apiOptions.previousPages = [prevPage];
                }
            }

            console.log(`📸 페이지 ${page.pageNumber} 삽화 생성 시작`);

            // API 호출
            const result = await this.imageService.generateIllustration(pageData, refImageUrls, apiOptions);

            if (!result || !result.success || !result.imageUrl) {
                throw new Error(result.error || '이미지 생성 실패');
            }

            // 결과 저장
            await this._saveResult(pageIndex, result, pageData, apiOptions);

            // UI 업데이트 (전체 페이지 재렌더링)
            this.updateDisplay();

            console.log(`✅ 페이지 ${page.pageNumber} 삽화 생성 완료`);
            this.showSuccess(`페이지 ${page.pageNumber} 삽화 생성 완료!`);

            return { success: true, imageUrl: result.imageUrl };

        } catch (error) {
            console.error(`❌ 페이지 ${pageIndex} 삽화 생성 실패:`, error);
            
            const errorMessage = this._extractErrorMessage(error);
            this.showError(illustrationDiv, errorMessage, `generateIllustration(${pageIndex})`);
            
            throw error;
        } finally {
            // 버튼 로딩 해제
            this.setButtonLoading(false);
        }
    }

    /**
     * 모든 페이지 삽화 순차 생성
     */
    async generateAll() {
        // 1. 검증
        const validation = this._validateBeforeGeneration();
        if (!validation.valid) {
            alert(validation.message);
            return;
        }

        const pagesToGenerate = validation.pages;
        const estimatedTime = this.estimateTime(pagesToGenerate.length, 8);

        // 2. 사용자 확인
        if (!confirm(`${pagesToGenerate.length}개의 삽화를 순차적으로 생성하시겠습니까?\n\n⭐ 각 페이지가 바로 전 페이지를 참조하여 더 자연스러운 연속성을 만듭니다.\n\n예상 소요 시간: 약 ${estimatedTime}초`)) {
            return;
        }

        // 3. 버튼 로딩 시작
        this.setButtonLoading(true);

        // 4. 모든 페이지 로딩 UI 표시
        this._showAllPagesLoading();

        try {
            let successCount = 0;
            let failCount = 0;

            // 5. 순차적 생성
            for (let i = 0; i < this.storybook.pages.length; i++) {
                const page = this.storybook.pages[i];

                // 이미 생성된 페이지는 건너뛰기
                if (page.illustrationImage) {
                    continue;
                }

                // 진행률 업데이트
                const current = successCount + failCount + 1;
                const total = pagesToGenerate.length;
                this.setButtonLoading(true);
                const button = document.getElementById(this.buttonId);
                if (button) {
                    button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>생성 중 ${current}/${total}`;
                }

                // 진행 중 UI
                const illustrationDiv = document.getElementById(`illustration-${i}`);
                if (illustrationDiv) {
                    illustrationDiv.innerHTML = `
                        <div class="min-h-[200px] flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                            <div class="animate-spin rounded-full h-20 w-20 border-b-4 border-purple-600 mb-4"></div>
                            <p class="text-purple-800 text-base font-bold">🔷 페이지 ${page.pageNumber} 생성 중...</p>
                            <p class="text-purple-600 text-sm mt-2">${current}/${total}</p>
                            <p class="text-purple-500 text-xs mt-1">순차 생성 (정확하게)</p>
                        </div>
                    `;
                }

                try {
                    await this.generate(i);
                    successCount++;
                } catch (error) {
                    failCount++;
                }
            }

            // 6. 최종 결과
            this.updateDisplay();

            if (failCount > 0) {
                this.showFailure(`삽화 생성 완료!\n✅ 성공: ${successCount}개\n❌ 실패: ${failCount}개\n\n실패한 페이지는 개별적으로 재시도해주세요.`);
            } else {
                this.showSuccess(`모든 삽화 생성 완료! 🎯 (${successCount}개)`);
            }

        } catch (error) {
            console.error('배치 생성 오류:', error);
            alert('배치 생성 중 오류가 발생했습니다: ' + error.message);
            this.updateDisplay();
        } finally {
            this.setButtonLoading(false);
        }
    }

    /**
     * 생성 전 검증
     */
    _validateBeforeGeneration() {
        // 캐릭터 레퍼런스 확인
        const hasCharacterReferences = this.storybook.characters.some(char => char.referenceImage);
        if (!hasCharacterReferences) {
            return {
                valid: false,
                message: '먼저 캐릭터 레퍼런스 이미지를 생성해주세요!'
            };
        }

        // 생성할 페이지 필터링
        const pagesToGenerate = this.storybook.pages.filter(page => !page.illustrationImage);
        if (pagesToGenerate.length === 0) {
            return {
                valid: false,
                message: '이미 모든 페이지의 삽화가 생성되었습니다.'
            };
        }

        return {
            valid: true,
            pages: pagesToGenerate
        };
    }

    /**
     * 페이지 데이터 수집
     */
    _collectPageData(pageIndex) {
        const page = this.storybook.pages[pageIndex];
        
        // DOM에서 최신 값 가져오기
        const sceneCombinedElem = document.getElementById(`scene-combined-${pageIndex}`);
        const sceneDesc = sceneCombinedElem ? sceneCombinedElem.value : page.scene_description;
        
        const artStyleElem = document.getElementById(`artstyle-${pageIndex}`);
        const artStyle = artStyleElem ? artStyleElem.value : (page.artStyle || this.storybook.artStyle);
        
        // scene-combined에서 장면 구조 파싱
        const sceneStructure = {
            characters: page.scene_structure?.characters || '',
            background: page.scene_structure?.background || '',
            atmosphere: page.scene_structure?.atmosphere || ''
        };

        return {
            ...page,
            scene_description: sceneDesc,
            scene_structure: sceneStructure,
            artStyle: artStyle
        };
    }

    /**
     * 페이지에 등장하는 캐릭터 레퍼런스 가져오기
     */
    _getRelevantCharacterRefs(pageIndex) {
        const page = this.storybook.pages[pageIndex];
        const characterReferences = this.storybook.characters.filter(char => char.referenceImage);

        // 페이지 텍스트에서 캐릭터 감지
        const pageText = page.text || '';
        const sceneCharacters = page.scene_structure?.characters || '';
        const allText = `${pageText} ${sceneCharacters}`.toLowerCase();

        // 이 페이지에 등장하는 캐릭터만 필터링
        const relevantCharacters = characterReferences.filter(char => {
            const charName = char.name.toLowerCase();
            return allText.includes(charName) || 
                   allText.includes(char.description.toLowerCase().split(' ')[0]);
        });

        // 등장하지 않으면 모든 캐릭터 포함 (안전장치)
        const filteredCharacterRefs = relevantCharacters.length > 0 ? relevantCharacters : characterReferences;

        // 레퍼런스 이미지 URL만 추출
        const refImageUrls = filteredCharacterRefs
            .map(char => char.referenceImage)
            .filter(url => url);

        console.log(`📸 페이지 ${page.pageNumber} - 캐릭터 레퍼런스: ${refImageUrls.length}개`, refImageUrls);

        return refImageUrls;
    }

    /**
     * API 옵션 빌드
     */
    _buildApiOptions(pageIndex) {
        const page = this.storybook.pages[pageIndex];
        const isRegeneration = !!page.illustrationImage;

        // ✅ 재생성 시 페이지에 저장된 설정 우선 사용
        return {
            model: (isRegeneration && page.illustrationModel) || this.imageSettings.illustrationModel || 'gemini-3-pro-image-preview',
            aspectRatio: (isRegeneration && page.aspectRatio) || this.imageSettings.aspectRatio || '16:9',
            artStyle: page.artStyle || this.storybook.artStyle,
            storybookId: this.storybook.id,
            storybookTitle: this.storybook.title,
            additionalPrompt: (isRegeneration && page.additionalPrompt) || this.imageSettings.additionalPrompt || ''
        };
    }

    /**
     * 결과 저장
     */
    async _saveResult(pageIndex, result, pageData, apiOptions) {
        const page = this.storybook.pages[pageIndex];

        // 히스토리 관리
        if (page.illustrationImage) {
            if (!page.illustrationHistory) {
                page.illustrationHistory = [];
            }
            page.illustrationHistory = this.manageHistory(
                page.illustrationHistory,
                page.illustrationImage
            );
        }

        // 페이지 데이터 업데이트
        this.storybook.pages[pageIndex].illustrationImage = result.imageUrl;
        this.storybook.pages[pageIndex].scene_description = pageData.scene_description;
        this.storybook.pages[pageIndex].scene_structure = pageData.scene_structure;
        this.storybook.pages[pageIndex].artStyle = pageData.artStyle;
        
        // ✅ 생성 설정 저장 (재생성 시 사용)
        this.storybook.pages[pageIndex].illustrationModel = apiOptions.model;
        this.storybook.pages[pageIndex].aspectRatio = apiOptions.aspectRatio;
        this.storybook.pages[pageIndex].additionalPrompt = apiOptions.additionalPrompt;

        // Storybook 저장
        await this.saveStorybook();
    }

    /**
     * 삽화 렌더링
     */
    _renderIllustration(pageIndex, imageUrl) {
        const illustrationDiv = document.getElementById(`illustration-${pageIndex}`);
        if (!illustrationDiv) return;

        const page = this.storybook.pages[pageIndex];

        // UIHelper 사용 (히스토리 포함)
        if (this.uiHelper) {
            this.uiHelper.renderIllustration(illustrationDiv, imageUrl, {
                pageIndex: pageIndex,
                storybookTitle: this.storybook.title,
                history: page.illustrationHistory || []
            });
        } else {
            // 폴백
            illustrationDiv.innerHTML = `<img src="${imageUrl}" alt="Page ${page.pageNumber}" class="w-full h-full object-cover rounded-lg"/>`;
        }
    }

    /**
     * 모든 페이지 로딩 UI 표시
     */
    _showAllPagesLoading() {
        this.storybook.pages.forEach((page, i) => {
            if (!page.illustrationImage) {
                const illustrationDiv = document.getElementById(`illustration-${i}`);
                if (illustrationDiv) {
                    illustrationDiv.innerHTML = `
                        <div class="min-h-[200px] flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                            <div class="animate-pulse rounded-full h-20 w-20 bg-purple-300 mb-4"></div>
                            <p class="text-purple-800 text-base font-bold">🔷 대기 중...</p>
                            <p class="text-purple-600 text-sm mt-2">순차적으로 생성됩니다</p>
                            <p class="text-purple-500 text-xs mt-1">페이지 ${i + 1}</p>
                        </div>
                    `;
                }
            }
        });
    }

    /**
     * 에러 메시지 추출
     */
    _extractErrorMessage(error) {
        if (error.response && error.response.data) {
            return error.response.data.error || error.response.data.message || '이미지 생성 실패';
        }
        return error.message || '이미지 생성 실패';
    }
}

// Export
window.IllustrationGenerator = IllustrationGenerator;
