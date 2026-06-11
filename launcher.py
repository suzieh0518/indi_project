#!/usr/bin/env python3
import os, sys

PROJECT_DIR = '/Users/suziehong/Documents/indi_project'

_orig_getcwd = os.getcwd
def _safe_getcwd():
    try:
        return _orig_getcwd()
    except (PermissionError, OSError):
        return PROJECT_DIR

os.getcwd = _safe_getcwd

sys.argv = ['streamlit', 'run', PROJECT_DIR + '/app.py']
from streamlit.web.cli import main
sys.exit(main())
