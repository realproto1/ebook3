/**
 * KeyObjectGenerator - Key Object 이미지 생성 전용 클래스
 * BaseGenerator를 상속받아 Key Object 생성 로직 구현
 */
class KeyObjectGenerator extends BaseGenerator {
    constructor(options = {}) {
        super({
            ...options,
            buttonId: options.buttonId || null
        });
        
        this.imageService = options.imageService || window.imageService;
        this.imageSettings = options.imageSettings || window.imageSettings || {};
    }

    /**
     * 단일 Key Object 이미지 생성
     */
    async generate(objIndex) {
        if (!this.storybook || !this.storybook.key_objects || !this.storybook.key_objects[objIndex]) {
            throw new Error('유효하지 않은 Key Object입니다.');
        }

        const keyObject = this.storybook.key_objects[objIndex];
        const imgDiv = document.getElementById(`keyobj-img-${objIndex}`);

        if (!imgDiv) {
            console.error(`❌ DOM 요소를 찾을 수 없습니다: keyobj-img-${objIndex}`);
            throw new Error('DOM 요소를 찾을 수 없습니다.');
        }

        // 버튼 ID 동적 설정
        this.buttonId = `generate-keyobj-${objIndex}-btn`;

        try {
            // 버튼 로딩 시작
            this.setButtonLoading(true);
            
            // 로딩 UI
            this.showLoading(imgDiv, 'AI가 Key Object 이미지를 생성하는 중...');

            console.log(`🔑 Key Object ${objIndex} (${keyObject.name}) 생성 시작`);

            // API 호출
            const result = await this.imageService.generateKeyObject(keyObject, {
                model: this.imageSettings.illustrationModel || 'gemini-3-pro-image-preview',
                aspectRatio: '16:9',
                artStyle: this.storybook.artStyle,
                storybookId: this.storybook.id,
                storybookTitle: this.storybook.title
            });

            if (!result || !result.success || !result.imageUrl) {
                throw new Error(result.error || 'Key Object 이미지 생성 실패');
            }

            // 결과 저장
            await this._saveResult(objIndex, result);

            // UI 업데이트
            this._renderKeyObjectImage(objIndex, result.imageUrl);

            console.log(`✅ Key Object ${objIndex} (${keyObject.name}) 생성 완료`);

            return { 
                success: true, 
                imageUrl: result.imageUrl,
                index: objIndex
            };

        } catch (error) {
            console.error(`❌ Key Object ${objIndex} 생성 실패:`, error);
            
            const errorMessage = this._extractErrorMessage(error);
            
            // 기존 이미지가 있으면 유지
            const existingImage = this.storybook.keyObjectImages?.[objIndex];
            if (existingImage) {
                this._renderKeyObjectImage(objIndex, existingImage);
            } else {
                this.showError(imgDiv, errorMessage, `generateSingleKeyObjectImage(${objIndex})`);
            }
            
            return {
                success: false,
                error: errorMessage,
                index: objIndex
            };
        } finally {
            // 버튼 로딩 해제
            this.setButtonLoading(false);
        }
    }

    /**
     * 모든 Key Object 이미지 생성
     */
    async generateAll() {
        const keyObjects = this.storybook?.key_objects;
        
        if (!keyObjects || keyObjects.length === 0) {
            alert('Key Object가 없습니다.');
            return;
        }

        // 생성할 Key Object 필터링
        const objsToGenerate = keyObjects.filter((obj, idx) => {
            return !this.storybook.keyObjectImages || !this.storybook.keyObjectImages[idx];
        });
        
        if (objsToGenerate.length === 0) {
            alert('이미 모든 Key Object의 이미지가 생성되었습니다.');
            return;
        }

        const estimatedTime = this.estimateTime(objsToGenerate.length, 5);
        
        if (!confirm(`${objsToGenerate.length}개의 Key Object 이미지를 생성하시겠습니까?\n\n예상 소요 시간: 약 ${estimatedTime}초`)) {
            return;
        }

        // 버튼 로딩 시작
        this.buttonId = 'generate-all-keyobject-btn';
        this.setButtonLoading(true);

        try {
            let successCount = 0;
            let failCount = 0;

            console.log(`🔑 모든 Key Object 생성 시작 (${objsToGenerate.length}개)`);

            // 병렬 생성 (Promise.all 사용)
            const promises = keyObjects.map((obj, idx) => {
                // 이미 생성된 것은 건너뛰기
                if (this.storybook.keyObjectImages && this.storybook.keyObjectImages[idx]) {
                    return Promise.resolve({ success: true, skipped: true });
                }
                return this.generate(idx);
            });

            const results = await Promise.all(promises);

            // 결과 집계
            results.forEach(result => {
                if (result.skipped) return;
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            });

            // 페이지 레퍼런스 이미지 업데이트
            if (window.refreshAllPageReferenceImages) {
                window.refreshAllPageReferenceImages();
            }

            // 결과 알림
            if (failCount > 0) {
                this.showFailure(`Key Object 생성 완료!\n✅ 성공: ${successCount}개\n❌ 실패: ${failCount}개\n\n실패한 항목은 개별적으로 재시도해주세요.`);
            } else {
                this.showSuccess(`모든 Key Object 이미지 생성 완료! 🔑 (${successCount}개)`);
            }

            console.log(`✅ 모든 Key Object 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`);

        } catch (error) {
            console.error('Key Object 배치 생성 오류:', error);
            alert('Key Object 생성 중 오류가 발생했습니다: ' + error.message);
        } finally {
            this.setButtonLoading(false);
        }
    }

    /**
     * 결과 저장 (히스토리 포함)
     */
    async _saveResult(objIndex, result) {
        const keyObject = this.storybook.key_objects[objIndex];
        
        // keyObjectImages 배열 초기화
        if (!this.storybook.keyObjectImages) {
            this.storybook.keyObjectImages = [];
        }

        // 히스토리 관리
        const currentImage = this.storybook.keyObjectImages[objIndex];
        if (currentImage) {
            if (!keyObject.imageHistory) {
                keyObject.imageHistory = [];
            }
            keyObject.imageHistory = this.manageHistory(
                keyObject.imageHistory,
                currentImage
            );
        }

        // 이미지 저장
        this.storybook.keyObjectImages[objIndex] = result.imageUrl;

        // Storybook 저장
        await this.saveStorybook();
    }

    /**
     * Key Object 이미지 렌더링 - updateDisplay로 전체 UI 업데이트
     */
    _renderKeyObjectImage(objIndex, imageUrl) {
        // updateDisplay()를 호출하면 DisplayService가 전체 UI를 다시 렌더링
        // keyObjectImages[objIndex]가 이미 저장되어 있으므로 자동으로 표시됨
        this.updateDisplay();
    }

    /**
     * 에러 메시지 추출
     */
    _extractErrorMessage(error) {
        if (error.response && error.response.data) {
            return error.response.data.error || error.response.data.message || 'Key Object 이미지 생성 실패';
        }
        return error.message || 'Key Object 이미지 생성 실패';
    }
}

// Export
window.KeyObjectGenerator = KeyObjectGenerator;
