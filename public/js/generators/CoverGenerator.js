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

            // 프롬프트 생성 - 간단하고 명확하게
            const aspectRatio = this.imageSettings?.coverAspectRatio || '9:16';
            const prompt = `"${this.storybook.title}" 동화책 표지를 만들어주세요.

**중요 사항:**
- 텍스트는 전혀 포함하지 마세요 (제목, 글자, 단어 등 없음)
- 화면에 꽉 찬 일러스트로 그려주세요
- 비율: ${aspectRatio}

**장르:** ${this.storybook.genre || '어린이 동화'}

**아트 스타일:** ${this.storybook.artStyle}

${this.storybook.summary ? `**줄거리:** ${this.storybook.summary}` : ''}

${characterRefs.length > 0 ? '**참조할 캐릭터:** 첨부된 캐릭터 레퍼런스 이미지를 참고하여 캐릭터를 그려주세요.' : ''}`;

            console.log('📝 생성된 프롬프트:', prompt);
            console.log('👥 선택된 캐릭터 레퍼런스:', characterRefs.length, '개');

            // API 호출
            const result = await this.imageService.generateCover({
                prompt: prompt,
                title: this.storybook.title,
                storybookId: this.storybook.id,
                characterReferences: characterRefs,
                model: this.imageSettings.illustrationModel || 'gemini-3-pro-image-preview',
                aspectRatio: '9:16' // 표지는 세로형
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
