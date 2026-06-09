import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import streamlit as st
import pandas as pd
import db

ADMIN_PASSWORD = "admin1234"

st.set_page_config(page_title="관리자 페이지", page_icon="🔧", layout="wide")
st.title("🔧 관리자 페이지 — 데이터 업로드")

password = st.text_input("관리자 비밀번호", type="password")
if password != ADMIN_PASSWORD:
    st.warning("비밀번호를 입력하세요.")
    st.stop()

db.init_db()

# ── DB 연결 상태 ───────────────────────────────────────────────────────────────

db_url = db._get_db_url()
if db_url:
    host = db_url.split("@")[-1].split("/")[0] if "@" in db_url else db_url
    st.success(f"PostgreSQL 연결 중: `{host}`")
else:
    st.error("DATABASE_URL Secret이 설정되지 않았습니다. SQLite(로컬 임시 DB)를 사용 중입니다.")

# ── DB 현황 ────────────────────────────────────────────────────────────────────

st.subheader("현재 DB 현황")
counts = db.count_by_year()
if counts:
    summary_df = pd.DataFrame(
        [{"연도": y, "레코드 수": f"{c:,}건"} for y, c in counts.items()]
    )
    st.dataframe(summary_df, use_container_width=False, hide_index=True)
    st.caption(f"총 {sum(counts.values()):,}건")
else:
    st.info("DB가 비어 있습니다. 아래에서 엑셀 파일을 업로드하세요.")

st.divider()

# ── 엑셀 업로드 ────────────────────────────────────────────────────────────────

st.subheader("엑셀 파일 업로드")
uploaded_files = st.file_uploader(
    "업로드할 .xlsx 파일을 선택하세요 (여러 파일 동시 가능)",
    type=["xlsx"],
    accept_multiple_files=True,
)

NUM_COLS = [
    "기준가", "수량", "매출단가", "매출금액",
    "실매출단가", "실매출금액", "실매입단가", "실매입금액",
    "실이익금액", "실이익율", "기준가매출액",
]

valid_files = []
if uploaded_files:
    for f in uploaded_files:
        stem = Path(f.name).stem
        if not (stem.isdigit() and len(stem) == 4):
            st.warning(f"'{f.name}' — 파일명이 연도 형식(예: 2024.xlsx)이 아닙니다. 건너뜁니다.")
            continue
        year = stem
        try:
            df = pd.read_excel(f)
        except Exception as e:
            st.error(f"'{f.name}' 읽기 실패: {e}")
            continue

        for col in NUM_COLS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        df = df.dropna(subset=["실매출금액"])

        with st.expander(f"{year}년 미리보기 ({len(df):,}건)", expanded=False):
            st.dataframe(df.head(20), use_container_width=True)

        valid_files.append((year, df))

# ── 가져오기 ───────────────────────────────────────────────────────────────────

if valid_files:
    st.divider()
    overwrite = st.checkbox("연도별 기존 데이터 삭제 후 가져오기 (덮어쓰기)", value=True)

    if st.button("가져오기", type="primary", use_container_width=False):
        results = []
        with st.spinner("가져오는 중..."):
            for year, df in valid_files:
                if overwrite:
                    db.delete_by_year(year)
                count = db.insert_dataframe(df, year)
                results.append((year, count))

        st.cache_data.clear()
        lines = " / ".join(f"{y}년: {c:,}건" for y, c in results)
        total = sum(c for _, c in results)
        st.success(f"완료! {lines} — 총 {total:,}건 입력")
        st.rerun()

st.divider()

# ── 위험 구역 ──────────────────────────────────────────────────────────────────

with st.expander("위험 구역 — 데이터 삭제", expanded=False):
    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown("**연도별 삭제**")
        year_options = sorted(db.count_by_year().keys())
        if year_options:
            sel_year = st.selectbox("삭제할 연도", year_options)
            if st.button(f"{sel_year}년 데이터 삭제", type="secondary"):
                deleted = db.delete_by_year(sel_year)
                st.cache_data.clear()
                st.warning(f"{sel_year}년 데이터 {deleted:,}건 삭제됨")
                st.rerun()
        else:
            st.caption("삭제할 데이터 없음")

    with col_b:
        st.markdown("**전체 삭제**")
        confirm = st.checkbox("전체 삭제를 확인합니다")
        if st.button("전체 데이터 삭제", type="secondary", disabled=not confirm):
            deleted = db.delete_all()
            st.cache_data.clear()
            st.warning(f"전체 데이터 {deleted:,}건 삭제됨")
            st.rerun()
