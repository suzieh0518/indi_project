import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
import db

st.set_page_config(
    page_title="영업 실적 대시보드",
    page_icon="📊",
    layout="wide",
)

db.init_db()

# ── 데이터 로드 ────────────────────────────────────────────────────────────────

@st.cache_data
def get_filter_options():
    return db.load_filter_options()

@st.cache_data
def load_data(years, customers, mfrs, suppliers, reps, min_sales, max_sales):
    df = db.load_filtered_data(years, customers, mfrs, suppliers, reps, min_sales, max_sales)
    num_cols = ["수량", "매출금액", "실매출금액", "실매입금액", "실이익금액", "실이익율", "기준가매출액", "기준가"]
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df

opts = get_filter_options()
if not opts["years"]:
    st.error("데이터베이스가 비어 있습니다. 관리자 페이지에서 엑셀 파일을 업로드하세요.")
    st.stop()

# ── 사이드바 필터 ──────────────────────────────────────────────────────────────

with st.sidebar:
    st.title("🔍 필터")

    sel_years     = st.multiselect("연도",   opts["years"],         default=opts["years"])
    sel_customers = st.multiselect("매출처", opts["customers"],     default=[])
    sel_mfr       = st.multiselect("제조사", opts["manufacturers"], default=[])
    sel_suppliers = st.multiselect("매입처", opts["suppliers"],     default=[])
    sel_reps      = st.multiselect("담당자", opts["reps"],          default=[])

    sales_range = st.slider(
        "실매출금액 범위 (원)",
        min_value=opts["min_sales"],
        max_value=opts["max_sales"],
        value=(opts["min_sales"], opts["max_sales"]),
        format="%d",
    )

    top_n = st.slider("차트 Top N", min_value=5, max_value=30, value=10)

    st.divider()
    st.caption("필터 미선택 시 전체 표시")

# ── DB 필터 쿼리 ───────────────────────────────────────────────────────────────

df = load_data(
    years=tuple(sel_years),
    customers=tuple(sel_customers),
    mfrs=tuple(sel_mfr),
    suppliers=tuple(sel_suppliers),
    reps=tuple(sel_reps),
    min_sales=sales_range[0],
    max_sales=sales_range[1],
)

# ── KPI 카드 ───────────────────────────────────────────────────────────────────

st.title("📊 영업 실적 대시보드")

k1, k2, k3, k4, k5 = st.columns(5)
k1.metric("총 매출금액", f"{df['실매출금액'].sum() / 1e8:,.1f}억")
k2.metric("총 이익금액", f"{df['실이익금액'].sum() / 1e8:,.1f}억")
k3.metric("평균 이익율", f"{df['실이익율'].mean():.2f}%")
k4.metric("총 판매수량", f"{df['수량'].sum():,.0f}개")
k5.metric("거래 건수", f"{len(df):,}건")

st.divider()

# ── 탭 구성 ────────────────────────────────────────────────────────────────────

tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs(
    ["📅 연도별", "🏥 매출처별", "🏭 제조사·매입처별", "👤 담당자별", "📦 제품별", "➕ 데이터 입력"]
)

# ── Tab 1: 연도별 ──────────────────────────────────────────────────────────────

with tab1:
    col1, col2 = st.columns(2)

    with col1:
        year_sales = df.groupby("연도").agg(
            실매출금액=("실매출금액", "sum"),
            실이익금액=("실이익금액", "sum"),
        ).reset_index()
        fig = go.Figure()
        fig.add_bar(x=year_sales["연도"], y=year_sales["실매출금액"] / 1e8, name="매출", marker_color="#6366F1")
        fig.add_bar(x=year_sales["연도"], y=year_sales["실이익금액"] / 1e8, name="이익", marker_color="#10B981")
        fig.update_layout(title="연도별 매출 vs 이익 (억원)", barmode="group", yaxis_title="억원")
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        year_margin = df.groupby("연도")["실이익율"].mean().reset_index()
        fig2 = px.line(
            year_margin, x="연도", y="실이익율", markers=True,
            title="연도별 평균 이익율 (%)",
            color_discrete_sequence=["#F59E0B"],
        )
        fig2.update_layout(yaxis_title="%")
        st.plotly_chart(fig2, use_container_width=True)

    # 연도별 상세 테이블
    year_detail = df.groupby("연도").agg(
        거래건수=("수량", "count"),
        총수량=("수량", "sum"),
        총매출=("실매출금액", "sum"),
        총이익=("실이익금액", "sum"),
        평균이익율=("실이익율", "mean"),
    ).reset_index()
    year_detail["총매출"] = year_detail["총매출"].map("{:,.0f}".format)
    year_detail["총이익"] = year_detail["총이익"].map("{:,.0f}".format)
    year_detail["평균이익율"] = year_detail["평균이익율"].map("{:.2f}%".format)
    st.dataframe(year_detail, use_container_width=True, hide_index=True)

# ── Tab 2: 매출처별 ────────────────────────────────────────────────────────────

with tab2:
    col1, col2 = st.columns(2)

    with col1:
        top_customer = (
            df.groupby("매출처")["실매출금액"].sum()
            .nlargest(top_n)
            .reset_index()
            .sort_values("실매출금액")
        )
        fig = px.bar(
            top_customer, x="실매출금액", y="매출처", orientation="h",
            title=f"매출처 Top {top_n} (실매출금액)",
            color="실매출금액", color_continuous_scale="Blues",
        )
        fig.update_layout(xaxis_title="원", showlegend=False)
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        top_profit_customer = (
            df.groupby("매출처")["실이익금액"].sum()
            .nlargest(top_n)
            .reset_index()
            .sort_values("실이익금액")
        )
        fig2 = px.bar(
            top_profit_customer, x="실이익금액", y="매출처", orientation="h",
            title=f"매출처 Top {top_n} (실이익금액)",
            color="실이익금액", color_continuous_scale="Greens",
        )
        fig2.update_layout(xaxis_title="원", showlegend=False)
        st.plotly_chart(fig2, use_container_width=True)

    # 연도별 매출처 비교
    if len(sel_years) != 1:
        pivot = (
            df.groupby(["매출처", "연도"])["실매출금액"].sum()
            .reset_index()
        )
        top_c_list = df.groupby("매출처")["실매출금액"].sum().nlargest(top_n).index.tolist()
        pivot = pivot[pivot["매출처"].isin(top_c_list)]
        fig3 = px.bar(
            pivot, x="매출처", y="실매출금액", color="연도", barmode="group",
            title=f"매출처 Top {top_n} 연도별 비교",
            color_discrete_sequence=px.colors.qualitative.Set2,
        )
        fig3.update_layout(xaxis_tickangle=-30)
        st.plotly_chart(fig3, use_container_width=True)

# ── Tab 3: 제조사·매입처별 ────────────────────────────────────────────────────

with tab3:
    col1, col2 = st.columns(2)

    with col1:
        top_mfr = (
            df.groupby("제조사")["실매출금액"].sum()
            .nlargest(top_n)
            .reset_index()
            .sort_values("실매출금액")
        )
        fig = px.bar(
            top_mfr, x="실매출금액", y="제조사", orientation="h",
            title=f"제조사 Top {top_n} (실매출금액)",
            color="실매출금액", color_continuous_scale="Purples",
        )
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        top_supplier = (
            df.groupby("매입처")["실매출금액"].sum()
            .nlargest(top_n)
            .reset_index()
            .sort_values("실매출금액")
        )
        fig2 = px.bar(
            top_supplier, x="실매출금액", y="매입처", orientation="h",
            title=f"매입처 Top {top_n} (실매출금액)",
            color="실매출금액", color_continuous_scale="Oranges",
        )
        st.plotly_chart(fig2, use_container_width=True)

    # 제조사 파이차트
    mfr_pie = df.groupby("제조사")["실매출금액"].sum().nlargest(10).reset_index()
    fig3 = px.pie(
        mfr_pie, names="제조사", values="실매출금액",
        title="제조사 매출 비중 Top 10",
        color_discrete_sequence=px.colors.qualitative.Pastel,
    )
    st.plotly_chart(fig3, use_container_width=True)

# ── Tab 4: 담당자별 ────────────────────────────────────────────────────────────

with tab4:
    col1, col2 = st.columns(2)

    with col1:
        rep_summary = df.groupby("담당자").agg(
            실매출금액=("실매출금액", "sum"),
            실이익금액=("실이익금액", "sum"),
            건수=("수량", "count"),
            평균이익율=("실이익율", "mean"),
        ).reset_index().sort_values("실매출금액", ascending=False)

        fig = px.bar(
            rep_summary.head(top_n), x="담당자", y="실매출금액",
            title=f"담당자별 실매출금액 Top {top_n}",
            color="실이익금액", color_continuous_scale="RdYlGn",
            text_auto=".2s",
        )
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        fig2 = px.scatter(
            rep_summary,
            x="실매출금액", y="실이익금액",
            size="건수", color="평균이익율",
            color_continuous_scale="RdYlGn",
            hover_name="담당자",
            title="담당자별 매출 vs 이익 (원 크기 = 건수)",
            labels={"실매출금액": "실매출금액(원)", "실이익금액": "실이익금액(원)"},
        )
        st.plotly_chart(fig2, use_container_width=True)

    # 연도별 담당자 비교
    if len(sel_years) != 1:
        rep_year = df.groupby(["담당자", "연도"])["실매출금액"].sum().reset_index()
        top_rep_list = rep_summary.head(top_n)["담당자"].tolist()
        rep_year = rep_year[rep_year["담당자"].isin(top_rep_list)]
        fig3 = px.bar(
            rep_year, x="담당자", y="실매출금액", color="연도", barmode="group",
            title=f"담당자 Top {top_n} 연도별 비교",
            color_discrete_sequence=px.colors.qualitative.Set2,
        )
        st.plotly_chart(fig3, use_container_width=True)

    st.subheader("담당자 상세 테이블")
    tbl = rep_summary.copy()
    tbl["실매출금액"] = tbl["실매출금액"].map("{:,.0f}".format)
    tbl["실이익금액"] = tbl["실이익금액"].map("{:,.0f}".format)
    tbl["평균이익율"] = tbl["평균이익율"].map("{:.2f}%".format)
    st.dataframe(tbl, use_container_width=True, hide_index=True)

# ── Tab 5: 제품별 ──────────────────────────────────────────────────────────────

with tab5:
    col1, col2 = st.columns(2)

    with col1:
        top_product = (
            df.groupby("제품명")["실매출금액"].sum()
            .nlargest(top_n)
            .reset_index()
            .sort_values("실매출금액")
        )
        fig = px.bar(
            top_product, x="실매출금액", y="제품명", orientation="h",
            title=f"제품 Top {top_n} (실매출금액)",
            color="실매출금액", color_continuous_scale="Blues",
        )
        fig.update_layout(yaxis_tickfont_size=9)
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        top_qty = (
            df.groupby("제품명")["수량"].sum()
            .nlargest(top_n)
            .reset_index()
            .sort_values("수량")
        )
        fig2 = px.bar(
            top_qty, x="수량", y="제품명", orientation="h",
            title=f"제품 Top {top_n} (판매수량)",
            color="수량", color_continuous_scale="Greens",
        )
        fig2.update_layout(yaxis_tickfont_size=9)
        st.plotly_chart(fig2, use_container_width=True)

    # 이익율 분포
    margin_data = df["실이익율"].dropna()
    margin_data = margin_data[(margin_data > -100) & (margin_data < 100)]
    fig3 = px.histogram(
        margin_data, x="실이익율", nbins=80,
        title="실이익율 분포",
        color_discrete_sequence=["#8B5CF6"],
    )
    fig3.add_vline(x=margin_data.mean(), line_dash="dash", line_color="red",
                   annotation_text=f"평균 {margin_data.mean():.1f}%")
    st.plotly_chart(fig3, use_container_width=True)

    st.subheader("제품 상세 검색")
    search = st.text_input("제품명 검색")
    if search:
        result = df[df["제품명"].str.contains(search, na=False)]
        st.dataframe(result[["연도","제품명","규격","제조사","매출처","담당자","수량","실매출금액","실이익금액","실이익율"]],
                     use_container_width=True, hide_index=True)

# ── Tab 6: 데이터 입력 ─────────────────────────────────────────────────────────

with tab6:
    st.subheader("새 거래 건 입력")

    # 기존 데이터에서 자동완성용 목록 추출
    suppliers_list = opts["suppliers"]
    mfr_list       = opts["manufacturers"]
    customer_list  = opts["customers"]
    rep_list       = opts["reps"]

    with st.form("data_entry_form", clear_on_submit=True):
        c1, c2, c3 = st.columns(3)

        with c1:
            st.markdown("**기본 정보**")
            year_sel   = st.selectbox("연도 *", ["2025", "2024", "2023"])
            supplier   = st.selectbox("매입처 *", suppliers_list)
            new_supp   = st.text_input("매입처 직접 입력 (신규일 때만)")
            mfr        = st.selectbox("제조사 *", mfr_list)
            new_mfr    = st.text_input("제조사 직접 입력 (신규일 때만)")
            customer   = st.selectbox("매출처 *", customer_list)
            new_cust   = st.text_input("매출처 직접 입력 (신규일 때만)")
            inv_loc    = st.text_input("재고적용처", placeholder="매출처와 같으면 비워도 됩니다")
            rep        = st.selectbox("담당자 *", rep_list)

        with c2:
            st.markdown("**제품 정보**")
            product    = st.text_input("제품명 *")
            spec       = st.text_input("규격")
            ins_code   = st.text_input("보험코드")
            ref_price  = st.number_input("기준가 (원)", min_value=0, step=1)
            qty        = st.number_input("수량 *", min_value=1, step=1, value=1)

        with c3:
            st.markdown("**단가 정보**")
            unit_price        = st.number_input("매출단가 (원)", min_value=0, step=1)
            actual_unit_price = st.number_input("실매출단가 (원)", min_value=0, step=1)
            actual_unit_purch = st.number_input("실매입단가 (원)", min_value=0, step=1)

            st.divider()
            st.markdown("**자동 계산 미리보기**")
            sales_amt    = unit_price * qty
            act_sales    = actual_unit_price * qty
            act_purch    = actual_unit_purch * qty
            act_profit   = act_sales - act_purch
            profit_rate  = (act_profit / act_sales * 100) if act_sales > 0 else 0.0
            ref_sales    = ref_price * qty

            st.caption(f"매출금액: **{sales_amt:,}원**")
            st.caption(f"실매출금액: **{act_sales:,}원**")
            st.caption(f"실매입금액: **{act_purch:,}원**")
            st.caption(f"실이익금액: **{act_profit:,}원**")
            st.caption(f"실이익율: **{profit_rate:.2f}%**")
            st.caption(f"기준가매출액: **{ref_sales:,}원**")

        submitted = st.form_submit_button("💾 저장", use_container_width=True, type="primary")

    if submitted:
        final_supplier = new_supp.strip() if new_supp.strip() else supplier
        final_mfr      = new_mfr.strip()  if new_mfr.strip()  else mfr
        final_customer = new_cust.strip() if new_cust.strip() else customer
        final_inv_loc  = inv_loc.strip()  if inv_loc.strip()  else final_customer

        if not product.strip():
            st.error("제품명은 필수입니다.")
        else:
            next_seq = db.get_next_seq(year_sel)
            row = {
                "연도":      year_sel,
                "순번":      next_seq,
                "매입처":    final_supplier,
                "제조사":    final_mfr,
                "매출처":    final_customer,
                "재고적용처": final_inv_loc,
                "제품명":    product.strip(),
                "규격":      spec.strip(),
                "보험코드":  ins_code.strip(),
                "기준가":    ref_price,
                "수량":      qty,
                "매출단가":  unit_price,
                "매출금액":  sales_amt,
                "실매출단가": actual_unit_price,
                "실매출금액": act_sales,
                "실매입단가": actual_unit_purch,
                "실매입금액": act_purch,
                "실이익금액": act_profit,
                "실이익율":  profit_rate,
                "담당자":    rep,
                "기준가매출액": ref_sales,
            }
            db.insert_row(row)
            st.cache_data.clear()
            st.success(f"✅ {year_sel}년 데이터에 저장되었습니다. (순번 {next_seq})")
            st.rerun()
