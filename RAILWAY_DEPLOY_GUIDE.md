# 🚀 Railway.app 배포 가이드

## ✅ 준비 완료 사항
- ✅ Express 서버 코드
- ✅ Cloudflare R2 Storage 연동
- ✅ GitHub 저장소 (ebook3)
- ✅ Railway 설정 파일 (railway.json)

---

## 📋 Railway.app 배포 단계별 가이드

### 1️⃣ Railway 계정 생성 및 로그인

1. **Railway 웹사이트 접속**: https://railway.app
2. **"Login"** 버튼 클릭
3. **"Login with GitHub"** 선택
4. GitHub 계정으로 로그인

---

### 2️⃣ 새 프로젝트 생성

1. 대시보드에서 **"New Project"** 버튼 클릭
2. **"Deploy from GitHub repo"** 선택
3. **"Configure GitHub App"** 클릭 (처음 사용하는 경우)
4. GitHub 저장소 권한 승인
5. **"realproto1/ebook3"** 저장소 선택
6. **"Deploy Now"** 클릭

---

### 3️⃣ 환경 변수 설정 (⚠️ 중요!)

배포가 시작되면 **Variables** 탭으로 이동:

#### 필수 환경 변수:

```bash
# Gemini API Key (필수)
GEMINI_API_KEY=AIzaSyAOWaYor1zJQMiM727SoUbsI0OouiOEJCw

# Server 설정
PORT=3000
NODE_ENV=production

# Cloudflare R2 Storage (이미지 영구 저장)
R2_ACCOUNT_ID=ad0cc40df8e41b561442058f198278ea
R2_ACCESS_KEY_ID=764805a6659844bc5b989f14e1d7408c
R2_SECRET_ACCESS_KEY=fa1a1d55c9278d758d2f3a4da79cc28584bf0521792d3d2cb249958cb1eeada5
R2_BUCKET_NAME=storybook-images
R2_PUBLIC_URL=https://pub-ad0cc40df8e41b561442058f198278ea.r2.dev
```

**설정 방법:**
1. **Variables** 탭 클릭
2. **"+ New Variable"** 클릭
3. 위 환경 변수들을 하나씩 추가
4. **"Add"** 버튼 클릭

---

### 4️⃣ 배포 확인

1. **Deployments** 탭에서 배포 상태 확인
2. 빌드 로그 확인:
   ```
   ✅ Dependencies installed
   ✅ Build successful
   ✅ Server started
   ✅ Health check passed
   ```
3. 배포 완료 시 **공개 URL** 제공됨

---

### 5️⃣ 공개 URL 확인

배포 완료 후:
1. **Settings** 탭 → **Networking** 섹션
2. **"Generate Domain"** 버튼 클릭 (자동 생성되지 않은 경우)
3. 공개 URL 복사 (예: `https://storybook-generator-production.up.railway.app`)

---

### 6️⃣ Cloudflare R2 Bucket Public 설정

⚠️ **중요**: R2 버킷을 public으로 설정해야 이미지가 브라우저에서 보입니다!

1. **Cloudflare 대시보드**: https://dash.cloudflare.com
2. **R2** 메뉴 클릭
3. **"storybook-images"** 버킷 선택
4. **Settings** 탭 클릭
5. **Public Access** 섹션:
   - **"Allow Access"** 활성화
   - **Public URL**: `https://pub-{account_id}.r2.dev` 확인
6. **Save** 클릭

---

## 🎉 배포 완료!

### 예상 결과:
- ✅ **서버 URL**: `https://your-app.up.railway.app`
- ✅ **이미지 저장**: Cloudflare R2 (영구 저장)
- ✅ **자동 재배포**: GitHub 푸시 시 자동 배포
- ✅ **무료 티어**: $5 크레딧/월

---

## 🔍 테스트 방법

### 1. 서버 상태 확인:
```bash
curl https://your-app.up.railway.app
```

### 2. 동화책 생성 테스트:
1. Railway URL 접속
2. 동화책 제목 입력 (예: "백설공주")
3. 대상 연령 선택 (예: 5세)
4. "동화책 생성" 버튼 클릭
5. 캐릭터 레퍼런스 생성 확인
6. 페이지 삽화 생성 확인

### 3. 이미지 영구 저장 확인:
1. 생성된 이미지 URL 확인 (R2 URL: `https://pub-xxx.r2.dev/...`)
2. 브라우저 캐시 삭제
3. 페이지 새로고침
4. 이미지가 여전히 표시되는지 확인 ✅

---

## 💡 추가 설정 (선택 사항)

### 커스텀 도메인 연결:
1. **Settings** → **Networking**
2. **"Custom Domain"** 섹션
3. 도메인 입력 (예: `storybook.example.com`)
4. DNS 레코드 추가
5. SSL 자동 설정

### 로그 확인:
1. **Deployments** 탭
2. 최신 배포 선택
3. **"View Logs"** 클릭
4. 실시간 로그 확인

---

## ❌ 문제 해결

### 배포 실패 시:
1. **환경 변수 확인**: 모든 필수 변수가 설정되었는지 확인
2. **빌드 로그 확인**: 에러 메시지 확인
3. **재배포**: "Redeploy" 버튼 클릭

### 이미지가 안 보일 때:
1. **R2 Public Access 확인**: Bucket이 public인지 확인
2. **R2_PUBLIC_URL 확인**: 환경 변수가 올바른지 확인
3. **CORS 설정**: R2 Bucket CORS 설정 확인

---

## 📊 비용 안내

### Railway.app 무료 티어:
- ✅ $5 크레딧/월
- ✅ 500GB 네트워크 대역폭
- ✅ 무제한 프로젝트

### Cloudflare R2:
- ✅ 10GB 저장 용량 (무료)
- ✅ 무제한 읽기 요청 (무료)
- ✅ 1백만 쓰기 요청/월 (무료)

**예상 월 비용**: **$0** (무료 티어 내에서 사용 가능)

---

## 🔗 유용한 링크

- **Railway 대시보드**: https://railway.app/dashboard
- **Cloudflare R2**: https://dash.cloudflare.com/r2
- **GitHub 저장소**: https://github.com/realproto1/ebook3
- **Railway 문서**: https://docs.railway.app

---

## 🎯 요약

1. ✅ Railway.app에서 GitHub 저장소 연동
2. ✅ 환경 변수 8개 설정
3. ✅ 자동 배포 완료
4. ✅ Cloudflare R2 Public 설정
5. ✅ 이미지 영구 저장 완료! 🎉

---

배포 중 문제가 생기면 언제든지 알려주세요!
