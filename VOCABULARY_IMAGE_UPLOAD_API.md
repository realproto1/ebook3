# 📚 학습 단어 이미지 업로드 API 가이드

## 🎯 개요
영어 학습 단어에 커스텀 이미지를 업로드할 수 있는 API입니다.
- **로컬 파일 업로드** 지원
- **이미지 URL** 지원
- **Cloudflare R2** 자동 저장

---

## 🔌 API 엔드포인트

### POST `/api/upload-vocabulary-image`

학습 단어에 이미지를 업로드합니다.

#### Headers
```
Content-Type: multipart/form-data (파일 업로드 시)
Content-Type: application/json (URL 업로드 시)
X-API-KEY: your-api-key
```

---

## 📝 사용 방법

### 방법 1: 로컬 파일 업로드

#### cURL 예시
```bash
curl -X POST http://localhost:3000/api/upload-vocabulary-image \
  -H "X-API-KEY: your-api-key" \
  -F "image=@/path/to/image.png" \
  -F "word=apple" \
  -F "korean=사과" \
  -F "storybookId=1234567890" \
  -F "storybookTitle=과일 이야기"
```

#### JavaScript (FormData) 예시
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('word', 'apple');
formData.append('korean', '사과');
formData.append('storybookId', '1234567890');
formData.append('storybookTitle', '과일 이야기');

const response = await fetch('http://localhost:3000/api/upload-vocabulary-image', {
  method: 'POST',
  headers: {
    'X-API-KEY': 'your-api-key'
  },
  body: formData
});

const result = await response.json();
console.log('업로드된 이미지 URL:', result.imageUrl);
```

---

### 방법 2: 이미지 URL 업로드

#### cURL 예시
```bash
curl -X POST http://localhost:3000/api/upload-vocabulary-image \
  -H "X-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "word": "apple",
    "korean": "사과",
    "imageUrl": "https://example.com/apple.png",
    "storybookId": "1234567890",
    "storybookTitle": "과일 이야기"
  }'
```

#### JavaScript (axios) 예시
```javascript
const response = await axios.post('http://localhost:3000/api/upload-vocabulary-image', {
  word: 'apple',
  korean: '사과',
  imageUrl: 'https://example.com/apple.png',
  storybookId: '1234567890',
  storybookTitle: '과일 이야기'
}, {
  headers: {
    'X-API-KEY': 'your-api-key'
  }
});

console.log('업로드된 이미지 URL:', response.data.imageUrl);
```

---

## 📤 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `word` | string | ✅ | 영어 단어 (예: apple) |
| `korean` | string | ⚪ | 한글 뜻 (예: 사과) |
| `image` | file | ✅* | 이미지 파일 (로컬 업로드 시) |
| `imageUrl` | string | ✅* | 이미지 URL (URL 업로드 시) |
| `storybookId` | string | ⚪ | 동화책 ID (파일명에 사용) |
| `storybookTitle` | string | ⚪ | 동화책 제목 (파일명에 사용) |

**\* `image` 또는 `imageUrl` 중 하나는 필수**

---

## ✅ 응답 예시

### 성공 응답 (200 OK)
```json
{
  "success": true,
  "word": "apple",
  "korean": "사과",
  "imageUrl": "https://pub-554d78bf0f2346cfb850060ac23280a7.r2.dev/1234567890-과일이야기-vocabulary-apple-1737458923456.png",
  "message": "이미지가 성공적으로 업로드되었습니다."
}
```

### 에러 응답 (400 Bad Request)
```json
{
  "success": false,
  "error": "단어(word)가 필요합니다."
}
```

```json
{
  "success": false,
  "error": "이미지 파일 또는 URL이 필요합니다."
}
```

---

## 🎨 실전 예시: HTML 폼으로 업로드

```html
<!DOCTYPE html>
<html>
<head>
    <title>학습 단어 이미지 업로드</title>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
</head>
<body>
    <h1>📚 학습 단어 이미지 업로드</h1>
    
    <!-- 로컬 파일 업로드 폼 -->
    <div>
        <h2>방법 1: 로컬 파일 업로드</h2>
        <form id="fileUploadForm">
            <input type="text" id="word" placeholder="영어 단어 (예: apple)" required><br>
            <input type="text" id="korean" placeholder="한글 뜻 (예: 사과)"><br>
            <input type="file" id="imageFile" accept="image/*" required><br>
            <button type="submit">업로드</button>
        </form>
        <div id="fileResult"></div>
    </div>
    
    <hr>
    
    <!-- URL 업로드 폼 -->
    <div>
        <h2>방법 2: URL 업로드</h2>
        <form id="urlUploadForm">
            <input type="text" id="wordUrl" placeholder="영어 단어 (예: banana)" required><br>
            <input type="text" id="koreanUrl" placeholder="한글 뜻 (예: 바나나)"><br>
            <input type="text" id="imageUrl" placeholder="이미지 URL" required><br>
            <button type="submit">업로드</button>
        </form>
        <div id="urlResult"></div>
    </div>
    
    <script>
        const API_KEY = 'your-api-key'; // ⚠️ 실제 API 키로 변경하세요
        const API_URL = 'http://localhost:3000/api/upload-vocabulary-image';
        
        // 로컬 파일 업로드
        document.getElementById('fileUploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('word', document.getElementById('word').value);
            formData.append('korean', document.getElementById('korean').value);
            formData.append('image', document.getElementById('imageFile').files[0]);
            
            try {
                const response = await axios.post(API_URL, formData, {
                    headers: {
                        'X-API-KEY': API_KEY
                    }
                });
                
                document.getElementById('fileResult').innerHTML = `
                    <p style="color: green;">✅ 성공!</p>
                    <p>단어: ${response.data.word} (${response.data.korean})</p>
                    <p>이미지 URL: <a href="${response.data.imageUrl}" target="_blank">${response.data.imageUrl}</a></p>
                    <img src="${response.data.imageUrl}" width="200" />
                `;
            } catch (error) {
                document.getElementById('fileResult').innerHTML = `
                    <p style="color: red;">❌ 실패: ${error.response?.data?.error || error.message}</p>
                `;
            }
        });
        
        // URL 업로드
        document.getElementById('urlUploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                word: document.getElementById('wordUrl').value,
                korean: document.getElementById('koreanUrl').value,
                imageUrl: document.getElementById('imageUrl').value
            };
            
            try {
                const response = await axios.post(API_URL, data, {
                    headers: {
                        'X-API-KEY': API_KEY
                    }
                });
                
                document.getElementById('urlResult').innerHTML = `
                    <p style="color: green;">✅ 성공!</p>
                    <p>단어: ${response.data.word} (${response.data.korean})</p>
                    <p>이미지 URL: <a href="${response.data.imageUrl}" target="_blank">${response.data.imageUrl}</a></p>
                    <img src="${response.data.imageUrl}" width="200" />
                `;
            } catch (error) {
                document.getElementById('urlResult').innerHTML = `
                    <p style="color: red;">❌ 실패: ${error.response?.data?.error || error.message}</p>
                `;
            }
        });
    </script>
</body>
</html>
```

---

## 🔧 파일명 규칙

업로드된 이미지는 다음 형식으로 R2에 저장됩니다:

```
{storybookId}-{storybookTitle}-vocabulary-{word}-{timestamp}.png
```

예시:
```
1234567890-과일이야기-vocabulary-apple-1737458923456.png
```

---

## ⚠️ 주의사항

1. **API 키 필수**: `X-API-KEY` 헤더가 필요합니다
2. **파일 크기 제한**: 최대 10MB
3. **이미지 형식**: JPG, PNG, GIF 등 (image/* MIME type)
4. **R2 저장**: 모든 이미지는 Cloudflare R2에 자동 저장됩니다
5. **파일명**: 한글과 영문만 사용 가능 (특수문자 제거됨)

---

## 🎯 활용 시나리오

### 1. 동화책 생성 후 vocabulary 이미지 커스터마이징
```javascript
// 1. 동화책 생성
const storybook = await createStorybook({...});

// 2. 자동 생성된 vocabulary 이미지가 마음에 안 들 때
// 직접 이미지를 업로드하여 교체
for (const vocab of storybook.educational_content.vocabulary) {
    if (needsCustomImage(vocab.word)) {
        await uploadVocabularyImage({
            word: vocab.word,
            korean: vocab.korean,
            imageUrl: getCustomImageUrl(vocab.word),
            storybookId: storybook.id,
            storybookTitle: storybook.title
        });
    }
}
```

### 2. 배치 업로드
```javascript
const vocabularyList = [
    { word: 'apple', korean: '사과', imageUrl: 'https://example.com/apple.png' },
    { word: 'banana', korean: '바나나', imageUrl: 'https://example.com/banana.png' },
    { word: 'cherry', korean: '체리', imageUrl: 'https://example.com/cherry.png' }
];

for (const vocab of vocabularyList) {
    const result = await uploadVocabularyImage(vocab);
    console.log(`${vocab.word}: ${result.imageUrl}`);
}
```

---

## 📊 버전 정보
- **Version**: v13.10.0
- **Added**: 2025-01-21
- **Endpoint**: `/api/upload-vocabulary-image`
- **Method**: POST
- **Authentication**: API Key required

---

## 🚀 다음 단계

이 API를 사용하여:
1. ✅ 학습 단어에 커스텀 이미지 추가
2. ✅ 로컬 파일 또는 URL로 업로드
3. ✅ R2에 자동 저장 및 공개 URL 생성
4. 📝 동화책 DB에 이미지 URL 저장 (별도 구현 필요)
5. 🎮 games.html에서 커스텀 이미지 표시 (별도 구현 필요)

---

**문의 및 지원**: 이 API에 대한 질문이나 개선 제안이 있으시면 알려주세요! 🙌
