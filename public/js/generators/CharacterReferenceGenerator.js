/**
 * CharacterReferenceGenerator - 캐릭터 레퍼런스 생성 전용 클래스
 * BaseGenerator를 상속받아 캐릭터 이미지 생성 로직 구현
 */
class CharacterReferenceGenerator extends BaseGenerator {
    constructor(options = {}) {
        super({
            ...options,
            buttonId: options.buttonId || null
        });
        
        this.imageService = options.imageService || window.imageService;
        this.imageSettings = options.imageSettings || window.imageSettings || {};
    }

    /**
     * 단일 캐릭터 레퍼런스 생성
     */
    async generate(charIndex) {
        if (!this.storybook || !this.storybook.characters[charIndex]) {
            throw new Error('유효하지 않은 캐릭터입니다.');
        }

        const character = this.storybook.characters[charIndex];
        const refDiv = document.getElementById(`char-ref-${charIndex}`);
        
        // 버튼 ID 동적 설정
        this.buttonId = `generate-char-${charIndex}-btn`;

        try {
            // 버튼 로딩 시작
            this.setButtonLoading(true);
            
            // 로딩 UI
            this.showLoading(refDiv, 'AI가 캐릭터 이미지를 생성하는 중...');

            console.log(`👤 캐릭터 ${character.name} 레퍼런스 생성 시작`);

            // 프롬프트 수집
            const promptInput = document.getElementById(`char-prompt-${charIndex}`);
            const customPrompt = promptInput && promptInput.value.trim();
            
            // 캐릭터 객체 준비 (커스텀 프롬프트 우선)
            const characterData = {
                name: character.name,
                description: customPrompt || character.description || character.name,
                age: character.age
            };
            
            // 현재 선택된 이미지를 참조 이미지로 추가
            const referenceImages = [];
            if (character.referenceImage) {
                referenceImages.push(character.referenceImage);
                console.log(`📸 현재 캐릭터 이미지를 참조로 사용: ${character.referenceImage}`);
            }
            
            // API 호출
            const result = await this.imageService.generateCharacter(characterData, {
                model: this.imageSettings.illustrationModel || 'gemini-3-pro-image-preview',
                aspectRatio: '16:9',
                artStyle: this.storybook.artStyle,
                storybookId: this.storybook.id,
                storybookTitle: this.storybook.title,
                referenceImages: referenceImages  // 현재 이미지 참조
            });

            if (!result || !result.success || !result.imageUrl) {
                throw new Error(result.error || '캐릭터 이미지 생성 실패');
            }

            // 결과 저장
            await this._saveResult(charIndex, result);

            // UI 업데이트
            this._renderCharacterImage(charIndex);

            console.log(`✅ 캐릭터 ${character.name} 레퍼런스 생성 완료`);
            this.showSuccess(`캐릭터 ${character.name} 이미지 생성 완료!`);

            return { success: true, imageUrl: result.imageUrl };

        } catch (error) {
            console.error(`❌ 캐릭터 ${charIndex} 생성 실패:`, error);
            
            const errorMessage = this._extractErrorMessage(error);
            
            // 기존 이미지가 있으면 유지
            if (character.referenceImage) {
                this._renderCharacterImage(charIndex);
            } else {
                this.showError(refDiv, errorMessage, `generateCharacterReference(${charIndex})`);
            }
            
            throw error;
        } finally {
            // 버튼 로딩 해제
            this.setButtonLoading(false);
        }
    }

    /**
     * 모든 캐릭터 레퍼런스 생성
     */
    async generateAll() {
        const characters = this.storybook?.characters;
        
        if (!characters || characters.length === 0) {
            alert('캐릭터가 없습니다.');
            return;
        }

        // 생성할 캐릭터 필터링
        const charsToGenerate = characters.filter(char => !char.referenceImage);
        
        if (charsToGenerate.length === 0) {
            alert('이미 모든 캐릭터의 레퍼런스 이미지가 생성되었습니다.');
            return;
        }

        const estimatedTime = this.estimateTime(charsToGenerate.length, 5);
        
        if (!confirm(`${charsToGenerate.length}개의 캐릭터 레퍼런스를 생성하시겠습니까?\n\n예상 소요 시간: 약 ${estimatedTime}초`)) {
            return;
        }

        try {
            let successCount = 0;
            let failCount = 0;

            console.log(`👤 모든 캐릭터 레퍼런스 생성 시작 (${charsToGenerate.length}개)`);

            // 순차적 생성
            for (let i = 0; i < characters.length; i++) {
                const character = characters[i];

                // 이미 생성된 캐릭터는 건너뛰기
                if (character.referenceImage) {
                    continue;
                }

                try {
                    await this.generate(i);
                    successCount++;
                } catch (error) {
                    failCount++;
                }
            }

            // 결과 알림
            if (failCount > 0) {
                this.showFailure(`캐릭터 생성 완료!\n✅ 성공: ${successCount}개\n❌ 실패: ${failCount}개\n\n실패한 캐릭터는 개별적으로 재시도해주세요.`);
            } else {
                this.showSuccess(`모든 캐릭터 레퍼런스 생성 완료! 👤 (${successCount}개)`);
            }

            console.log(`✅ 모든 캐릭터 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`);

        } catch (error) {
            console.error('캐릭터 배치 생성 오류:', error);
            alert('캐릭터 생성 중 오류가 발생했습니다: ' + error.message);
        }
    }

    /**
     * 결과 저장
     */
    async _saveResult(charIndex, result) {
        const character = this.storybook.characters[charIndex];

        // 히스토리 관리
        if (character.referenceImage) {
            if (!character.imageHistory) {
                character.imageHistory = [];
            }
            character.imageHistory = this.manageHistory(
                character.imageHistory,
                character.referenceImage
            );
        }

        // 이미지 저장
        this.storybook.characters[charIndex].referenceImage = result.imageUrl;

        // Storybook 저장
        await this.saveStorybook();
    }

    /**
     * 캐릭터 이미지 렌더링 - updateDisplay로 전체 UI 업데이트
     */
    _renderCharacterImage(charIndex) {
        // updateDisplay()를 호출하면 DisplayService가 전체 UI를 다시 렌더링
        // character.referenceImage가 이미 저장되어 있으므로 자동으로 표시됨
        this.updateDisplay();
    }

    /**
     * 에러 메시지 추출
     */
    _extractErrorMessage(error) {
        if (error.response && error.response.data) {
            return error.response.data.error || error.response.data.message || '캐릭터 이미지 생성 실패';
        }
        return error.message || '캐릭터 이미지 생성 실패';
    }
}

// Export
window.CharacterReferenceGenerator = CharacterReferenceGenerator;
