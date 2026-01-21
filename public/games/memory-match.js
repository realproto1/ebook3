// 단어 카드 매칭 게임 (Memory Match)
// 카드 뒤집기를 통한 단어-그림 매칭

// URL에서 스토리 ID 추출
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('story');

// 게임 상태
let storyData = null;
let vocabulary = [];
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let attempts = 0;
let startTime = null;
let timerInterval = null;
let currentDifficulty = 'easy';

// 난이도별 카드 쌍 개수
const DIFFICULTY = {
    easy: 4,
    medium: 6,
    hard: 8
};

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

        console.log(`✅ ${vocabulary.length}개 단어 로드 완료`);

        // 게임 시작
        startGame();

    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        alert('게임을 시작할 수 없습니다.');
        goBack();
    }
}

// 난이도 설정
function setDifficulty(difficulty) {
    currentDifficulty = difficulty;

    // 버튼 활성화 상태 변경
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // 게임 재시작
    startGame();
}

// 게임 시작
function startGame() {
    // 초기화
    matchedPairs = 0;
    attempts = 0;
    flippedCards = [];
    startTime = Date.now();

    // UI 업데이트
    document.getElementById('matches').textContent = '0';
    document.getElementById('attempts').textContent = '0';
    document.getElementById('time').textContent = '0:00';

    // 타이머 시작
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    // 카드 생성
    generateCards();
}

// 카드 생성
function generateCards() {
    // 난이도에 맞는 단어 선택
    const pairCount = DIFFICULTY[currentDifficulty];
    const selectedWords = shuffle([...vocabulary]).slice(0, Math.min(pairCount, vocabulary.length));

    // 카드 배열 생성 (단어 카드 + 이미지 카드)
    cards = [];

    selectedWords.forEach((word, index) => {
        // 단어 카드
        cards.push({
            id: `word-${index}`,
            type: 'word',
            word: word,
            content: word.korean,
            pairId: index
        });

        // 이미지 카드 (또는 영어 단어)
        cards.push({
            id: `image-${index}`,
            type: 'image',
            word: word,
            content: word.image || word.imageUrl || word.word, // image 또는 imageUrl 또는 영어 단어
            pairId: index
        });
    });

    // 카드 섞기
    cards = shuffle(cards);

    // 카드 렌더링
    renderCards();
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

// 카드 렌더링
function renderCards() {
    const grid = document.getElementById('cards-grid');
    grid.className = `cards-grid ${currentDifficulty}`;
    grid.innerHTML = '';

    cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.index = index;
        cardElement.onclick = () => flipCard(index);

        // 카드 앞면 (뒷면 - 물음표)
        const front = document.createElement('div');
        front.className = 'card-front';
        front.textContent = '?';

        // 카드 뒷면 (실제 내용)
        const back = document.createElement('div');
        back.className = 'card-back';

        if (card.type === 'word') {
            // 단어 카드
            const text = document.createElement('div');
            text.className = 'text';
            text.textContent = card.content;
            back.appendChild(text);
        } else {
            // 이미지 카드 (이미지가 있으면 이미지, 없으면 영어 단어)
            if (card.content.startsWith('http')) {
                const img = document.createElement('img');
                img.src = card.content;
                img.alt = card.word.korean;
                back.appendChild(img);
            } else {
                const text = document.createElement('div');
                text.className = 'text';
                text.textContent = card.content;
                text.style.color = '#2196F3';
                back.appendChild(text);
            }
        }

        cardElement.appendChild(front);
        cardElement.appendChild(back);
        grid.appendChild(cardElement);
    });
}

// 카드 뒤집기
function flipCard(index) {
    // 이미 뒤집힌 카드이거나 매칭된 카드면 무시
    const cardElement = document.querySelector(`[data-index="${index}"]`);
    if (cardElement.classList.contains('flipped') || cardElement.classList.contains('matched')) {
        return;
    }

    // 2개 이상 뒤집혀 있으면 무시
    if (flippedCards.length >= 2) {
        return;
    }

    // 카드 뒤집기
    cardElement.classList.add('flipped');
    flippedCards.push({ index, card: cards[index] });

    // 2개 뒤집혔으면 매칭 체크
    if (flippedCards.length === 2) {
        attempts++;
        document.getElementById('attempts').textContent = attempts;

        setTimeout(checkMatch, 800);
    }
}

// 매칭 체크
function checkMatch() {
    const [first, second] = flippedCards;

    if (first.card.pairId === second.card.pairId) {
        // 매칭 성공!
        const firstElement = document.querySelector(`[data-index="${first.index}"]`);
        const secondElement = document.querySelector(`[data-index="${second.index}"]`);

        firstElement.classList.add('matched');
        secondElement.classList.add('matched');

        matchedPairs++;
        document.getElementById('matches').textContent = matchedPairs;

        playSound('correct');

        // 모든 쌍을 찾았는지 확인
        if (matchedPairs === DIFFICULTY[currentDifficulty]) {
            setTimeout(showResult, 500);
        }
    } else {
        // 매칭 실패
        const firstElement = document.querySelector(`[data-index="${first.index}"]`);
        const secondElement = document.querySelector(`[data-index="${second.index}"]`);

        firstElement.classList.remove('flipped');
        secondElement.classList.remove('flipped');

        playSound('wrong');
    }

    // 초기화
    flippedCards = [];
}

// 타이머 업데이트
function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// 결과 표시
function showResult() {
    clearInterval(timerInterval);

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // 등급 결정 (시도 횟수 기반)
    const perfectAttempts = DIFFICULTY[currentDifficulty];
    let grade = '';
    let icon = '';

    if (attempts === perfectAttempts) {
        grade = '완벽!';
        icon = '🏆';
    } else if (attempts <= perfectAttempts * 1.5) {
        grade = '최우수';
        icon = '🌟';
    } else if (attempts <= perfectAttempts * 2) {
        grade = '우수';
        icon = '👍';
    } else {
        grade = '잘했어요!';
        icon = '💪';
    }

    // 결과 표시
    document.getElementById('result-icon').textContent = icon;
    document.getElementById('final-time').textContent = timeString;
    document.getElementById('final-attempts').textContent = attempts;
    document.getElementById('final-grade').textContent = `등급: ${grade}`;

    // 모달 표시
    document.getElementById('result-modal').style.display = 'flex';

    playSound('complete');
}

// 게임 재시작
function restartGame() {
    document.getElementById('result-modal').style.display = 'none';
    startGame();
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
