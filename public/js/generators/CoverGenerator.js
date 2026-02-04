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

        const coverDiv = document.getElementById('cover-preview');

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

            // API 호출
            const result = await this.imageService.generateCover({
                title: this.storybook.title,
                subtitle: this.storybook.subtitle || '',
                genre: this.storybook.genre || '',
                artStyle: this.storybook.artStyle,
                characters: this.storybook.characters || [],
                summary: this.storybook.summary || ''
            }, {
                model: this.imageSettings.illustrationModel || 'gemini-3-pro-image-preview',
                aspectRatio: '9:16', // 표지는 세로형
                characterReferences: characterRefs,
                storybookId: this.storybook.id,
                storybookTitle: this.storybook.title
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

        return this.storybook.characters
            .filter(char => char.referenceImage)
            .map(char => ({
                name: char.name,
                imageUrl: char.referenceImage
            }));
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
     * 표지 렌더링
     */
    _renderCover(imageUrl) {
        const coverDiv = document.getElementById('cover-preview');
        
        if (!coverDiv) return;

        const history = this.storybook.coverHistory || [];
        
        let html = `
            <div class="flex gap-2 h-full">
                <!-- 메인 표지 -->
                <div class="flex-1 relative group">
                    <img src="${imageUrl}" 
                         alt="${this.storybook.title} 표지" 
                         class="w-full h-full object-cover rounded-lg shadow-xl"/>
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <h3 class="text-white font-bold text-lg">${this.storybook.title}</h3>
                        ${this.storybook.subtitle ? `<p class="text-white/80 text-sm">${this.storybook.subtitle}</p>` : ''}
                    </div>
                    <button 
                        onclick="downloadImage('${imageUrl}', '표지_${this.storybook.title}.png')"
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
                <div class="w-24 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-100">
                    ${history.map((url, idx) => `
                        <div class="relative group cursor-pointer border-2 border-transparent hover:border-purple-400 rounded transition" onclick="selectCoverFromHistory(${idx})">
                            <img src="${url}" alt="이전 표지 ${idx + 1}" class="w-full h-32 object-cover rounded"/>
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition rounded flex items-center justify-center">
                                <i class="fas fa-check text-white opacity-0 group-hover:opacity-100 transition"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        html += `</div>`;
        coverDiv.innerHTML = html;
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
