/**
 * CoverGenerator - 표지 이미지 생성 전용 클래스
 * BaseGenerator를 상속받아 표지 생성 로직 구현
 */
class CoverGenerator extends BaseGenerator {
    constructor(options = {}) {
        super({
            ...options,
            buttonId: 'generate-cover-btn'
        });
        
        this.imageService = options.imageService || window.imageService;
        this.imageSettings = options.imageSettings || window.imageSettings || {};
    }

    /**
     * 표지 이미지 생성
     */
    async generate() {
        if (!this.storybook) {
            throw new Error('동화책 데이터가 없습니다.');
        }

        const coverDiv = document.getElementById('cover-image-display');

        try {
            // 버튼 로딩 시작
            this.setButtonLoading(true);

            // 로딩 UI
            if (coverDiv) {
                this.showLoading(coverDiv, 'AI가 표지를 생성하는 중...');
            }

            console.log(`📖 표지 생성 시작: ${this.storybook.title}`);

            // 캐릭터 레퍼런스 준비
            const characterRefs = this._getCharacterReferences();

            // 표지 프롬프트 창에서 직접 읽기
            const promptInput = document.getElementById('cover-prompt');
            const prompt = promptInput ? promptInput.value.trim() : '';
            
            if (!prompt) {
                throw new Error('표지 프롬프트를 입력해주세요.');
            }

            console.log('📝 사용자 입력 프롬프트:', prompt);
            console.log('👥 선택된 캐릭터 레퍼런스:', characterRefs.length, '개');

            // UI에서 비율과 모델 읽기
            const aspectRatioSelect = document.getElementById('cover-aspect-ratio');
            const aspectRatio = aspectRatioSelect ? aspectRatioSelect.value : '9:16';
            
            const modelSelect = document.getElementById('cover-model-select');
            const model = modelSelect ? modelSelect.value : (this.imageSettings.coverModel || 'gemini-3-pro-image-preview');

            // API 호출
            const result = await this.imageService.generateCover({
                prompt: prompt,
                title: this.storybook.title,
                storybookId: this.storybook.id,
                characterReferences: characterRefs,
                model: model,
                aspectRatio: aspectRatio
            });

            if (!result || !result.success || !result.imageUrl) {
                throw new Error(result.error || '표지 이미지 생성 실패');
            }

            // 결과 저장
            await this._saveResult(result);

            // UI 업데이트
            this._renderCover(result.imageUrl);

            console.log(`✅ 표지 생성 완료`);
            this.showSuccess('표지 이미지 생성 완료!');

            return { success: true, imageUrl: result.imageUrl };

        } catch (error) {
            console.error(`❌ 표지 생성 실패:`, error);
            
            const errorMessage = this._extractErrorMessage(error);
            
            // 기존 표지가 있으면 유지
            if (this.storybook.coverImage) {
                this._renderCover(this.storybook.coverImage);
            } else if (coverDiv) {
                this.showError(coverDiv, errorMessage, 'generateCover()');
            }
            
            this.showFailure('표지 생성 실패: ' + errorMessage);
            
            throw error;
        } finally {
            this.setButtonLoading(false);
        }
    }

    /**
     * 캐릭터 레퍼런스 가져오기
     */
    _getCharacterReferences() {
        if (!this.storybook.characters) {
            return [];
        }

        // coverCharacterRefs에 체크된 캐릭터만 반환
        const selectedIndices = this.storybook.coverCharacterRefs || [];
        
        return selectedIndices
            .map(idx => this.storybook.characters[idx])
            .filter(char => char && char.referenceImage)
            .map(char => char.referenceImage); // URL만 반환
    }

    /**
     * 결과 저장
     */
    async _saveResult(result) {
        // 히스토리 관리
        if (this.storybook.coverImage) {
            if (!this.storybook.coverHistory) {
                this.storybook.coverHistory = [];
            }
            this.storybook.coverHistory = this.manageHistory(
                this.storybook.coverHistory,
                this.storybook.coverImage
            );
        }

        // 표지 저장
        this.storybook.coverImage = result.imageUrl;
        
        // 프롬프트도 저장 (다음에 사용할 때 표시)
        const promptInput = document.getElementById('cover-prompt');
        if (promptInput) {
            this.storybook.coverPrompt = promptInput.value.trim();
        }

        // Storybook 저장
        await this.saveStorybook();
    }

    /**
     * 표지 렌더링 - updateDisplay로 전체 UI 업데이트
     */
    _renderCover(imageUrl) {
        // updateDisplay()를 호출하면 DisplayService가 전체 UI를 다시 렌더링
        // storybook.coverImage가 이미 저장되어 있으므로 자동으로 표시됨
        this.updateDisplay();
    }

    /**
     * 에러 메시지 추출
     */
    _extractErrorMessage(error) {
        if (error.response && error.response.data) {
            return error.response.data.error || error.response.data.message || '표지 이미지 생성 실패';
        }
        return error.message || '표지 이미지 생성 실패';
    }
}

// Export
window.CoverGenerator = CoverGenerator;
