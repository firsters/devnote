# DevNote (데브노트) 🚀

개발자를 위한 코드 스니펫 및 메모 관리 웹 애플리케이션입니다. React와 Vite를 기반으로 하며, Firebase 클라우드 동기화와 PWA(Progressive Web App) 기능을 통해 모든 기기에서 끊김 없는 개발 메모 경험을 제공합니다.

## ✨ 주요 기능

- **Firebase 클라우드 동기화**: Google 로그인을 통해 여러 기기 간에 노트를 실시간으로 동기화하고 안전하게 백업합니다.
- **강력한 마크다운 지원**: `react-markdown`을 통해 표, 작업 목록 등 GFM(GitHub Flavored Markdown)을 완벽하게 렌더링합니다.
- **스마트한 붙여넣기**: Gemini, Confluence 등 웹 페이지의 내용을 복사해서 붙여넣으면 자동으로 마크다운으로 변환되어 저장됩니다.
- **태그 및 전역 검색**: 태그 시스템과 강력한 검색 기능을 통해 필요한 정보를 즉시 찾아낼 수 있습니다.
- **목록 확장/축소**: 컴팩트한 리스트 뷰와 상세 내용을 바로 볼 수 있는 확장형 뷰를 지원합니다.
- **커스텀 다이얼로그**: 앱의 무드에 맞춘 세련된 확인창과 알림 UI를 제공합니다.
- **전용 PWA 통합**: '홈 화면에 추가' 기능을 통해 네이티브 앱처럼 실행되며, 오프라인 환경에서도 최적의 성능을 보장합니다.

## 🛠 기술 스택

- **Core**: React 18, Vite
- **Backend**: Firebase (Authentication, Firestore)
- **Styling**: Tailwind CSS, Lucide React
- **Markdown**: react-markdown, remark-gfm, turndown
- **PWA**: PWA Manifest, Service Worker (Local Asset Branding)

## 🚀 시작하기

### 환경 변수 설정

`.env` 파일에 Firebase 설정값을 입력해야 합니다:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

### 앱 설치 방법

- **데스크톱**: 브라우저 주소창 우측의 [앱 설치] 아이콘 클릭
- **모바일 (iOS/Android)**: 브라우저 메뉴에서 [홈 화면에 추가] 선택

## 📄 라이선스

이 프로젝트는 개인 개발용으로 제작되었습니다.
