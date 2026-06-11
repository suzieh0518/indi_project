#!/bin/bash
export HOME="/Users/suziehong"
export PATH="/Users/suziehong/Library/Python/3.9/bin:/usr/local/bin:/usr/bin:/bin"

cd "/Users/suziehong/Desktop/뚝딱/indi_project"

pip install -r requirements.txt -q

echo ""
echo "======================================"
echo "  영업 실적 대시보드 (PWA)"
echo "======================================"
echo "  PC 접속:      http://localhost:8000"

# 로컬 WiFi IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null)
if [ -n "$LOCAL_IP" ]; then
  echo "  사내 WiFi:    http://$LOCAL_IP:8000"
fi

# Tailscale IP
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null)
if [ -n "$TAILSCALE_IP" ]; then
  echo ""
  echo "  🌐 Tailscale: http://$TAILSCALE_IP:8000"
  echo "     (외부에서도 이 주소로 접속 가능)"
else
  echo ""
  echo "  ⚠️  Tailscale 미연결 — 외부 접속 불가"
  echo "     https://tailscale.com 에서 설치 후 재실행"
fi

echo ""
echo "  📱 모바일: 위 주소 접속 → 홈 화면에 추가"
echo "======================================"
echo ""

exec python api.py
