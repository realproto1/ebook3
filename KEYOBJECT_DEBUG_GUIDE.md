# Key Object 이미지 생성 디버깅 가이드

## 🐛 문제 설명
- **증상**: Key Object "모든 이미지 생성" 버튼을 눌러도 작동하지 않음
- **상황**: Key Object 데이터는 있지만 이미지가 생성되지 않음
- **에러**: 브라우저 콘솔에서 확인 필요

## 🔍 디버깅 방법

### 1. 브라우저 콘솔 열기
- **Chrome/Edge**: `F12` 또는 `Ctrl+Shift+I`
- **Firefox**: `F12`
- **Safari**: `Cmd+Option+I`

### 2. 콘솔 탭 선택
- DevTools 하단의 **Console** 탭 클릭

### 3. Key Object 이미지 생성 시도
1. 동화책 선택 (예: "미녀와 야수")
2. **핵심 사물(Key Object)** 섹션으로 스크롤
3. **"모든 Key Object 이미지 생성"** 버튼 클릭
4. 콘솔에 나타나는 로그 확인

### 4. 로그 확인 포인트

#### ✅ 정상 흐름:
```
🎯 generateAllKeyObjectImages 호출됨
📖 currentStorybook: 미녀와 야수
📦 Key Objects 개수: 8
📦 Key Objects 데이터: [...]
📊 기존 이미지: 0/8
📊 생성 필요: 8개
🎨 8개 Key Object 이미지 병렬 생성 시작...
⏳ Promise.all 시작...
🎨 [0] generateSingleKeyObjectImage 시작
📦 [0] Key Object: {name: "...", korean: "...", ...}
🎯 [0] DOM element: Found
🎨 [0] Generating Key Object image for: ...
📡 [0] ImageService 호출 시작...
📋 [0] 요청 데이터: {...}
⏳ [0] API 응답 대기 중...
✅ [0] API 응답 받음: {success: true, imageUrl: "..."}
💾 [0] 이미지 URL 받음: https://...
💾 [0] saveCurrentStorybook 호출...
✅ [0] saveCurrentStorybook 완료
```

#### ❌ 에러 발생 지점 확인:
1. **currentStorybook 없음**: `❌ Key Object 정보가 없습니다.`
2. **Key Objects 배열 비어있음**: `❌ Key Object 정보가 없습니다.`
3. **DOM element 없음**: `❌ [X] DOM element not found: keyobj-img-X`
4. **ImageService 없음**: `❌ [X] ImageService가 로드되지 않았습니다.`
5. **API 요청 실패**: `❌ [X] ...` (에러 메시지 확인)

### 5. 콘솔 로그 캡처 방법
1. 콘솔에서 **마우스 우클릭** → **"Save as..."**
2. 또는 콘솔 내용을 **복사** (Ctrl+A → Ctrl+C)
3. 개발자에게 전달

## 🛠️ 일반적인 해결 방법

### 문제 1: DOM element not found
**원인**: 화면이 제대로 렌더링되지 않음
**해결**:
```javascript
// 콘솔에서 실행:
displayStorybook(currentStorybook);
```

### 문제 2: ImageService가 로드되지 않음
**원인**: JavaScript 로딩 순서 문제
**해결**: 브라우저 **강제 새로고침** (`Ctrl+Shift+R`)

### 문제 3: API 요청 실패
**원인**: 서버 에러 또는 네트워크 문제
**해결**:
1. **Network** 탭에서 `/api/generate-key-object` 요청 확인
2. 서버 로그 확인: `pm2 logs storybook-generator --nostream --lines 50`

### 문제 4: 이미지가 생성되었지만 표시되지 않음
**원인**: R2 저장은 되었지만 UI 업데이트 실패
**해결**:
```javascript
// 콘솔에서 실행:
saveCurrentStorybook();
displayStorybook(currentStorybook);
```

## 📊 현재 상태 확인

### 콘솔에서 실행:
```javascript
// 현재 선택된 동화책 확인
console.log('현재 동화책:', currentStorybook?.title);
console.log('Key Objects 개수:', currentStorybook?.key_objects?.length);
console.log('Key Object Images 개수:', currentStorybook?.keyObjectImages?.filter(img => img?.imageUrl).length);

// 데이터 구조 확인
console.log('Key Objects:', currentStorybook?.key_objects);
console.log('Key Object Images:', currentStorybook?.keyObjectImages);

// ImageService 확인
console.log('ImageService:', typeof imageService);
console.log('window.imageService:', typeof window.imageService);
```

## 🔗 관련 파일
- **Frontend**: `/home/user/webapp/public/app.js` (line 4552~)
- **Service**: `/home/user/webapp/public/js/services/ImageService.js` (line 313~)
- **Server**: `/home/user/webapp/server.js` (line 2700~)

## 💡 추가 팁
1. 콘솔에서 **Preserve log** 옵션 활성화 (페이지 새로고침 후에도 로그 유지)
2. **Verbose** 레벨로 설정 (모든 로그 표시)
3. **Network** 탭에서 API 요청/응답 확인

---

**마지막 업데이트**: 2026-02-04
**버전**: v1770164814
**커밋**: 1312aac
