import sqlite3
import pandas as pd
from pathlib import Path

DB_PATH = str(Path(__file__).parent / "sales.db")

COLUMNS = [
    "연도", "순번", "매입처", "제조사", "매출처", "재고적용처",
    "제품명", "규격", "보험코드", "기준가", "수량",
    "매출단가", "매출금액", "실매출단가", "실매출금액",
    "실매입단가", "실매입금액", "실이익금액", "실이익율",
    "담당자", "기준가매출액",
]

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS sales (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    연도         TEXT NOT NULL,
    순번         INTEGER,
    매입처        TEXT,
    제조사        TEXT,
    매출처        TEXT,
    재고적용처      TEXT,
    제품명        TEXT,
    규격         TEXT,
    보험코드       TEXT,
    기준가        REAL,
    수량         REAL,
    매출단가       REAL,
    매출금액       REAL,
    실매출단가      REAL,
    실매출금액      REAL,
    실매입단가      REAL,
    실매입금액      REAL,
    실이익금액      REAL,
    실이익율       REAL,
    담당자        TEXT,
    기준가매출액     REAL
);
"""

INDEX_SQLS = [
    "CREATE INDEX IF NOT EXISTS idx_연도 ON sales(연도);",
    "CREATE INDEX IF NOT EXISTS idx_담당자 ON sales(담당자);",
    "CREATE INDEX IF NOT EXISTS idx_매출처 ON sales(매출처);",
    "CREATE INDEX IF NOT EXISTS idx_제조사 ON sales(제조사);",
    "CREATE INDEX IF NOT EXISTS idx_매입처 ON sales(매입처);",
]


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(CREATE_SQL)
        for sql in INDEX_SQLS:
            conn.execute(sql)


def load_all_data() -> pd.DataFrame:
    with get_connection() as conn:
        df = pd.read_sql_query(
            "SELECT * FROM sales ORDER BY 연도, 순번", conn
        )
    if not df.empty:
        df = df.drop(columns=["id"], errors="ignore")
    return df


def load_filter_options() -> dict:
    with get_connection() as conn:
        years = [r[0] for r in conn.execute(
            "SELECT DISTINCT 연도 FROM sales ORDER BY 연도"
        ).fetchall()]
        customers = [r[0] for r in conn.execute(
            "SELECT DISTINCT 매출처 FROM sales WHERE 매출처 IS NOT NULL ORDER BY 매출처"
        ).fetchall()]
        mfrs = [r[0] for r in conn.execute(
            "SELECT DISTINCT 제조사 FROM sales WHERE 제조사 IS NOT NULL ORDER BY 제조사"
        ).fetchall()]
        suppliers = [r[0] for r in conn.execute(
            "SELECT DISTINCT 매입처 FROM sales WHERE 매입처 IS NOT NULL ORDER BY 매입처"
        ).fetchall()]
        reps = [r[0] for r in conn.execute(
            "SELECT DISTINCT 담당자 FROM sales WHERE 담당자 IS NOT NULL ORDER BY 담당자"
        ).fetchall()]
        row = conn.execute(
            "SELECT MIN(실매출금액), MAX(실매출금액) FROM sales WHERE 실매출금액 IS NOT NULL"
        ).fetchone()
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
    params = []

    if years:
        placeholders = ",".join(["?"] * len(years))
        conditions.append(f"연도 IN ({placeholders})")
        params.extend(years)
    if customers:
        placeholders = ",".join(["?"] * len(customers))
        conditions.append(f"매출처 IN ({placeholders})")
        params.extend(customers)
    if mfrs:
        placeholders = ",".join(["?"] * len(mfrs))
        conditions.append(f"제조사 IN ({placeholders})")
        params.extend(mfrs)
    if suppliers:
        placeholders = ",".join(["?"] * len(suppliers))
        conditions.append(f"매입처 IN ({placeholders})")
        params.extend(suppliers)
    if reps:
        placeholders = ",".join(["?"] * len(reps))
        conditions.append(f"담당자 IN ({placeholders})")
        params.extend(reps)
    if min_sales is not None:
        conditions.append("실매출금액 >= ?")
        params.append(min_sales)
    if max_sales is not None:
        conditions.append("실매출금액 <= ?")
        params.append(max_sales)

    sql = "SELECT * FROM sales WHERE " + " AND ".join(conditions) + " ORDER BY 연도, 순번"
    with get_connection() as conn:
        df = pd.read_sql_query(sql, conn, params=params)
    df = df.drop(columns=["id"], errors="ignore")
    return df


def insert_dataframe(df: pd.DataFrame, year: str) -> int:
    rows = []
    for _, row in df.iterrows():
        rows.append(tuple(
            row.get(col) if col != "연도" else year
            for col in COLUMNS
        ))

    placeholders = ", ".join(["?"] * len(COLUMNS))
    sql = f"INSERT INTO sales ({', '.join(COLUMNS)}) VALUES ({placeholders})"

    with get_connection() as conn:
        conn.executemany(sql, rows)
    return len(rows)


def insert_row(row: dict) -> int:
    placeholders = ", ".join(["?"] * len(COLUMNS))
    sql = f"INSERT INTO sales ({', '.join(COLUMNS)}) VALUES ({placeholders})"
    values = tuple(row.get(col) for col in COLUMNS)
    with get_connection() as conn:
        cursor = conn.execute(sql, values)
        return cursor.lastrowid


def delete_by_year(year: str) -> int:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM sales WHERE 연도 = ?", (year,))
        return cursor.rowcount


def delete_all() -> int:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM sales")
        return cursor.rowcount


def get_next_seq(year: str) -> int:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT MAX(순번) FROM sales WHERE 연도 = ?", (year,)
        ).fetchone()
    current_max = row[0] if row and row[0] is not None else 0
    return current_max + 1


def count_by_year() -> dict:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT 연도, COUNT(*) as cnt FROM sales GROUP BY 연도 ORDER BY 연도"
        ).fetchall()
    return {r["연도"]: r["cnt"] for r in rows}


if __name__ == "__main__":
    init_db()
    print("DB 초기화 완료:", DB_PATH)
