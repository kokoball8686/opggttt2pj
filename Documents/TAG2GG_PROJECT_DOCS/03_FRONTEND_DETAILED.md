# 03. 프론트엔드 상세 문서

대상: `C:\1\ttt2_web\index.html`

## 1. 기술 형태

React나 Next.js 서버가 아니라 단일 정적 HTML 파일 중심의 애플리케이션이다. HTML에 화면 구조와 인라인 JavaScript가 있고, `css/main.css`가 디자인을 담당한다.

## 2. Supabase 조회

```javascript
function dashboardMatchQuery() {
  const fields = 'id,created_at,p1_name,p2_name,winner,start_time,end_time,' +
    'p1_score,p2_score,p1_main_character_id,p1_sub_character_id,' +
    'p2_main_character_id,p2_sub_character_id,map_id';
  return `${SUPABASE_URL}/rest/v1/matches?select=${fields}` +
    '&order=created_at.desc&limit=1000';
}
```

대시보드는 최신 1,000행을 한 번 가져온 뒤 여러 통계를 재사용한다. 프로필은 검색한 닉네임이 P1 또는 P2로 포함된 행을 다시 조회한다.

## 3. 화면 전환

`#home`, `#players`, `#matches`, `#profile/<name>` 해시를 이용한다. 페이지 전체를 새로 로드하지 않고 섹션의 `hidden` 클래스를 바꾼다.

```javascript
document.getElementById('dashboard').classList.toggle('hidden', view !== 'home');
document.getElementById('placeholder').classList.toggle('hidden', view === 'home');
document.getElementById('profile').classList.add('hidden');
```

## 4. 캐릭터 표시 및 에셋 구조

숫자 ID를 이미지 URL과 한국어 이름으로 바꾼다.

```javascript
const characterImage = id =>
  `<img src="assets/characters/${id}.webp" alt="캐릭터 이미지">`;

const teamMarkup = (main, sub) => {
  const ids = [main, sub].filter(id => id !== null && id !== undefined && id !== '');
  const uniqueIds = ids.length >= 2 && ids[0] === ids[1] ? [ids[0]] : ids.slice(0, 2);
  return `<div class="team-visual">${uniqueIds.map(id => characterImage(id)).join('')}</div>`;
};
```

동일 캐릭터 태그는 한 장만 표시해 모바일 공간을 절약한다.

### 4.1 캐릭터 이미지 에셋 사양 (`assets/characters/`)
- **규격 및 포맷**: 58개 전체 캐릭터 이미지가 `assets/characters/{id}.webp` 경로에 **200×200px 정사각형 무손실(True Lossless) WebP** 포맷으로 구축되어 있다.
- **맞춤 크롭(Headroom 유지)**: 각 캐릭터의 머리 꼭대기(`head_top`)를 기준으로 헤어스타일/뿔/가면이 잘리지 않도록 정밀 수동/자동 크롭을 거쳤으며, 투명 배경(RGBA)의 안티앨리어싱 품질이 완벽히 보존되어 웹사이트의 칠흑 같은 다크 테마(`--bg: #090d14`) 배경에서도 흰색 구멍이나 테두리 얼룩 없이 자연스럽게 투과·렌더링된다.

## 5. XSS 방어용 문자열 처리

닉네임과 오류 메시지처럼 데이터베이스에서 온 문자열을 HTML에 넣을 때 `escapeHTML`을 사용한다.

```javascript
const escapeHTML = value => String(value ?? '').replace(
  /[&<>"']/g,
  character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[character])
);
```

## 6. 대시보드 집계

### 전체 경기와 플레이어 수

각 행의 P1/P2를 합쳐 집합으로 만들고 플레이어 수를 계산한다.

### 캐릭터 픽률

P1/P2의 메인·서브 ID를 모두 세어 출현 횟수를 계산한다. 상위 6개를 선택하고 전체 캐릭터 사용 횟수 대비 퍼센트를 표시한다.

### 고승률 태그 조합

각 경기에서 P1 조합과 P2 조합을 각각 하나의 집계 항목으로 만든다.

```javascript
const key = team.ids.map(String).join('/');
const item = combos.get(key) || { ids: team.ids, games: 0, wins: 0 };
item.games++;
if (team.won) item.wins++;
combos.set(key, item);
```

최소 10경기 이상인 조합만 남기고 승률·경기 수 순으로 TOP 6을 만든다.

### 급상승 플레이어

최근 7일과 직전 7일을 각각 집계한다. 양쪽 모두 최소 10경기인 플레이어만 후보로 삼고 승률 증가폭이 가장 큰 한 명을 표시한다.

### 활동 차트

최근 30일을 UTC 날짜 단위로 만들고, 날짜별 경기 수를 SVG polyline과 polygon으로 그린다. 마우스 hover와 키보드 focus에 tooltip을 띄운다.

## 7. 프로필

```javascript
const playerMatches = matches.filter(match =>
  match.p1_name?.toLowerCase() === name.toLowerCase() ||
  match.p2_name?.toLowerCase() === name.toLowerCase()
);
const wins = playerMatches.filter(match =>
  match.winner?.toLowerCase() === name.toLowerCase()
).length;
```

프로필은 다음을 추가 계산한다.

- 승률
- 총 경기 시간
- 마지막 경기
- 주력 태그 조합 TOP 3
- 최근 상대 5명
- 상대별 승·패·승률
- 경기 정렬·페이지네이션

## 8. 경기 출력과 모바일

`renderMatchMarkup()`은 결과, 점수, 양쪽 닉네임, 캐릭터 이미지, 캐릭터 한국어 이름,
대전 맵 이름, 시작·종료 시각, 경기 지속 시간을 하나의 행으로 만든다. 맵 ID는
프론트엔드 매핑으로 표시 이름으로 변환하며, 알 수 없는 ID도 원본 숫자를 유지한다.

모바일에서는 CSS가 닉네임을 이미지 위에, 캐릭터 이름을 이미지 아래에 배치한다. 360px 이하에서는 열 폭과 이미지 크기를 더 축소한다.

## 9. 네트워크 실패

Supabase 요청이 실패하면 프로필 요약과 목록 영역에 실패 메시지를 표시하고 콘솔에도 오류를 기록한다. 화면은 성공한 것처럼 빈 데이터로 처리하지 않는다.
