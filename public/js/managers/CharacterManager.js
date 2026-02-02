/**
 * CharacterManager.js
 * 캐릭터 및 Key Object 관리 기능
 */

class CharacterManager {
    constructor(dependencies) {
        this.api = dependencies.api;
        this.storybookManager = dependencies.storybookManager;
        
        console.log('✅ CharacterManager 초기화 완료');
    }
    
    /**
     * 캐릭터 추가
     */
    addCharacter(storybook) {
        const name = prompt('새 캐릭터 이름을 입력하세요:');
        if (!name || !name.trim()) return null;
        
        const description = prompt('캐릭터 외모 설명을 영어로 입력하세요:');
        if (!description || !description.trim()) return null;
        
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
        
        storybook.characters.push(newCharacter);
        
        console.log(`✅ 캐릭터 "${name}" 추가 완료`);
        return newCharacter;
    }
    
    /**
     * 캐릭터 삭제
     */
    deleteCharacter(storybook, charIndex) {
        if (!storybook.characters || !storybook.characters[charIndex]) {
            throw new Error('캐릭터를 찾을 수 없습니다.');
        }
        
        const character = storybook.characters[charIndex];
        
        if (!confirm(`"${character.name}" 캐릭터를 삭제하시겠습니까?`)) {
            return false;
        }
        
        storybook.characters.splice(charIndex, 1);
        
        console.log(`✅ 캐릭터 "${character.name}" 삭제 완료`);
        return true;
    }
    
    /**
     * Key Object 추가 (설명 자동 생성 포함)
     */
    async addKeyObject(storybook, getAPIKey) {
        if (!storybook.key_objects) {
            storybook.key_objects = [];
        }
        
        // 사물 이름 입력받기
        const objectName = prompt('핵심 사물의 이름을 입력하세요 (예: 사과, 호랑이, 성)\n\n⚠️ 반드시 명사(동물/물건)를 입력하세요.\n동사, 형용사, 추상적 개념은 안됩니다.');
        
        if (!objectName || objectName.trim() === '') {
            return null; // 취소
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
        
        storybook.key_objects.push(newKeyObject);
        
        // 동화 텍스트 수집
        const storyText = storybook.pages.map(p => p.text || '').join('\n\n');
        
        if (!storyText || storyText.trim().length === 0) {
            alert('동화 텍스트가 없어서 설명을 자동 생성할 수 없습니다.\n수동으로 설명과 예문을 입력해주세요.');
            newKeyObject.description = "이 사물의 상세한 시각적 설명을 입력하세요.";
            newKeyObject.example = "이 사물이 등장하는 예시 문장을 입력하세요.";
            return newKeyObject;
        }
        
        try {
            console.log(`🔍 핵심 사물 설명 자동 생성: ${trimmedName}`);
            
            // API 호출로 설명과 예문 생성
            const response = await this.api.post('/api/generate-keyobject-description', {
                objectName: trimmedName,
                storyText: storyText
            }, {
                headers: {
                    'X-API-Key': getAPIKey()
                }
            });
            
            if (response.success) {
                // 생성된 설명과 예문 적용
                const objIndex = storybook.key_objects.length - 1;
                storybook.key_objects[objIndex].description = response.description;
                storybook.key_objects[objIndex].example = response.example;
                
                console.log(`✅ 설명: ${response.description}`);
                console.log(`✅ 예문: ${response.example}`);
                
                return storybook.key_objects[objIndex];
            } else {
                throw new Error(response.error || '설명 생성 실패');
            }
            
        } catch (error) {
            console.error('설명 생성 오류:', error);
            
            // 실패 시 기본값으로 설정
            const objIndex = storybook.key_objects.length - 1;
            storybook.key_objects[objIndex].description = "이 사물의 상세한 시각적 설명을 입력하세요.";
            storybook.key_objects[objIndex].example = "이 사물이 등장하는 예시 문장을 입력하세요.";
            
            throw error;
        }
    }
    
    /**
     * Key Object 삭제
     */
    deleteKeyObject(storybook, objIndex) {
        if (!storybook.key_objects || !storybook.key_objects[objIndex]) {
            throw new Error('Key Object를 찾을 수 없습니다.');
        }
        
        const keyObject = storybook.key_objects[objIndex];
        
        if (!confirm(`"${keyObject.name}" 사물을 삭제하시겠습니까?`)) {
            return false;
        }
        
        storybook.key_objects.splice(objIndex, 1);
        
        // 이미지도 함께 삭제
        if (storybook.keyObjectImages && storybook.keyObjectImages[objIndex]) {
            storybook.keyObjectImages.splice(objIndex, 1);
        }
        
        console.log(`✅ Key Object "${keyObject.name}" 삭제 완료`);
        return true;
    }
    
    /**
     * 캐릭터 이미지 삭제
     */
    async deleteCharacterImage(storybook, charIndex) {
        if (!storybook.characters || !storybook.characters[charIndex]) {
            throw new Error('캐릭터를 찾을 수 없습니다.');
        }
        
        if (!confirm('이 캐릭터의 레퍼런스 이미지를 삭제하시겠습니까?')) {
            return false;
        }
        
        // 이미지 삭제
        storybook.characters[charIndex].referenceImage = null;
        
        console.log(`✅ 캐릭터 이미지 삭제 완료: ${storybook.characters[charIndex].name}`);
        return true;
    }
    
    /**
     * Key Object 이미지 삭제
     */
    async deleteKeyObjectImage(storybook, objIndex) {
        if (!storybook.keyObjectImages || !storybook.keyObjectImages[objIndex]) {
            throw new Error('이미지를 찾을 수 없습니다.');
        }
        
        if (!confirm('이 핵심 단어의 이미지를 삭제하시겠습니까?')) {
            return false;
        }
        
        // 이미지 삭제
        storybook.keyObjectImages[objIndex] = null;
        
        console.log(`✅ Key Object 이미지 삭제 완료`);
        return true;
    }
}

// 전역으로 노출
window.CharacterManager = CharacterManager;
console.log('✅ CharacterManager.js 로드 완료');
