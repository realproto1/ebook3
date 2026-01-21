// 단어 퀴즈 게임 (Word Quiz)
// 3가지 문제 유형: 뜻 맞히기, 단어 맞히기, 그림 보고 맞히기

// URL에서 스토리 ID 추출
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('story');

// 게임 상태
let storyData = null;
let vocabulary = [];
let questions = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
let isAnswered = false;

// 문제 유형
const QUESTION_TYPES = {
    MEANING: 'meaning',        // 단어 → 뜻 선택
    WORD: 'word',              // 뜻 → 단어 선택
    IMAGE: 'image'             // 그림 → 단어 선택
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

        // 문제 생성 (최대 8개)
        generateQuestions();

        // 첫 문제 표시
        showQuestion();

    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        alert('게임을 시작할 수 없습니다.');
        goBack();
    }
}

// 문제 생성
function generateQuestions() {
    questions = [];

    // 단어 셔플
    const shuffled = shuffle([...vocabulary]);

    // 최대 8개 문제
    const questionCount = Math.min(8, shuffled.length);

    for (let i = 0; i < questionCount; i++) {
        const word = shuffled[i];
        
        // 이미지가 있는 단어만 IMAGE 타입 가능
        let availableTypes = [QUESTION_TYPES.MEANING, QUESTION_TYPES.WORD];
        if (word.image || word.imageUrl) {
            availableTypes.push(QUESTION_TYPES.IMAGE);
        }
        
        // 사용 가능한 타입 중 순환 선택
        const typeIndex = i % availableTypes.length;
        const type = availableTypes[typeIndex];
        
        const question = createQuestion(word, type);
        questions.push(question);
    }

    // 문제 셔플
    questions = shuffle(questions);

    // 총 문제 수 표시
    document.getElementById('total-questions').textContent = questions.length;

    console.log(`✅ ${questions.length}개 문제 생성 완료`);
}

// 문제 생성 (유형별)
function createQuestion(word, type) {
    const question = {
        word: word,
        type: type,
        correctAnswer: '',
        options: []
    };

    if (type === QUESTION_TYPES.MEANING) {
        // 단어 → 뜻 선택
        question.text = `"${word.korean}"의 뜻은?`;
        question.correctAnswer = word.definition;
        question.options = generateOptions(word.definition, vocabulary.map(v => v.definition));

    } else if (type === QUESTION_TYPES.WORD) {
        // 뜻 → 단어 선택
        question.text = `"${word.definition}"에 해당하는 단어는?`;
        question.correctAnswer = word.korean;
        question.options = generateOptions(word.korean, vocabulary.map(v => v.korean));

    } else if (type === QUESTION_TYPES.IMAGE) {
        // 그림 → 단어 선택 (이미지가 있을 때만 이 타입 사용됨)
        question.text = `그림이 나타내는 단어는?`;
        question.imageUrl = word.image || word.imageUrl || null;
        question.correctAnswer = word.korean;
        question.options = generateOptions(word.korean, vocabulary.map(v => v.korean));
    }

    return question;
}

// 선택지 생성 (정답 1개 + 오답 3개)
function generateOptions(correctAnswer, allAnswers) {
    // 오답 3개 선택
    const wrongAnswers = allAnswers.filter(ans => ans !== correctAnswer);
    const selectedWrong = shuffle(wrongAnswers).slice(0, 3);

    // 정답 + 오답 섞기
    const options = shuffle([correctAnswer, ...selectedWrong]);

    return options;
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

    // 힌트 (영어 단어)
    document.getElementById('question-hint').textContent = `💡 힌트: ${question.word.word}`;

    // 이미지 (IMAGE 타입만)
    const imageElement = document.getElementById('question-image');
    if (question.type === QUESTION_TYPES.IMAGE) {
        if (question.imageUrl) {
            // 이미지가 있으면 표시
            imageElement.src = question.imageUrl;
            imageElement.style.display = 'block';
            imageElement.onerror = () => {
                // 이미지 로드 실패 시 텍스트로 대체
                imageElement.style.display = 'none';
                document.getElementById('question-text').textContent = `"${question.word.korean}"은(는) 무엇일까요?`;
            };
        } else {
            // 이미지가 없으면 텍스트로 표시
            imageElement.style.display = 'none';
            document.getElementById('question-text').textContent = `"${question.word.korean}"은(는) 무엇일까요?`;
        }
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
    const isCorrect = selectedAnswer === question.correctAnswer;

    // 정답/오답 표시
    if (isCorrect) {
        button.classList.add('correct');
        correctAnswers++;
        playSound('correct');

        // 1초 후 설명 모달 표시
        setTimeout(() => {
            showExplanation(question.word);
        }, 1000);

    } else {
        button.classList.add('wrong');
        wrongAnswers++;
        playSound('wrong');

        // 정답 버튼 표시
        const allButtons = document.querySelectorAll('.option-button');
        allButtons.forEach(btn => {
            if (btn.textContent === question.correctAnswer) {
                btn.classList.add('correct');
            }
        });

        // 2초 후 다음 문제
        setTimeout(() => {
            nextQuestion();
        }, 2000);
    }
}

// 단어 설명 모달 표시
function showExplanation(word) {
    document.getElementById('explanation-word').textContent = word.korean;
    document.getElementById('explanation-meaning').textContent = word.definition;
    document.getElementById('explanation-example').textContent = `예문: "${word.example}"`;
    document.getElementById('explanation-modal').style.display = 'flex';
}

// 설명 모달 닫기 및 다음 문제
function closeExplanation() {
    document.getElementById('explanation-modal').style.display = 'none';
    nextQuestion();
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
        grade = '최우수';
        icon = '🏆';
    } else if (accuracy >= 70) {
        grade = '우수';
        icon = '🌟';
    } else if (accuracy >= 50) {
        grade = '보통';
        icon = '👍';
    } else {
        grade = '다시 도전!';
        icon = '💪';
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
