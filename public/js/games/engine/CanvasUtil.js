/**
 * CanvasUtil
 * - 캔버스 초기화 및 관리
 * - 드로잉 유틸리티
 * - 고해상도 디스플레이 지원
 */

class CanvasUtil {
    /**
     * 캔버스 초기화
     * @param {HTMLCanvasElement|string} canvas
     * @param {Object} options
     * @returns {Object} { canvas, ctx }
     */
    static init(canvas, options = {}) {
        const canvasEl = typeof canvas === 'string' ? DOM.id(canvas) : canvas;
        if (!canvasEl) {
            throw new Error('Canvas element not found');
        }

        const {
            willReadFrequently = true,
            pixelRatio = window.devicePixelRatio || 1
        } = options;

        // Context 생성
        const ctx = canvasEl.getContext('2d', { willReadFrequently });

        // 고해상도 디스플레이 지원
        const rect = canvasEl.getBoundingClientRect();
        canvasEl.width = rect.width * pixelRatio;
        canvasEl.height = rect.height * pixelRatio;
        canvasEl.style.width = rect.width + 'px';
        canvasEl.style.height = rect.height + 'px';
        ctx.scale(pixelRatio, pixelRatio);

        return { canvas: canvasEl, ctx };
    }

    /**
     * 캔버스 초기화 (그리기 설정 포함)
     * @param {HTMLCanvasElement} canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} options
     */
    static setupDrawing(canvas, ctx, options = {}) {
        const {
            strokeStyle = '#333',
            lineWidth = 25,
            lineCap = 'round',
            lineJoin = 'round'
        } = options;

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = lineCap;
        ctx.lineJoin = lineJoin;
    }

    /**
     * 캔버스 지우기
     * @param {HTMLCanvasElement} canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    static clear(canvas, ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * 선 그리기
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     */
    static drawLine(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    /**
     * 원 그리기
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {Object} options
     */
    static drawCircle(ctx, x, y, radius, options = {}) {
        const { fill = false, stroke = true } = options;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    /**
     * 텍스트 그리기
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {Object} options
     */
    static drawText(ctx, text, x, y, options = {}) {
        const {
            font = '24px Arial',
            fillStyle = '#000',
            strokeStyle = null,
            textAlign = 'center',
            textBaseline = 'middle',
            fill = true,
            stroke = false
        } = options;

        ctx.save();
        ctx.font = font;
        ctx.fillStyle = fillStyle;
        if (strokeStyle) ctx.strokeStyle = strokeStyle;
        ctx.textAlign = textAlign;
        ctx.textBaseline = textBaseline;

        if (stroke && strokeStyle) ctx.strokeText(text, x, y);
        if (fill) ctx.fillText(text, x, y);

        ctx.restore();
    }

    /**
     * 이미지 그리기
     * @param {CanvasRenderingContext2D} ctx
     * @param {Image} image
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    static drawImage(ctx, image, x, y, width, height) {
        ctx.drawImage(image, x, y, width, height);
    }

    /**
     * 캔버스에 그림이 있는지 확인
     * @param {HTMLCanvasElement} canvas
     * @param {CanvasRenderingContext2D} ctx
     * @returns {boolean}
     */
    static hasDrawing(canvas, ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * 마우스 이벤트 좌표 가져오기
     * @param {MouseEvent} event
     * @param {HTMLCanvasElement} canvas
     * @returns {Object} { x, y }
     */
    static getMousePos(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    /**
     * 터치 이벤트 좌표 가져오기
     * @param {TouchEvent} event
     * @param {HTMLCanvasElement} canvas
     * @returns {Object} { x, y }
     */
    static getTouchPos(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    /**
     * 캔버스를 이미지로 변환
     * @param {HTMLCanvasElement} canvas
     * @param {string} format - 'image/png', 'image/jpeg'
     * @param {number} quality - 0.0 ~ 1.0
     * @returns {string} Data URL
     */
    static toDataURL(canvas, format = 'image/png', quality = 0.92) {
        return canvas.toDataURL(format, quality);
    }

    /**
     * 캔버스를 Blob으로 변환
     * @param {HTMLCanvasElement} canvas
     * @param {string} format
     * @param {number} quality
     * @returns {Promise<Blob>}
     */
    static toBlob(canvas, format = 'image/png', quality = 0.92) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert canvas to blob'));
                }
            }, format, quality);
        });
    }

    /**
     * ImageData 비교 (정확도 계산)
     * @param {ImageData} userImageData
     * @param {ImageData} guideImageData
     * @param {Object} options
     * @returns {number} 정확도 (0-100)
     */
    static calculateAccuracy(userImageData, guideImageData, options = {}) {
        const {
            searchRadius = 12,
            alphaThreshold = 50
        } = options;

        const userPixels = userImageData.data;
        const guidePixels = guideImageData.data;
        const width = guideImageData.width;
        const height = guideImageData.height;

        let totalGuidePixels = 0;
        let matchingPixels = 0;

        // 가이드 글자의 모든 픽셀 검사
        for (let i = 0; i < guidePixels.length; i += 4) {
            const guideAlpha = guidePixels[i + 3];

            if (guideAlpha > alphaThreshold) {
                totalGuidePixels++;

                // 현재 픽셀 좌표
                const pixelIndex = i / 4;
                const x = pixelIndex % width;
                const y = Math.floor(pixelIndex / width);

                // 주변 영역 검사 (펜 두께 고려)
                let foundMatch = false;
                for (let dy = -searchRadius; dy <= searchRadius && !foundMatch; dy++) {
                    for (let dx = -searchRadius; dx <= searchRadius && !foundMatch; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;

                        // 경계 체크
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const ni = (ny * width + nx) * 4;
                            const userAlpha = userPixels[ni + 3];

                            // 원형 반경 내에서 사용자가 그렸으면 매칭
                            if (userAlpha > alphaThreshold && (dx * dx + dy * dy) <= searchRadius * searchRadius) {
                                matchingPixels++;
                                foundMatch = true;
                            }
                        }
                    }
                }
            }
        }

        // 정확도 계산
        if (totalGuidePixels === 0) return 0;
        return (matchingPixels / totalGuidePixels) * 100;
    }
}

// 전역으로 export
if (typeof window !== 'undefined') {
    window.CanvasUtil = CanvasUtil;
}

// ES6 module export
export default CanvasUtil;
