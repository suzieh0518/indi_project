# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

영업 실적 대시보드 — 2023~2025년 Excel 데이터를 기반으로 한 B2B 의료기기 영업 분석 앱. 동일한 대시보드가 세 가지 구현체로 병존한다.

## 실행 명령어

### Streamlit 앱 (현재 배포 중)
```bash
streamlit run app.py          # 로컬 실행 (port 8501)
./run_dashboard.sh            # 로컬 IP 출력 포함 실행
```

### FastAPI + PWA 백엔드
```bash
python3 api.py                # port 8000, static/ 파일도 서빙
```

### Next.js 앱 (마이그레이션 진행 중)
```bash
cd nextapp
npm install
npm run dev                   # port 3000, FastAPI가 8000에서 실행 중이어야 함
npm run build && npm start    # 프로덕션
```

### DB 초기화 및 Excel → DB 이전
```bash
python3 -c "
import db, pandas as pd
from pathlib import Path
db.init_db()
for year in ['2023','2024','2025']:
    df = pd.read_excel(f'{year}.xlsx')
    db.insert_dataframe(df, year)
"
```

## 아키텍처

### 세 가지 구현체

| 구현체 | 진입점 | 데이터 소스 | 배포 |
|--------|--------|-------------|------|
| Streamlit | `app.py` | `db.py` → SQLite/PostgreSQL | Streamlit Community Cloud |
| FastAPI + PWA | `api.py` + `static/` | xlsx 직접 읽기 (pandas) | Railway 예정 |
| Next.js | `nextapp/` | `/api/*` → FastAPI 프록시 | Vercel 예정 |

**중요:** `api.py`는 `db.py`를 사용하지 않는다. xlsx 파일을 직접 읽어 pandas로 처리한다. `app.py`만 `db.py`를 통해 DB를 사용한다.

### 데이터 레이어 (`db.py`)

- 로컬: `sales.db` (SQLite)
- 프로덕션: `DATABASE_URL` 환경변수 또는 Streamlit Secret → PostgreSQL
- 단일 테이블 `sales` (21컬럼): 연도, 순번, 매입처, 제조사, 매출처, 재고적용처, 제품명, 규격, 보험코드, 기준가, 수량, 매출단가, 매출금액, 실매출단가, 실매출금액, 실매입단가, 실매입금액, 실이익금액, 실이익율, 담당자, 기준가매출액
- SQLite 대용량 삽입 시 `chunksize=40` 필수 (변수 999개 제한)

### FastAPI 백엔드 (`api.py`)

엔드포인트: `/api/options`, `/api/kpi`, `/api/yearly`, `/api/customers`, `/api/manufacturers`, `/api/reps`, `/api/products`, `/api/entry` (POST)

모든 GET 엔드포인트는 동일한 필터 쿼리 파라미터를 받는다: `years[]`, `customers[]`, `manufacturers[]`, `suppliers[]`, `reps[]`, `min_sales`, `max_sales`, `top_n`.

`/` 이하 정적 파일은 `static/` 디렉터리에서 서빙한다. API 라우트가 정적 마운트보다 먼저 정의되어야 우선순위가 보장된다.

### Next.js 앱 (`nextapp/`)

- `next.config.js`의 rewrites로 `/api/*` → FastAPI 서버로 프록시
- 환경변수 `NEXT_PUBLIC_API_URL` (기본값: `http://localhost:8000`)
- ApexCharts는 SSR 불가 → `dynamic(() => import('react-apexcharts'), { ssr: false })`로 로드
- 탭별 데이터 페칭: 각 탭 컴포넌트가 활성화될 때 자체적으로 fetch

### PWA 공통 사항

`static/`과 `nextapp/public/`에 각각 `manifest.json` + `sw.js` 존재. 서비스 워커는 `/api/` 경로는 캐싱하지 않는다.

## 환경 설정

```bash
# Python 의존성
pip3 install -r requirements.txt

# Streamlit Cloud PostgreSQL 연결 (.streamlit/secrets.toml 또는 Cloud Secrets)
DATABASE_URL = "postgresql://..."
```

`.gitignore`에 포함된 항목: `*.parquet`, `sales.db`, `__pycache__/`, `*.pyc`, `.DS_Store`

## 주요 파일

- `db.py` — SQLite/PostgreSQL 추상화, `init_db()` / `insert_dataframe()` / `load_filtered_data()` 등
- `api.py` — FastAPI 백엔드 (xlsx 직접 읽기, `static/` 서빙)
- `app.py` — Streamlit 메인 대시보드 (6탭 + 데이터 입력)
- `pages/01_Admin.py` — 관리자 페이지, 비밀번호 `admin1234`, xlsx 업로드 → DB 저장
- `nextapp/lib/api.ts` — 모든 API 호출 및 `fmt` 유틸 (억/만원 포맷)
- `nextapp/components/ApexChart.tsx` — ApexCharts 동적 임포트 래퍼
