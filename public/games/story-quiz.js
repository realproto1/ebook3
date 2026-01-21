// 동화 스토리 퀴즈 (Story Quiz)
// 동화 내용 이해도 확인

// URL에서 스토리 ID 추출
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('story');

// 게임 상태
let storyData = null;
let pages = [];
let questions = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
let isAnswered = false;

// 문제 유형
const QUESTION_TYPES = {
    ORDER: 'order',           // 순서 맞히기
    CONTENT: 'content',       // 내용 맞히기
    IMAGE: 'image'            // 그림 맞히기
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

        // 페이지 추출
        pages = storyData.pages || [];
        
        if (pages.length === 0) {
            alert('❌ 동화책 페이지가 없습니다.');
            goBack();
            return;
        }

        // 문제 생성 (5~7개)
        generateQuestions();

        // 첫 문제 표시
        showQuestion();

        console.log(`✅ ${questions.length}개 문제 생성 완료`);

    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        alert('게임을 시작할 수 없습니다.');
        goBack();
    }
}

// 문제 생성
function generateQuestions() {
    questions = [];

    // 문제 개수 결정 (페이지 수에 비례, 5~7개)
    const totalQuestions = Math.min(7, Math.max(5, Math.floor(pages.length / 3)));

    const usedIndices = new Set();

    for (let i = 0; i < totalQuestions; i++) {
        const type = Object.values(QUESTION_TYPES)[i % 3]; // 균등 분배
        const pageIndex = getRandomUnusedIndex(usedIndices);
        
        const question = createQuestionByType(type, pageIndex);
        if (question) {
            questions.push(question);
        }
    }

    // 문제 셔플
    questions = shuffle(questions);

    // 총 문제 수 표시
    document.getElementById('total-questions').textContent = questions.length;
}

// 사용되지 않은 랜덤 인덱스 가져오기
function getRandomUnusedIndex(usedIndices) {
    let index;
    do {
        index = Math.floor(Math.random() * pages.length);
    } while (usedIndices.has(index));
    
    usedIndices.add(index);
    return index;
}

// 문제 생성 (유형별)
function createQuestionByType(type, pageIndex) {
    const page = pages[pageIndex];

    if (type === QUESTION_TYPES.ORDER) {
        // 순서 맞히기
        return {
            type: type,
            text: `다음 장면은 몇 번째 페이지일까요?`,
            hint: `"${page.text.substring(0, 30)}..."`,
            correctAnswer: page.pageNumber,
            options: generateOrderOptions(page.pageNumber),
            imageUrl: page.illustrationImage
        };
    } else if (type === QUESTION_TYPES.CONTENT) {
        // 내용 맞히기
        return {
            type: type,
            text: `이 장면에서 무슨 일이 일어났나요?`,
            hint: `페이지 ${page.pageNumber}`,
            correctAnswer: page.text,
            options: generateContentOptions(page.text),
            imageUrl: page.illustrationImage
        };
    } else if (type === QUESTION_TYPES.IMAGE) {
        // 그림 맞히기
        return {
            type: type,
            text: `이 그림에 맞는 장면은?`,
            hint: `힌트: ${page.scene_structure?.atmosphere || ''}`,
            correctAnswer: page.text,
            options: generateContentOptions(page.text),
            imageUrl: page.illustrationImage
        };
    }

    return null;
}

// 순서 선택지 생성
function generateOrderOptions(correctNumber) {
    const options = [correctNumber];
    
    while (options.length < 4) {
        const random = Math.floor(Math.random() * pages.length) + 1;
        if (!options.includes(random)) {
            options.push(random);
        }
    }

    return shuffle(options).map(num => `${num}번째 페이지`);
}

// 내용 선택지 생성
function generateContentOptions(correctText) {
    const options = [correctText];

    // 다른 페이지의 텍스트를 오답으로
    const otherPages = shuffle([...pages]).filter(p => p.text !== correctText);
    
    for (let i = 0; i < Math.min(3, otherPages.length); i++) {
        options.push(otherPages[i].text);
    }

    return shuffle(options);
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

// 문제 표시
function showQuestion() {
    const question = questions[currentQuestionIndex];
    isAnswered = false;

    // 진행 상태 업데이트
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('correct-count').textContent = correctAnswers;
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    // 문제 텍스트
    document.getElementById('question-text').textContent = question.text;
    document.getElementById('question-hint').textContent = question.hint;

    // 이미지 (있으면 표시)
    const imageElement = document.getElementById('question-image');
    if (question.imageUrl) {
        imageElement.src = question.imageUrl;
        imageElement.style.display = 'block';
    } else {
        imageElement.style.display = 'none';
    }

    // 선택지 생성
    const optionsGrid = document.getElementById('options-grid');
    optionsGrid.innerHTML = '';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = option;
        button.onclick = () => checkAnswer(option, button);
        optionsGrid.appendChild(button);
    });
}

// 정답 체크
function checkAnswer(selectedAnswer, button) {
    if (isAnswered) return;

    isAnswered = true;

    const question = questions[currentQuestionIndex];
    const correctAnswer = question.correctAnswer.toString();
    const isCorrect = selectedAnswer.includes(correctAnswer) || selectedAnswer === correctAnswer;

    // 정답/오답 표시
    if (isCorrect) {
        button.classList.add('correct');
        correctAnswers++;
        playSound('correct');
    } else {
        button.classList.add('wrong');
        wrongAnswers++;
        playSound('wrong');

        // 정답 버튼 표시
        const allButtons = document.querySelectorAll('.option-button');
        allButtons.forEach(btn => {
            if (btn.textContent.includes(correctAnswer) || btn.textContent === correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }

    // 2초 후 다음 문제
    setTimeout(() => {
        nextQuestion();
    }, 2000);
}

// 다음 문제
function nextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
        showQuestion();
    } else {
        showResult();
    }
}

// 결과 표시
function showResult() {
    const totalQuestions = questions.length;
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

    // 등급 결정
    let grade = '';
    let icon = '';
    if (accuracy >= 90) {
        grade = '동화 마스터';
        icon = '🏆';
    } else if (accuracy >= 70) {
        grade = '우수';
        icon = '🌟';
    } else if (accuracy >= 50) {
        grade = '보통';
        icon = '👍';
    } else {
        grade = '다시 읽어보기';
        icon = '📖';
    }

    // 결과 표시
    document.getElementById('result-icon').textContent = icon;
    document.getElementById('final-correct').textContent = correctAnswers;
    document.getElementById('final-wrong').textContent = wrongAnswers;
    document.getElementById('final-accuracy').textContent = accuracy;
    document.getElementById('final-grade').textContent = `등급: ${grade}`;

    // 모달 표시
    document.getElementById('result-modal').style.display = 'flex';

    playSound('complete');
}

// 게임 재시작
function restartGame() {
    currentQuestionIndex = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    document.getElementById('result-modal').style.display = 'none';
    
    generateQuestions();
    showQuestion();
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
