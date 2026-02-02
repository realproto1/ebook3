/**
 * API 모듈
 * - axios 래핑
 * - 에러 처리 통일
 * - 재사용 가능한 API 호출
 */

class API {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * 공통 에러 처리
     */
    handleError(error, customMessage) {
        console.error('API Error:', error);
        
        if (error.response) {
            // 서버 응답 에러 (4xx, 5xx)
            const status = error.response.status;
            const message = error.response.data?.message || error.response.data?.error || customMessage;
            
            switch (status) {
                case 400:
                    throw new Error(message || '잘못된 요청입니다.');
                case 401:
                    throw new Error('인증이 필요합니다.');
                case 403:
                    throw new Error('권한이 없습니다.');
                case 404:
                    throw new Error(message || '데이터를 찾을 수 없습니다.');
                case 500:
                    throw new Error('서버 오류가 발생했습니다.');
                default:
                    throw new Error(message || `서버 오류 (${status})`);
            }
        } else if (error.request) {
            // 요청은 보냈지만 응답 없음
            throw new Error('서버에 연결할 수 없습니다.');
        } else {
            // 요청 설정 중 에러
            throw new Error(customMessage || '요청 중 오류가 발생했습니다.');
        }
    }

    /**
     * GET 요청
     */
    async get(url, config = {}) {
        try {
            const response = await axios.get(`${this.baseURL}${url}`, {
                headers: { ...this.defaultHeaders, ...config.headers },
                ...config
            });
            return response.data;
        } catch (error) {
            this.handleError(error, config.errorMessage);
        }
    }

    /**
     * POST 요청
     */
    async post(url, data, config = {}) {
        try {
            const response = await axios.post(`${this.baseURL}${url}`, data, {
                headers: { ...this.defaultHeaders, ...config.headers },
                ...config
            });
            return response.data;
        } catch (error) {
            this.handleError(error, config.errorMessage);
        }
    }

    /**
     * PUT 요청
     */
    async put(url, data, config = {}) {
        try {
            const response = await axios.put(`${this.baseURL}${url}`, data, {
                headers: { ...this.defaultHeaders, ...config.headers },
                ...config
            });
            return response.data;
        } catch (error) {
            this.handleError(error, config.errorMessage);
        }
    }

    /**
     * DELETE 요청
     */
    async delete(url, config = {}) {
        try {
            const response = await axios.delete(`${this.baseURL}${url}`, {
                headers: { ...this.defaultHeaders, ...config.headers },
                ...config
            });
            return response.data;
        } catch (error) {
            this.handleError(error, config.errorMessage);
        }
    }

    /**
     * FormData POST 요청 (파일 업로드)
     */
    async uploadFile(url, formData, config = {}) {
        try {
            const response = await axios.post(`${this.baseURL}${url}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...config.headers
                },
                onUploadProgress: config.onUploadProgress,
                ...config
            });
            return response.data;
        } catch (error) {
            this.handleError(error, config.errorMessage || '파일 업로드 중 오류가 발생했습니다.');
        }
    }
}

// 싱글톤 인스턴스 생성
const api = new API();

// 전역으로 export (ES6 모듈이 아닌 경우)
if (typeof window !== 'undefined') {
    window.API = API;
    window.api = api;
}
