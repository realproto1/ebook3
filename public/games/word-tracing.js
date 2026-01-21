// 단어 따라쓰기 게임 (Word Tracing)
// HTML5 Canvas 기반 손글씨 인식

// URL에서 스토리 ID 추출
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('story');

// 게임 상태
let storyData = null;
let vocabulary = [];
let words = [];
let currentWordIndex = 0;
let completedWords = 0;
let accuracyScores = [];
let isChecked = false;

// Canvas 관련
let bgCanvas, bgCtx;
let drawCanvas, drawCtx;
let isDrawing = false;
let currentStrokeWidth = 15;
let hintLevel = 0;

// 난이도별 임계값
const DIFFICULTY_THRESHOLD = 70; // 70% 이상이면 자동 정답

// 초기화
async function init() {
    if (!storyId) {
        alert('❌ 스토리 ID가 없습니다.');
        goBack();
        return;
    }

    try {
        // 스토리 데이터 로드
        const response = await axios.get(`/api/storybooks/${storyId}`);
        storyData = response.data;

        // 제목 표시
        document.getElementById('story-title').textContent = storyData.title || '동화책';

        // 학습 단어 추출
        vocabulary = storyData.educational_content?.vocabulary || [];
        
        if (vocabulary.length === 0) {
            alert('❌ 학습 단어가 없습니다.');
            goBack();
            return;
        }

        // 단어 준비 (최대 8개)
        words = shuffle([...vocabulary]).slice(0, Math.min(8, vocabulary.length));

        // 총 단어 수 표시
        document.getElementById('total-words').textContent = words.length;

        // Canvas 초기화
        initCanvas();

        // 첫 단어 표시
        showWord();

        console.log(`✅ ${words.length}개 단어 준비 완료`);

    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        alert('게임을 시작할 수 없습니다.');
        goBack();
    }
}

// Fisher-Yates 셔플
function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Canvas 초기화
function initCanvas() {
    bgCanvas = document.getElementById('bg-canvas');
    drawCanvas = document.getElementById('draw-canvas');
    bgCtx = bgCanvas.getContext('2d');
    drawCtx = drawCanvas.getContext('2d');

    // Canvas 크기 설정
    const container = document.querySelector('.canvas-container');
    const width = container.offsetWidth;
    const height = Math.min(400, width * 0.6);

    bgCanvas.width = drawCanvas.width = width;
    bgCanvas.height = drawCanvas.height = height;

    // 그리기 설정
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    drawCtx.lineWidth = currentStrokeWidth;
    drawCtx.strokeStyle = '#FF6B9D';

    // 이벤트 리스너
    drawCanvas.addEventListener('mousedown', startDrawing);
    drawCanvas.addEventListener('mousemove', draw);
    drawCanvas.addEventListener('mouseup', stopDrawing);
    drawCanvas.addEventListener('mouseout', stopDrawing);

    // 터치 이벤트
    drawCanvas.addEventListener('touchstart', handleTouchStart);
    drawCanvas.addEventListener('touchmove', handleTouchMove);
    drawCanvas.addEventListener('touchend', stopDrawing);

    // 펜 두께 조절
    document.getElementById('thickness-slider').addEventListener('input', (e) => {
        currentStrokeWidth = parseInt(e.target.value);
        document.getElementById('thickness-value').textContent = currentStrokeWidth + 'px';
        drawCtx.lineWidth = currentStrokeWidth;
    });
}

// 단어 표시
function showWord() {
    const word = words[currentWordIndex];
    isChecked = false;
    hintLevel = 0;

    // 진행 상태 업데이트
    document.getElementById('current-word').textContent = currentWordIndex + 1;
    document.getElementById('completed-count').textContent = completedWords;
    const progress = ((currentWordIndex + 1) / words.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    // 단어 표시
    document.getElementById('target-word').textContent = word.korean;
    document.getElementById('word-hint').textContent = `💡 ${word.word} - ${word.definition}`;

    // Canvas 초기화
    clearCanvas();

    // 배경에 단어 그리기 (투명하게)
    drawBackgroundText(word.korean);

    // 피드백 숨기기
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('feedback').className = 'feedback';

    // 정확도 초기화
    updateAccuracy(0);

    // 버튼 활성화
    document.getElementById('check-btn').disabled = false;
    document.getElementById('clear-btn').disabled = false;
    document.getElementById('hint-btn').disabled = false;
}

// 배경에 단어 그리기
function drawBackgroundText(text) {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.font = 'bold 120px "Noto Sans KR"';
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    bgCtx.fillStyle = 'rgba(255, 107, 157, 0.15)'; // 매우 투명
    bgCtx.fillText(text, bgCanvas.width / 2, bgCanvas.height / 2);
}

// 그리기 시작
function startDrawing(e) {
    isDrawing = true;
    const pos = getMousePos(e);
    drawCtx.beginPath();
    drawCtx.moveTo(pos.x, pos.y);
}

// 그리기
function draw(e) {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    drawCtx.lineTo(pos.x, pos.y);
    drawCtx.stroke();

    // 실시간 정확도 계산
    updateAccuracy();
}

// 그리기 종료
function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    drawCtx.closePath();
}

// 마우스 위치 가져오기
function getMousePos(e) {
    const rect = drawCanvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// 터치 이벤트 처리
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    drawCanvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    drawCanvas.dispatchEvent(mouseEvent);
}

// 정확도 계산
function calculateAccuracy() {
    const bgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);
    const drawData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);

    let totalTargetPixels = 0;
    let coveredPixels = 0;

    // RGBA 픽셀 단위 순회 (4바이트 단위)
    for (let i = 0; i < bgData.data.length; i += 4) {
        const bgAlpha = bgData.data[i + 3];    // 배경 투명도
        const drawAlpha = drawData.data[i + 3]; // 그리기 투명도

        if (bgAlpha > 10) { // 배경 글자 영역 (매우 투명하므로 임계값 낮춤)
            totalTargetPixels++;
            if (drawAlpha > 50) { // 사용자가 그린 영역
                coveredPixels++;
            }
        }
    }

    return totalTargetPixels === 0 
        ? 0 
        : Math.round((coveredPixels / totalTargetPixels) * 100);
}

// 정확도 업데이트
function updateAccuracy() {
    const accuracy = calculateAccuracy();
    
    document.getElementById('accuracy-fill').style.width = accuracy + '%';
    document.getElementById('accuracy-text').textContent = accuracy;

    // 임계값 도달 시 자동 정답 처리
    if (accuracy >= DIFFICULTY_THRESHOLD && !isChecked) {
        autoCheckAnswer(accuracy);
    }
}

// 자동 정답 처리
function autoCheckAnswer(accuracy) {
    isChecked = true;
    completedWords++;
    accuracyScores.push(accuracy);

    const feedback = document.getElementById('feedback');
    feedback.textContent = `🎉 정답입니다! (정확도: ${accuracy}%)`;
    feedback.className = 'feedback correct';

    playSound('correct');

    // 버튼 비활성화
    document.getElementById('clear-btn').disabled = true;
    document.getElementById('hint-btn').disabled = true;
    document.getElementById('check-btn').disabled = true;

    // 1.5초 후 다음 단어
    setTimeout(() => {
        nextWord();
    }, 1500);
}

// Canvas 지우기
function clearCanvas() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    updateAccuracy();
}

// 힌트 보기
function showHint() {
    hintLevel++;

    if (hintLevel === 1) {
        // 첫 번째 힌트: 배경 글자 진하게
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.font = 'bold 120px "Noto Sans KR"';
        bgCtx.textAlign = 'center';
        bgCtx.textBaseline = 'middle';
        bgCtx.fillStyle = 'rgba(255, 107, 157, 0.3)';
        bgCtx.fillText(words[currentWordIndex].korean, bgCanvas.width / 2, bgCanvas.height / 2);
        
        alert('💡 힌트: 배경 글자가 더 진하게 보입니다!');
    } else if (hintLevel === 2) {
        // 두 번째 힌트: 더 진하게
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.font = 'bold 120px "Noto Sans KR"';
        bgCtx.textAlign = 'center';
        bgCtx.textBaseline = 'middle';
        bgCtx.fillStyle = 'rgba(255, 107, 157, 0.5)';
        bgCtx.fillText(words[currentWordIndex].korean, bgCanvas.width / 2, bgCanvas.height / 2);
        
        alert('💡 힌트: 배경 글자가 더욱 진하게 보입니다!');
    } else {
        alert('💡 더 이상 힌트가 없습니다. 천천히 따라 써보세요!');
    }
}

// 정답 확인
function checkAnswer() {
    if (isChecked) return;

    const accuracy = calculateAccuracy();
    accuracyScores.push(accuracy);

    const feedback = document.getElementById('feedback');

    if (accuracy >= 50) {
        isChecked = true;
        completedWords++;
        
        feedback.textContent = `✅ 통과! (정확도: ${accuracy}%)`;
        feedback.className = 'feedback correct';
        
        playSound('correct');

        // 1.5초 후 다음 단어
        setTimeout(() => {
            nextWord();
        }, 1500);
    } else {
        feedback.textContent = `❌ 조금 더 정확하게 써주세요! (정확도: ${accuracy}%)`;
        feedback.className = 'feedback wrong';
        
        playSound('wrong');
    }

    // 버튼 비활성화
    document.getElementById('check-btn').disabled = true;
}

// 다음 단어
function nextWord() {
    currentWordIndex++;

    if (currentWordIndex < words.length) {
        showWord();
    } else {
        showResult();
    }
}

// 결과 표시
function showResult() {
    const avgAccuracy = Math.round(accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length);

    // 등급 결정
    let grade = '';
    let icon = '';
    if (avgAccuracy >= 90) {
        grade = '최우수';
        icon = '🏆';
    } else if (avgAccuracy >= 70) {
        grade = '우수';
        icon = '🌟';
    } else if (avgAccuracy >= 50) {
        grade = '보통';
        icon = '👍';
    } else {
        grade = '다시 도전!';
        icon = '💪';
    }

    // 결과 표시
    document.getElementById('result-icon').textContent = icon;
    document.getElementById('final-completed').textContent = completedWords;
    document.getElementById('final-accuracy').textContent = avgAccuracy;
    document.getElementById('final-grade').textContent = `등급: ${grade}`;

    // 모달 표시
    document.getElementById('result-modal').style.display = 'flex';

    playSound('complete');
}

// 게임 재시작
function restartGame() {
    currentWordIndex = 0;
    completedWords = 0;
    accuracyScores = [];
    
    document.getElementById('result-modal').style.display = 'none';
    
    words = shuffle([...vocabulary]).slice(0, Math.min(8, vocabulary.length));
    showWord();
}

// 게임 목록으로
function goToGames() {
    window.location.href = `/games.html?story=${storyId}`;
}

// 뒤로 가기
function goBack() {
    window.location.href = `/games.html?story=${storyId}`;
}

// 사운드 재생
function playSound(type) {
    try {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(e => console.warn('Sound play failed:', e));
    } catch (e) {
        console.warn('Sound not available:', type);
    }
}

// 초기화 실행
init();
