/**
 * DownloadService.js
 * 파일 다운로드 서비스
 */

(function() {
    'use strict';

    class DownloadService {
        constructor() {
            this.api = null;
        }

        /**
         * 초기화
         */
        init(dependencies) {
            this.api = dependencies.api;
            console.log('✅ DownloadService 초기화 완료');
        }

        /**
         * 이미지 다운로드
         * @param {string} imageUrl - 이미지 URL
         * @param {string} filename - 파일명
         */
        async downloadImage(imageUrl, filename) {
            try {
                const downloadUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
                
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                console.log(`✅ 이미지 다운로드: ${filename}`);
            } catch (error) {
                console.error('Download error:', error);
                throw error;
            }
        }

        /**
         * 오디오 다운로드
         * @param {string} audioUrl - 오디오 URL
         * @param {string} filename - 파일명
         */
        async downloadAudio(audioUrl, filename) {
            try {
                const downloadUrl = `/api/download-audio?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`;
                
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                console.log(`✅ 오디오 다운로드: ${filename}`);
            } catch (error) {
                console.error('Download error:', error);
                throw error;
            }
        }

        /**
         * 모든 캐릭터 레퍼런스 이미지 다운로드
         * @param {Object} storybook - 동화책 객체
         */
        async downloadAllCharacterReferences(storybook) {
            if (!storybook || !storybook.characters) {
                throw new Error('동화책 또는 캐릭터가 없습니다.');
            }
            
            const characters = storybook.characters.filter(c => c.referenceImage);
            
            if (characters.length === 0) {
                throw new Error('다운로드할 캐릭터 레퍼런스가 없습니다.');
            }
            
            console.log(`📦 ${characters.length}개 캐릭터 레퍼런스 다운로드 시작...`);
            
            for (const [index, character] of characters.entries()) {
                const filename = `character_${character.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${index + 1}.png`;
                await this.downloadImage(character.referenceImage, filename);
                
                // 다운로드 간 딜레이
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            console.log(`✅ ${characters.length}개 캐릭터 레퍼런스 다운로드 완료`);
        }

        /**
         * 모든 삽화 다운로드
         * @param {Object} storybook - 동화책 객체
         */
        async downloadAllIllustrations(storybook) {
            if (!storybook || !storybook.pages) {
                throw new Error('동화책 또는 페이지가 없습니다.');
            }
            
            const pagesWithImages = storybook.pages.filter(p => p.illustrationImage);
            
            if (pagesWithImages.length === 0) {
                throw new Error('다운로드할 삽화가 없습니다.');
            }
            
            console.log(`📦 ${pagesWithImages.length}개 삽화 다운로드 시작...`);
            
            for (const page of pagesWithImages) {
                const filename = `page_${String(page.pageNumber).padStart(2, '0')}_illustration.png`;
                await this.downloadImage(page.illustrationImage, filename);
                
                // 다운로드 간 딜레이
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            console.log(`✅ ${pagesWithImages.length}개 삽화 다운로드 완료`);
        }

        /**
         * 모든 Key Object 이미지 다운로드
         * @param {Object} storybook - 동화책 객체
         */
        async downloadAllKeyObjectImages(storybook) {
            if (!storybook || !storybook.keyObjectImages) {
                throw new Error('동화책 또는 Key Object 이미지가 없습니다.');
            }
            
            const keyObjects = storybook.keyObjectImages.filter(obj => obj.imageUrl);
            
            if (keyObjects.length === 0) {
                throw new Error('다운로드할 Key Object 이미지가 없습니다.');
            }
            
            console.log(`📦 ${keyObjects.length}개 Key Object 이미지 다운로드 시작...`);
            
            for (const [index, obj] of keyObjects.entries()) {
                const filename = `keyobject_${obj.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${index + 1}.png`;
                await this.downloadImage(obj.imageUrl, filename);
                
                // 다운로드 간 딜레이
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            console.log(`✅ ${keyObjects.length}개 Key Object 이미지 다운로드 완료`);
        }

        /**
         * 모든 단어 학습 이미지 다운로드
         * @param {Object} storybook - 동화책 객체
         */
        async downloadAllVocabularyImages(storybook) {
            if (!storybook || !storybook.vocabulary) {
                throw new Error('동화책 또는 단어 학습 데이터가 없습니다.');
            }
            
            const vocabWithImages = storybook.vocabulary.filter(v => v.imageUrl);
            
            if (vocabWithImages.length === 0) {
                throw new Error('다운로드할 단어 학습 이미지가 없습니다.');
            }
            
            console.log(`📦 ${vocabWithImages.length}개 단어 학습 이미지 다운로드 시작...`);
            
            for (const [index, vocab] of vocabWithImages.entries()) {
                const filename = `vocabulary_${vocab.word.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${index + 1}.png`;
                await this.downloadImage(vocab.imageUrl, filename);
                
                // 다운로드 간 딜레이
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            console.log(`✅ ${vocabWithImages.length}개 단어 학습 이미지 다운로드 완료`);
        }

        /**
         * 모든 오디오 다운로드
         * @param {Object} storybook - 동화책 객체
         */
        async downloadAllAudio(storybook) {
            if (!storybook || !storybook.pages) {
                throw new Error('동화책 또는 페이지가 없습니다.');
            }
            
            const pagesWithAudio = storybook.pages.filter(p => p.ttsAudio);
            
            if (pagesWithAudio.length === 0) {
                throw new Error('다운로드할 오디오가 없습니다.');
            }
            
            console.log(`📦 ${pagesWithAudio.length}개 오디오 다운로드 시작...`);
            
            for (const page of pagesWithAudio) {
                const filename = `page_${String(page.pageNumber).padStart(2, '0')}_audio.mp3`;
                const audioUrl = page.ttsAudio?.ko?.url || page.audioUrl;
                if (audioUrl) {
                    await this.downloadAudio(audioUrl, filename);
                }
                
                // 다운로드 간 딜레이
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            console.log(`✅ ${pagesWithAudio.length}개 오디오 다운로드 완료`);
        }

        /**
         * 모든 텍스트 다운로드 (TXT 파일)
         * @param {Object} storybook - 동화책 객체
         */
        downloadAllText(storybook) {
            if (!storybook || !storybook.pages) {
                throw new Error('동화책 또는 페이지가 없습니다.');
            }
            
            let textContent = `${storybook.title}\n`;
            textContent += `테마: ${storybook.theme}\n`;
            textContent += `예술 스타일: ${storybook.artStyle}\n\n`;
            textContent += '=' .repeat(50) + '\n\n';
            
            storybook.pages.forEach(page => {
                textContent += `페이지 ${page.pageNumber}\n`;
                textContent += '-'.repeat(30) + '\n';
                textContent += `${page.text}\n\n`;
            });
            
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${storybook.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_전체텍스트.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ 전체 텍스트 다운로드 완료');
        }
    }

    // 브라우저 환경에서 전역으로 노출
    if (typeof window !== 'undefined') {
        window.DownloadService = DownloadService;
        console.log('✅ DownloadService.js 로드 완료');
    }
})();
