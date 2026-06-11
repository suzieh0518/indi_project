import sys
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
from pathlib import Path

# 한글 폰트 설정
def set_korean_font():
    font_candidates = [
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        "/Library/Fonts/NanumGothic.ttf",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    ]
    for path in font_candidates:
        if Path(path).exists():
            fe = fm.FontEntry(fname=path, name="KoreanFont")
            fm.fontManager.ttflist.insert(0, fe)
            plt.rcParams["font.family"] = "KoreanFont"
            break
    plt.rcParams["axes.unicode_minus"] = False

set_korean_font()

# 파일 로드
file_path = sys.argv[1] if len(sys.argv) > 1 else "2025.xlsx"
print(f"파일 로드 중: {file_path}")
df = pd.read_excel(file_path)

# 숫자형 컬럼 정리
num_cols = ["수량", "매출금액", "실매출금액", "실매입금액", "실이익금액", "실이익율", "기준가매출액"]
for col in num_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.dropna(subset=["실매출금액"])

print(f"총 {len(df):,}건 로드 완료")

# ── 요약 통계 ──────────────────────────────────────────
total_sales     = df["실매출금액"].sum()
total_purchase  = df["실매입금액"].sum()
total_profit    = df["실이익금액"].sum()
avg_margin      = df["실이익율"].mean()
total_qty       = df["수량"].sum()

print("\n=== 전체 요약 ===")
print(f"총 매출금액:  {total_sales:>15,.0f} 원")
print(f"총 매입금액:  {total_purchase:>15,.0f} 원")
print(f"총 이익금액:  {total_profit:>15,.0f} 원")
print(f"평균 이익율:  {avg_margin:>14.2f} %")
print(f"총 판매수량:  {total_qty:>15,.0f} 개")

# ── 차트 레이아웃 ───────────────────────────────────────
fig = plt.figure(figsize=(20, 24))
fig.suptitle("2025 영업 실적 대시보드", fontsize=22, fontweight="bold", y=0.98)

# 요약 카드 (텍스트)
ax0 = fig.add_subplot(4, 2, (1, 2))
ax0.axis("off")
summary_text = (
    f"총 매출금액: {total_sales/1e8:,.1f}억 원    "
    f"총 이익금액: {total_profit/1e8:,.1f}억 원    "
    f"평균 이익율: {avg_margin:.2f}%    "
    f"총 판매수량: {total_qty:,.0f}개    "
    f"거래 건수: {len(df):,}건"
)
ax0.text(0.5, 0.5, summary_text, ha="center", va="center", fontsize=13,
         bbox=dict(boxstyle="round,pad=0.6", facecolor="#EEF2FF", edgecolor="#6366F1", linewidth=2))

# 1. 매출처 Top 10 — 실매출금액
ax1 = fig.add_subplot(4, 2, 3)
top_customer = (
    df.groupby("매출처")["실매출금액"].sum()
    .nlargest(10)
    .sort_values()
)
bars = ax1.barh(top_customer.index, top_customer.values / 1e6, color="#6366F1")
ax1.set_title("매출처 Top 10 (실매출금액)", fontweight="bold")
ax1.set_xlabel("금액 (백만원)")
for bar, val in zip(bars, top_customer.values):
    ax1.text(bar.get_width() + top_customer.values.max() * 0.01 / 1e6,
             bar.get_y() + bar.get_height() / 2,
             f"{val/1e6:,.0f}", va="center", fontsize=8)
ax1.tick_params(axis="y", labelsize=8)

# 2. 담당자별 실이익금액
ax2 = fig.add_subplot(4, 2, 4)
rep_profit = (
    df.groupby("담당자")["실이익금액"].sum()
    .nlargest(15)
    .sort_values()
)
colors = ["#10B981" if v >= 0 else "#EF4444" for v in rep_profit.values]
bars2 = ax2.barh(rep_profit.index, rep_profit.values / 1e6, color=colors)
ax2.set_title("담당자별 실이익금액 Top 15", fontweight="bold")
ax2.set_xlabel("금액 (백만원)")
ax2.axvline(0, color="black", linewidth=0.8)
ax2.tick_params(axis="y", labelsize=8)

# 3. 제조사 Top 10 — 실매출금액
ax3 = fig.add_subplot(4, 2, 5)
top_mfr = (
    df.groupby("제조사")["실매출금액"].sum()
    .nlargest(10)
    .sort_values()
)
ax3.barh(top_mfr.index, top_mfr.values / 1e6, color="#F59E0B")
ax3.set_title("제조사 Top 10 (실매출금액)", fontweight="bold")
ax3.set_xlabel("금액 (백만원)")
ax3.tick_params(axis="y", labelsize=7)

# 4. 매입처 Top 10 — 실매출금액
ax4 = fig.add_subplot(4, 2, 6)
top_supplier = (
    df.groupby("매입처")["실매출금액"].sum()
    .nlargest(10)
    .sort_values()
)
ax4.barh(top_supplier.index, top_supplier.values / 1e6, color="#3B82F6")
ax4.set_title("매입처 Top 10 (실매출금액)", fontweight="bold")
ax4.set_xlabel("금액 (백만원)")
ax4.tick_params(axis="y", labelsize=8)

# 5. 실이익율 분포 히스토그램
ax5 = fig.add_subplot(4, 2, 7)
margin_data = df["실이익율"].dropna()
margin_data = margin_data[(margin_data > -100) & (margin_data < 100)]
ax5.hist(margin_data, bins=60, color="#8B5CF6", edgecolor="white", linewidth=0.3)
ax5.axvline(margin_data.mean(), color="#EF4444", linestyle="--", linewidth=1.5,
            label=f"평균 {margin_data.mean():.1f}%")
ax5.set_title("실이익율 분포", fontweight="bold")
ax5.set_xlabel("이익율 (%)")
ax5.set_ylabel("건수")
ax5.legend(fontsize=9)

# 6. 담당자별 매출 vs 이익 산점도
ax6 = fig.add_subplot(4, 2, 8)
rep_summary = df.groupby("담당자").agg(
    매출=("실매출금액", "sum"),
    이익=("실이익금액", "sum"),
    건수=("수량", "count")
).reset_index()
sc = ax6.scatter(
    rep_summary["매출"] / 1e6,
    rep_summary["이익"] / 1e6,
    s=rep_summary["건수"] * 2,
    alpha=0.7,
    c=rep_summary["이익"] / rep_summary["매출"] * 100,
    cmap="RdYlGn",
)
for _, row in rep_summary.iterrows():
    ax6.annotate(row["담당자"], (row["매출"] / 1e6, row["이익"] / 1e6),
                 fontsize=7, ha="center", va="bottom")
plt.colorbar(sc, ax=ax6, label="이익율(%)")
ax6.set_title("담당자별 매출 vs 이익 (원 크기 = 건수)", fontweight="bold")
ax6.set_xlabel("실매출금액 (백만원)")
ax6.set_ylabel("실이익금액 (백만원)")

plt.tight_layout(rect=[0, 0, 1, 0.97])

output_file = "dashboard_2025.png"
plt.savefig(output_file, dpi=150, bbox_inches="tight")
print(f"\n대시보드 저장 완료: {output_file}")
plt.show()
