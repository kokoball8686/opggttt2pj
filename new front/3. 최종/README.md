# TAG2.GG Web

RPCS3 Tekken Tag Tournament 2 온라인 대전 기록과 통계를 제공하는 웹 앱입니다.

## 기술 구성

- Next.js 16 App Router, React 19, TypeScript
- Supabase PostgreSQL RPC를 이용한 서버 데이터 조회
- Tailwind CSS 4, Recharts, Framer Motion
- PWA 설치 지원과 서비스 워커 기반 오프라인 보조 기능

## 로컬 실행

### 사전 조건

- Node.js 20.9.0 이상
- npm

### 설치 및 실행

PowerShell에서 저장소 루트 기준으로 실행합니다.

```powershell
Copy-Item .env.example .env.local
# .env.local에 실제 Supabase URL과 publishable/anon key 입력
npm ci
npm run dev
```

개발 서버는 기본적으로 http://localhost:3000 에서 실행됩니다.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저/서버 요청에서 사용하는 publishable(anon) key |

- `.env.example`은 값 형식만 제공하는 템플릿입니다.
- `.env.local`은 Git에서 제외됩니다. 실제 키를 저장소에 커밋하지 마세요.
- `NEXT_PUBLIC_` 환경 변수는 공개 가능한 값이어야 합니다. Supabase의 service-role key를 여기에 넣거나 프론트엔드에 노출하지 마세요.
- 데이터 접근 권한은 Supabase의 정책과 RPC 권한에 따라 통제됩니다. 공개 키를 비밀 키처럼 취급하지 말고, 데이터베이스 권한 설정을 함께 확인하세요.

## Netlify 배포

이 프로젝트는 페이지뿐 아니라 `src/app/api/`의 서버 API도 사용합니다. 정적 HTML 파일만 올리는 방식이 아니라 Next.js를 지원하는 Netlify 빌드/런타임으로 배포해야 합니다.

1. GitHub 저장소를 Netlify 사이트에 연결합니다. 이 프로젝트는 GitHub Actions 워크플로가 아니라 Netlify의 Git 연동 빌드를 사용하는 구성입니다.
2. Netlify 빌드 환경 변수에 위의 Supabase 변수 두 개를 등록합니다.
3. 빌드 명령은 `npm run build`를 사용합니다. Next.js 프레임워크 감지와 Netlify의 출력 설정을 확인하고, 정적 사이트용 출력 폴더를 임의로 지정하지 마세요.
4. 환경 변수를 바꾸면 새 빌드·배포를 실행합니다.

## 주요 페이지와 API

| 경로 | 기능 |
|------|------|
| `/` | 대시보드 통계 |
| `/players` | 플레이어 순위 |
| `/matches` | 전체 경기 기록 |
| `/profile/[name]` | 플레이어 통계와 개인 경기 기록 |
| `/download` | Tracker 다운로드 페이지 |
| `/api/statistics/dashboard` | 대시보드 통계 API |
| `/api/statistics/rankings` | 플레이어 순위 API |
| `/api/statistics/profile` | 플레이어 및 선택 상대 통계 API |
| `/api/statistics/search` | 플레이어 이름 자동완성 API |
| `/api/matches` | 전체 경기 페이지 API |
| `/api/matches/player` | 플레이어 경기 페이지 API |

전체·개인 경기 기록은 페이지당 10건씩 조회하며, 응답의 전체 건수에 따라 페이지를 이동합니다. 프로필 기록은 대시보드 일부 행에 한정된 목록이 아닙니다.

## 명령어

```powershell
npm run dev
npm run lint
npm test
npm run build
npm run start
```

## 프로젝트 구조

```text
src/app          페이지, 레이아웃, API Route Handler
src/components   대시보드, 프로필, 경기 목록, 차트, 검색, PWA UI
src/hooks        화면 데이터 조회 Hook
src/lib          타입, 파서, 통계·캐시 및 서버 데이터 접근 모듈
public           캐릭터·맵 이미지, 앱 아이콘, 서비스 워커
```
