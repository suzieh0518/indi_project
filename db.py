import os
import pandas as pd
from pathlib import Path
from sqlalchemy import create_engine, text

DB_PATH = str(Path(__file__).parent / "sales.db")

COLUMNS = [
    "연도", "순번", "매입처", "제조사", "매출처", "재고적용처",
    "제품명", "규격", "보험코드", "기준가", "수량",
    "매출단가", "매출금액", "실매출단가", "실매출금액",
    "실매입단가", "실매입금액", "실이익금액", "실이익율",
    "담당자", "기준가매출액",
]

CREATE_SQL_SQLITE = """
CREATE TABLE IF NOT EXISTS sales (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    연도         TEXT NOT NULL,
    순번         INTEGER,
    매입처        TEXT, 제조사 TEXT, 매출처 TEXT, 재고적용처 TEXT,
    제품명        TEXT, 규격 TEXT, 보험코드 TEXT,
    기준가        REAL, 수량 REAL, 매출단가 REAL, 매출금액 REAL,
    실매출단가      REAL, 실매출금액 REAL,
    실매입단가      REAL, 실매입금액 REAL,
    실이익금액      REAL, 실이익율 REAL,
    담당자        TEXT, 기준가매출액 REAL
)
"""

CREATE_SQL_PG = """
CREATE TABLE IF NOT EXISTS sales (
    id          BIGSERIAL PRIMARY KEY,
    연도         TEXT NOT NULL,
    순번         INTEGER,
    매입처        TEXT, 제조사 TEXT, 매출처 TEXT, 재고적용처 TEXT,
    제품명        TEXT, 규격 TEXT, 보험코드 TEXT,
    기준가        REAL, 수량 REAL, 매출단가 REAL, 매출금액 REAL,
    실매출단가      REAL, 실매출금액 REAL,
    실매입단가      REAL, 실매입금액 REAL,
    실이익금액      REAL, 실이익율 REAL,
    담당자        TEXT, 기준가매출액 REAL
)
"""

INDEX_SQLS = [
    "CREATE INDEX IF NOT EXISTS idx_연도 ON sales(연도)",
    "CREATE INDEX IF NOT EXISTS idx_담당자 ON sales(담당자)",
    "CREATE INDEX IF NOT EXISTS idx_매출처 ON sales(매출처)",
    "CREATE INDEX IF NOT EXISTS idx_제조사 ON sales(제조사)",
    "CREATE INDEX IF NOT EXISTS idx_매입처 ON sales(매입처)",
]


def _get_db_url():
    try:
        import streamlit as st
        return st.secrets["DATABASE_URL"]
    except Exception:
        pass
    return os.environ.get("DATABASE_URL")


def get_engine():
    url = _get_db_url()
    if url:
        return create_engine(url, pool_pre_ping=True)
    return create_engine(f"sqlite:///{DB_PATH}")


def init_db() -> None:
    engine = get_engine()
    is_pg = _get_db_url() is not None
    create_sql = CREATE_SQL_PG if is_pg else CREATE_SQL_SQLITE
    with engine.begin() as conn:
        conn.execute(text(create_sql))
        for sql in INDEX_SQLS:
            conn.execute(text(sql))


def load_filter_options() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        years = [r[0] for r in conn.execute(text(
            "SELECT DISTINCT 연도 FROM sales ORDER BY 연도"
        )).fetchall()]
        customers = [r[0] for r in conn.execute(text(
            "SELECT DISTINCT 매출처 FROM sales WHERE 매출처 IS NOT NULL ORDER BY 매출처"
        )).fetchall()]
        mfrs = [r[0] for r in conn.execute(text(
            "SELECT DISTINCT 제조사 FROM sales WHERE 제조사 IS NOT NULL ORDER BY 제조사"
        )).fetchall()]
        suppliers = [r[0] for r in conn.execute(text(
            "SELECT DISTINCT 매입처 FROM sales WHERE 매입처 IS NOT NULL ORDER BY 매입처"
        )).fetchall()]
        reps = [r[0] for r in conn.execute(text(
            "SELECT DISTINCT 담당자 FROM sales WHERE 담당자 IS NOT NULL ORDER BY 담당자"
        )).fetchall()]
        row = conn.execute(text(
            "SELECT MIN(실매출금액), MAX(실매출금액) FROM sales WHERE 실매출금액 IS NOT NULL"
        )).fetchone()
    return {
        "years": years,
        "customers": customers,
        "manufacturers": mfrs,
        "suppliers": suppliers,
        "reps": reps,
        "min_sales": int(row[0]) if row[0] is not None else 0,
        "max_sales": int(row[1]) if row[1] is not None else 0,
    }


def load_filtered_data(
    years=(), customers=(), mfrs=(), suppliers=(), reps=(),
    min_sales=None, max_sales=None,
) -> pd.DataFrame:
    conditions = ["실매출금액 IS NOT NULL"]
    params = {}

    if years:
        keys = [f"y{i}" for i in range(len(years))]
        conditions.append(f"연도 IN ({', '.join(':' + k for k in keys)})")
        params.update(dict(zip(keys, years)))

    if customers:
        keys = [f"c{i}" for i in range(len(customers))]
        conditions.append(f"매출처 IN ({', '.join(':' + k for k in keys)})")
        params.update(dict(zip(keys, customers)))

    if mfrs:
        keys = [f"m{i}" for i in range(len(mfrs))]
        conditions.append(f"제조사 IN ({', '.join(':' + k for k in keys)})")
        params.update(dict(zip(keys, mfrs)))

    if suppliers:
        keys = [f"s{i}" for i in range(len(suppliers))]
        conditions.append(f"매입처 IN ({', '.join(':' + k for k in keys)})")
        params.update(dict(zip(keys, suppliers)))

    if reps:
        keys = [f"r{i}" for i in range(len(reps))]
        conditions.append(f"담당자 IN ({', '.join(':' + k for k in keys)})")
        params.update(dict(zip(keys, reps)))

    if min_sales is not None:
        conditions.append("실매출금액 >= :min_sales")
        params["min_sales"] = min_sales

    if max_sales is not None:
        conditions.append("실매출금액 <= :max_sales")
        params["max_sales"] = max_sales

    sql = "SELECT * FROM sales WHERE " + " AND ".join(conditions) + " ORDER BY 연도, 순번"
    engine = get_engine()
    bound = text(sql).bindparams(**params) if params else text(sql)
    with engine.connect() as conn:
        df = pd.read_sql_query(bound, conn)
    df = df.drop(columns=["id"], errors="ignore")
    return df


def load_all_data() -> pd.DataFrame:
    engine = get_engine()
    with engine.connect() as conn:
        df = pd.read_sql_query(text("SELECT * FROM sales ORDER BY 연도, 순번"), conn)
    df = df.drop(columns=["id"], errors="ignore")
    return df


def insert_dataframe(df: pd.DataFrame, year: str) -> int:
    df = df.copy()
    df["연도"] = year
    cols = [c for c in COLUMNS if c in df.columns]
    engine = get_engine()
    df[cols].to_sql("sales", engine, if_exists="append", index=False, method="multi")
    return len(df)


def insert_row(row: dict) -> bool:
    df = pd.DataFrame([{c: row.get(c) for c in COLUMNS}])
    engine = get_engine()
    df.to_sql("sales", engine, if_exists="append", index=False, method="multi")
    return True


def delete_by_year(year: str) -> int:
    engine = get_engine()
    with engine.begin() as conn:
        result = conn.execute(text("DELETE FROM sales WHERE 연도 = :year"), {"year": year})
    return result.rowcount


def delete_all() -> int:
    engine = get_engine()
    with engine.begin() as conn:
        result = conn.execute(text("DELETE FROM sales"))
    return result.rowcount


def get_next_seq(year: str) -> int:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT MAX(순번) FROM sales WHERE 연도 = :year"), {"year": year}
        ).fetchone()
    current_max = row[0] if row and row[0] is not None else 0
    return current_max + 1


def count_by_year() -> dict:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT 연도, COUNT(*) as cnt FROM sales GROUP BY 연도 ORDER BY 연도"
        )).fetchall()
    return {r[0]: r[1] for r in rows}


if __name__ == "__main__":
    init_db()
    print("DB 초기화 완료:", _get_db_url() or DB_PATH)
