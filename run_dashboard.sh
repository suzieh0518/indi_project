#!/bin/bash
export HOME="/Users/suziehong"
export PATH="/Users/suziehong/Library/Python/3.9/bin:/usr/local/bin:/usr/bin:/bin"
export STREAMLIT_SERVER_ADDRESS="0.0.0.0"
export STREAMLIT_SERVER_PORT="8501"
export STREAMLIT_SERVER_HEADLESS="true"
export STREAMLIT_BROWSER_GATHER_USAGE_STATS="false"

cd "/Users/suziehong/Documents/indi_project"
exec /Users/suziehong/Library/Python/3.9/bin/streamlit run app.py
