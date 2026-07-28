#!/usr/bin/env python3
"""Retired database-backed news refresher.

Ramara Hub now links readers to the Township's current news page. This script
intentionally performs no network or database access.
"""
import sys

print("News refresh is unavailable in read-only mode; use https://www.ramara.ca/news/.", file=sys.stderr)
raise SystemExit(2)
