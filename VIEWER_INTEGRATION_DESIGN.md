# 동화책 뷰어 통합 설계 문서

## 📋 개요

**목표**: 탱고북 저작도구에서 생성한 동화책을 별도의 뷰어 플랫폼에서 조회/재생할 수 있는 통합 시스템 구축

**핵심 기능**:
1. 저작도구에서 "뷰어 공개" 체크 시 자동으로 뷰어에 표시
2. 뷰어에서 동화책 목록 조회 및 상세 보기
3. 페이지별 이미지/텍스트/TTS 재생
4. 교육 단어 기반 학습 게임

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    탱고북 저작도구 (현재)                      │
│                                                               │
│  • 동화책 생성/편집                                            │
│  • 캐릭터/삽화/표지 이미지 생성                                │
│  • 교육 콘텐츠 생성 (단어 8개)                                 │
│  • [NEW] "뷰어 공개" 체크박스 ✓                               │
│                                                               │
│  ↓ 체크 시 자동 동기화                                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    Cloudflare R2 Storage
                    (공통 데이터 저장소)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      동화책 뷰어 (신규)                        │
│                                                               │
│  1️⃣ 동화책 목록 페이지                                        │
│     - 공개된 동화책 썸네일 카드 리스트                         │
│     - 필터링: 연령대, 스타일, 최신순                           │
│                                                               │
│  2️⃣ 동화책 상세 페이지                                        │
│     - 표지 + "동화책 보기" / "학습 게임" 버튼                  │
│                                                               │
│  3️⃣ 동화책 읽기 모드 (E-book Viewer)                          │
│     - 페이지 넘김 UI (← →)                                    │
│     - 이미지 + 텍스트 표시                                     │
│     - 🔊 TTS 오디오 재생 버튼                                  │
│     - 진행률 표시 (3/20 페이지)                                │
│                                                               │
│  4️⃣ 학습 게임 모드                                            │
│     - 단어 매칭 게임 (이미지 - 단어 매칭)                      │
│     - 스토리 퀴즈 게임 (선택형 질문)                           │
│     - 캐릭터 맞추기 게임                                       │
│     - 순서 맞추기 게임 (스토리 순서)                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 데이터 구조 및 R2 저장 형식

### 1. 메타데이터 목록 (viewer-metadata.json)

공개된 동화책의 요약 정보를 담은 JSON 파일:

```json
{
  "storybooks": [
    {
      "id": "1768912723075",
      "title": "엄지 공주",
      "targetAge": "5",
      "artStyle": "Botticelli style Renaissance painting",
      "coverImage": "https://pub-...r2.dev/.../cover.png",
      "pageCount": 20,
      "characterCount": 12,
      "vocabularyCount": 8,
      "isPublic": true,
      "publishedAt": "2026-01-21T10:00:00.000Z",
      "r2JsonUrl": "https://pub-...r2.dev/storybook-1768912723075.json"
    }
  ]
}
```

**R2 경로**: `viewer-metadata.json`

### 2. 개별 동화책 상세 데이터 (기존 구조 활용)

기존 `storybook-{id}.json` 구조 그대로 사용:

```json
{
  "id": "1768912723075",
  "title": "엄지 공주",
  "targetAge": "5",
  "artStyle": "...",
  "isPublic": true,
  
  "coverImage": "https://...",
  "coverPrompt": "...",
  
  "characters": [
    {
      "name": "엄지공주",
      "description": "...",
      "role": "주인공",
      "referenceImage": "https://..."
    }
  ],
  
  "pages": [
    {
      "pageNumber": 1,
      "text": "옛날 옛적에...",
      "scene_description": "...",
      "illustrationImage": "https://...",
      "ttsAudioUrl": "https://.../page-1.mp3"
    }
  ],
  
  "educational_content": {
    "vocabulary": [
      {
        "word": "castle",
        "korean": "성",
        "definition": "왕이나 귀족이 사는 큰 건물",
        "example": "공주는 아름다운 성에 살았어요."
      }
    ],
    "quiz": [
      {
        "question": "엄지공주는 어떤 꽃에서 태어났나요?",
        "options": ["장미", "튤립", "해바라기", "백합"],
        "answer": 1
      }
    ]
  },
  
  "vocabularyImages": [
    "https://.../vocab-castle.png"
  ]
}
```

---

## 🔧 구현 계획

### Phase 1: 저작도구 수정 (Backend + Frontend)

#### 1.1 데이터베이스/스토리지 구조 수정

**현재 구조**:
```javascript
{
  id: "1768912723075",
  title: "엄지 공주",
  // ... 기타 필드
}
```

**추가 필드**:
```javascript
{
  id: "1768912723075",
  title: "엄지 공주",
  isPublic: false,  // NEW: 뷰어 공개 여부
  publishedAt: null, // NEW: 공개 시점
  // ... 기타 필드
}
```

#### 1.2 UI 수정 (public/app.js)

**위치**: 동화책 목록 카드 (renderBookList 함수)

**추가할 UI**:
```html
<div class="flex items-center gap-2 mt-2">
  <input 
    type="checkbox" 
    id="public-${storybook.id}"
    ${storybook.isPublic ? 'checked' : ''}
    onchange="togglePublicStatus('${storybook.id}')"
    class="w-4 h-4"
  >
  <label for="public-${storybook.id}" class="text-sm text-gray-700">
    <i class="fas fa-eye"></i> 뷰어 공개
  </label>
</div>
```

**JavaScript 함수**:
```javascript
async function togglePublicStatus(storybookId) {
  const checkbox = document.getElementById(`public-${storybookId}`);
  const isPublic = checkbox.checked;
  
  try {
    const response = await axios.put(`/api/storybooks/${storybookId}/public`, {
      isPublic: isPublic
    });
    
    if (response.data.success) {
      showNotification(
        isPublic ? '✅ 동화책이 뷰어에 공개되었습니다!' : 'ℹ️ 동화책이 비공개로 전환되었습니다.',
        'success'
      );
      
      // 메타데이터 업데이트
      await updateViewerMetadata();
    }
  } catch (error) {
    console.error('공개 상태 변경 실패:', error);
    checkbox.checked = !isPublic; // 롤백
    showNotification('❌ 공개 상태 변경에 실패했습니다.', 'error');
  }
}
```

#### 1.3 API 엔드포인트 추가 (server.js)

**1) 공개 상태 변경 API**:
```javascript
// PUT /api/storybooks/:id/public
app.put('/api/storybooks/:id/public', requireAPIKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    
    // R2에서 동화책 JSON 로드
    const jsonUrl = `https://${R2_PUBLIC_URL}/storybook-${id}.json`;
    const response = await fetch(jsonUrl);
    const storybook = await response.json();
    
    // 공개 상태 업데이트
    storybook.isPublic = isPublic;
    storybook.publishedAt = isPublic ? new Date().toISOString() : null;
    
    // R2에 저장
    await uploadJSONToR2(storybook, `storybook-${id}.json`);
    
    // 뷰어 메타데이터 업데이트
    await updateViewerMetadata();
    
    res.json({ success: true, isPublic, publishedAt: storybook.publishedAt });
  } catch (error) {
    console.error('공개 상태 변경 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**2) 뷰어 메타데이터 업데이트 함수**:
```javascript
async function updateViewerMetadata() {
  try {
    // 모든 동화책 로드
    const listResponse = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: 'storybook-'
      })
    );
    
    const publicStorybooks = [];
    
    // 공개된 동화책만 필터링
    for (const obj of listResponse.Contents || []) {
      if (obj.Key.startsWith('storybook-') && obj.Key.endsWith('.json')) {
        const url = `https://${R2_PUBLIC_URL}/${obj.Key}`;
        const response = await fetch(url);
        const storybook = await response.json();
        
        if (storybook.isPublic) {
          publicStorybooks.push({
            id: storybook.id,
            title: storybook.title,
            targetAge: storybook.targetAge,
            artStyle: storybook.artStyle,
            coverImage: storybook.coverImage,
            pageCount: storybook.pages?.length || 0,
            characterCount: storybook.characters?.length || 0,
            vocabularyCount: storybook.educational_content?.vocabulary?.length || 0,
            isPublic: true,
            publishedAt: storybook.publishedAt,
            r2JsonUrl: url
          });
        }
      }
    }
    
    // 최신순 정렬
    publicStorybooks.sort((a, b) => 
      new Date(b.publishedAt) - new Date(a.publishedAt)
    );
    
    // R2에 메타데이터 저장
    await uploadJSONToR2({ storybooks: publicStorybooks }, 'viewer-metadata.json');
    
    console.log(`✅ 뷰어 메타데이터 업데이트 완료: ${publicStorybooks.length}권`);
    return publicStorybooks;
  } catch (error) {
    console.error('뷰어 메타데이터 업데이트 실패:', error);
    throw error;
  }
}
```

**3) 뷰어용 공개 API (인증 불필요)**:
```javascript
// GET /api/viewer/storybooks - 공개된 동화책 목록
app.get('/api/viewer/storybooks', async (req, res) => {
  try {
    const metadataUrl = `https://${R2_PUBLIC_URL}/viewer-metadata.json`;
    const response = await fetch(metadataUrl);
    const data = await response.json();
    
    res.json({
      success: true,
      storybooks: data.storybooks || []
    });
  } catch (error) {
    console.error('뷰어 목록 로드 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/viewer/storybooks/:id - 동화책 상세 정보
app.get('/api/viewer/storybooks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const jsonUrl = `https://${R2_PUBLIC_URL}/storybook-${id}.json`;
    const response = await fetch(jsonUrl);
    const storybook = await response.json();
    
    // 공개된 동화책만 반환
    if (!storybook.isPublic) {
      return res.status(403).json({ 
        success: false, 
        error: '비공개 동화책입니다.' 
      });
    }
    
    res.json({
      success: true,
      storybook: storybook
    });
  } catch (error) {
    console.error('동화책 상세 로드 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

### Phase 2: 동화책 뷰어 구현 (별도 프로젝트)

#### 2.1 프로젝트 구조

```
viewer/
├── public/
│   ├── index.html          # 메인 페이지 (동화책 목록)
│   ├── book.html           # 동화책 상세 (표지 + 선택)
│   ├── reader.html         # 동화책 읽기 모드
│   ├── games.html          # 학습 게임 모드
│   ├── css/
│   │   └── viewer.css
│   └── js/
│       ├── api.js          # API 통신 모듈
│       ├── list.js         # 목록 페이지 로직
│       ├── reader.js       # 읽기 모드 로직
│       └── games.js        # 게임 로직
├── wrangler.jsonc
└── package.json
```

#### 2.2 주요 페이지 UI/UX

**1) 동화책 목록 (index.html)**:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>탱고북 동화책</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
  <div class="container mx-auto px-4 py-8">
    <header class="mb-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-2">
        <i class="fas fa-book-open text-blue-500"></i>
        탱고북 동화책
      </h1>
      <p class="text-gray-600">AI가 만든 멋진 동화책을 읽어보세요!</p>
    </header>
    
    <!-- 필터 -->
    <div class="mb-6 flex gap-4">
      <select id="age-filter" class="border rounded px-4 py-2">
        <option value="">모든 연령</option>
        <option value="4-5">4-5세</option>
        <option value="5-7">5-7세</option>
        <option value="7-8">7-8세</option>
      </select>
      
      <select id="sort-filter" class="border rounded px-4 py-2">
        <option value="latest">최신순</option>
        <option value="popular">인기순</option>
      </select>
    </div>
    
    <!-- 동화책 카드 그리드 -->
    <div id="storybook-grid" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <!-- 카드는 JavaScript로 동적 생성 -->
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="js/api.js"></script>
  <script src="js/list.js"></script>
</body>
</html>
```

**2) 동화책 상세 (book.html)**:
```html
<div class="max-w-4xl mx-auto px-4 py-8">
  <!-- 표지 이미지 -->
  <div class="mb-8">
    <img id="cover-image" src="" alt="" class="w-full max-w-2xl mx-auto rounded-lg shadow-xl">
  </div>
  
  <!-- 동화책 정보 -->
  <div class="text-center mb-8">
    <h1 id="book-title" class="text-3xl font-bold mb-2"></h1>
    <p class="text-gray-600">
      <span id="book-age"></span> • 
      <span id="book-pages"></span>페이지 • 
      <span id="book-chars"></span>명의 캐릭터
    </p>
  </div>
  
  <!-- 액션 버튼 -->
  <div class="flex gap-4 justify-center">
    <button 
      onclick="startReading()"
      class="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold"
    >
      <i class="fas fa-book-open mr-2"></i>
      동화책 보기
    </button>
    
    <button 
      onclick="startGames()"
      class="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold"
    >
      <i class="fas fa-gamepad mr-2"></i>
      학습 게임
    </button>
  </div>
</div>
```

**3) 동화책 읽기 모드 (reader.html)**:
```html
<div class="h-screen flex flex-col bg-gray-900">
  <!-- 헤더 -->
  <header class="bg-gray-800 text-white p-4 flex justify-between items-center">
    <button onclick="exitReader()" class="hover:text-gray-300">
      <i class="fas fa-arrow-left mr-2"></i>
      돌아가기
    </button>
    
    <span id="progress-text" class="text-sm">1 / 20</span>
    
    <button onclick="toggleAutoPlay()" class="hover:text-gray-300">
      <i class="fas fa-play" id="autoplay-icon"></i>
    </button>
  </header>
  
  <!-- 메인 콘텐츠 -->
  <main class="flex-1 flex items-center justify-center relative">
    <!-- 이전 버튼 -->
    <button 
      onclick="previousPage()"
      class="absolute left-4 bg-white/80 hover:bg-white p-4 rounded-full shadow-lg"
    >
      <i class="fas fa-chevron-left text-2xl"></i>
    </button>
    
    <!-- 페이지 콘텐츠 -->
    <div class="max-w-4xl w-full px-16">
      <!-- 이미지 -->
      <img 
        id="page-image" 
        src="" 
        alt="" 
        class="w-full rounded-lg shadow-2xl mb-6"
      >
      
      <!-- 텍스트 -->
      <div class="bg-white rounded-lg p-6 shadow-lg">
        <p id="page-text" class="text-xl leading-relaxed text-gray-800"></p>
        
        <!-- TTS 재생 버튼 -->
        <button 
          onclick="playTTS()"
          class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full"
        >
          <i class="fas fa-volume-up mr-2"></i>
          읽어주기
        </button>
      </div>
    </div>
    
    <!-- 다음 버튼 -->
    <button 
      onclick="nextPage()"
      class="absolute right-4 bg-white/80 hover:bg-white p-4 rounded-full shadow-lg"
    >
      <i class="fas fa-chevron-right text-2xl"></i>
    </button>
  </main>
  
  <!-- 진행바 -->
  <div class="bg-gray-800 p-2">
    <div class="bg-gray-700 rounded-full h-2">
      <div id="progress-bar" class="bg-blue-500 h-2 rounded-full transition-all" style="width: 5%"></div>
    </div>
  </div>
</div>
```

**4) 학습 게임 (games.html)**:
```html
<div class="container mx-auto px-4 py-8">
  <header class="mb-8">
    <h1 class="text-3xl font-bold mb-4">학습 게임</h1>
    
    <!-- 게임 선택 탭 -->
    <div class="flex gap-2 border-b">
      <button onclick="selectGame('matching')" class="tab-btn active">
        단어 매칭
      </button>
      <button onclick="selectGame('quiz')" class="tab-btn">
        스토리 퀴즈
      </button>
      <button onclick="selectGame('character')" class="tab-btn">
        캐릭터 맞추기
      </button>
      <button onclick="selectGame('sequence')" class="tab-btn">
        순서 맞추기
      </button>
    </div>
  </header>
  
  <!-- 게임 콘텐츠 -->
  <div id="game-content" class="min-h-screen">
    <!-- JavaScript로 동적 생성 -->
  </div>
</div>
```

#### 2.3 JavaScript 핵심 로직

**API 통신 (js/api.js)**:
```javascript
const API_BASE = 'https://your-author-tool.pages.dev'; // 저작도구 API

const ViewerAPI = {
  // 공개 동화책 목록 조회
  async getStorybooks() {
    const response = await axios.get(`${API_BASE}/api/viewer/storybooks`);
    return response.data.storybooks;
  },
  
  // 동화책 상세 조회
  async getStorybook(id) {
    const response = await axios.get(`${API_BASE}/api/viewer/storybooks/${id}`);
    return response.data.storybook;
  }
};
```

**목록 페이지 (js/list.js)**:
```javascript
let storybooks = [];

async function loadStorybooks() {
  try {
    storybooks = await ViewerAPI.getStorybooks();
    renderStorybooks();
  } catch (error) {
    console.error('동화책 로드 실패:', error);
  }
}

function renderStorybooks() {
  const grid = document.getElementById('storybook-grid');
  grid.innerHTML = storybooks.map(book => `
    <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer"
         onclick="location.href='book.html?id=${book.id}'">
      <img src="${book.coverImage}" alt="${book.title}" class="w-full h-64 object-cover">
      <div class="p-4">
        <h3 class="font-bold text-lg mb-2">${book.title}</h3>
        <p class="text-sm text-gray-600">
          ${book.targetAge}세 • ${book.pageCount}페이지
        </p>
      </div>
    </div>
  `).join('');
}

loadStorybooks();
```

**읽기 모드 (js/reader.js)**:
```javascript
let currentBook = null;
let currentPage = 0;

async function loadBook() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');
  
  currentBook = await ViewerAPI.getStorybook(bookId);
  showPage(0);
}

function showPage(pageIndex) {
  currentPage = pageIndex;
  const page = currentBook.pages[pageIndex];
  
  document.getElementById('page-image').src = page.illustrationImage;
  document.getElementById('page-text').textContent = page.text;
  document.getElementById('progress-text').textContent = 
    `${pageIndex + 1} / ${currentBook.pages.length}`;
  
  const progress = ((pageIndex + 1) / currentBook.pages.length) * 100;
  document.getElementById('progress-bar').style.width = `${progress}%`;
}

function nextPage() {
  if (currentPage < currentBook.pages.length - 1) {
    showPage(currentPage + 1);
  }
}

function previousPage() {
  if (currentPage > 0) {
    showPage(currentPage - 1);
  }
}

async function playTTS() {
  const page = currentBook.pages[currentPage];
  if (page.ttsAudioUrl) {
    const audio = new Audio(page.ttsAudioUrl);
    audio.play();
  } else {
    alert('음성이 아직 생성되지 않았습니다.');
  }
}

loadBook();
```

**학습 게임 (js/games.js)**:
```javascript
let currentBook = null;
let vocabulary = [];

async function loadGames() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');
  
  currentBook = await ViewerAPI.getStorybook(bookId);
  vocabulary = currentBook.educational_content.vocabulary.slice(0, 8);
  
  selectGame('matching');
}

function selectGame(gameType) {
  const content = document.getElementById('game-content');
  
  switch(gameType) {
    case 'matching':
      renderMatchingGame(content);
      break;
    case 'quiz':
      renderQuizGame(content);
      break;
    case 'character':
      renderCharacterGame(content);
      break;
    case 'sequence':
      renderSequenceGame(content);
      break;
  }
}

function renderMatchingGame(container) {
  // 단어 이미지와 텍스트를 매칭하는 게임
  const shuffledWords = [...vocabulary].sort(() => Math.random() - 0.5);
  const shuffledImages = [...vocabulary].sort(() => Math.random() - 0.5);
  
  container.innerHTML = `
    <div class="grid grid-cols-2 gap-8">
      <!-- 이미지 영역 -->
      <div class="space-y-4">
        <h3 class="font-bold mb-4">이미지를 클릭하세요</h3>
        ${shuffledImages.map((item, idx) => `
          <div 
            class="border-4 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500"
            onclick="selectImage(${idx})"
          >
            <img src="${currentBook.vocabularyImages[vocabulary.indexOf(item)]}" 
                 alt="${item.korean}" 
                 class="w-full h-32 object-contain">
          </div>
        `).join('')}
      </div>
      
      <!-- 단어 영역 -->
      <div class="space-y-4">
        <h3 class="font-bold mb-4">매칭되는 단어를 클릭하세요</h3>
        ${shuffledWords.map((item, idx) => `
          <div 
            class="border-4 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-green-500"
            onclick="selectWord(${idx})"
          >
            <p class="text-2xl font-bold text-center">${item.korean}</p>
            <p class="text-center text-gray-600">${item.word}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

loadGames();
```

---

## 🚀 배포 계획

### 1. 저작도구 (기존 프로젝트)
- **변경사항**: 
  - `isPublic` 필드 추가
  - 체크박스 UI 추가
  - API 엔드포인트 3개 추가
- **배포**: Cloudflare Pages 업데이트

### 2. 뷰어 (신규 프로젝트)
- **저장소**: `tangobook-viewer` (새 GitHub 저장소)
- **배포**: Cloudflare Pages
- **도메인**: `viewer.tangobook.pages.dev`
- **CORS 설정**: 저작도구 API에서 뷰어 도메인 허용

---

## 📈 개발 우선순위

### ✅ Phase 1 (1-2일)
1. 저작도구에 `isPublic` 필드 추가
2. 체크박스 UI 구현
3. API 엔드포인트 3개 구현
4. 테스트

### ✅ Phase 2 (2-3일)
1. 뷰어 프로젝트 생성
2. 동화책 목록 페이지 구현
3. 동화책 상세 페이지 구현
4. 읽기 모드 구현

### ✅ Phase 3 (2-3일)
1. 학습 게임 4종 구현
2. UI/UX 개선
3. 모바일 반응형 디자인

### ✅ Phase 4 (1일)
1. 통합 테스트
2. 배포

**총 예상 기간**: 6-9일

---

## 🔐 보안 고려사항

1. **공개/비공개 제어**: 
   - 저작도구는 인증 필요 (기존 API 키)
   - 뷰어는 인증 불필요 (공개 API)
   - 비공개 동화책은 뷰어에서 접근 불가 (403)

2. **CORS 설정**:
   - 저작도구 API에서 뷰어 도메인 허용
   - R2 공개 URL은 누구나 접근 가능 (이미지/JSON)

3. **Rate Limiting**:
   - 뷰어 API에 Rate Limit 적용 (DDoS 방지)

---

## 📝 향후 개선 사항

1. **사용자 계정 시스템**:
   - 뷰어에서 "좋아요", "북마크" 기능
   - 독서 진행률 저장

2. **분석 기능**:
   - 조회수, 완독률 트래킹
   - 인기 동화책 순위

3. **소셜 기능**:
   - 동화책 공유 (링크, SNS)
   - 댓글/리뷰 시스템

4. **PWA 지원**:
   - 오프라인 읽기
   - 앱처럼 설치 가능

---

## 🎯 결론

이 설계를 바탕으로:
1. **저작도구**: 최소한의 변경 (체크박스 + API 3개)
2. **뷰어**: 독립적인 새 프로젝트
3. **데이터 공유**: Cloudflare R2 공통 스토리지
4. **배포**: 각각 독립적으로 Cloudflare Pages에 배포

이렇게 하면 두 시스템이 느슨하게 결합되어 유지보수가 쉽고, 각각 독립적으로 발전할 수 있습니다.
