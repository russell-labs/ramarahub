#!/usr/bin/env python3
"""Retired database ingester.

Ramara Hub now ships as a read-only static site. This script intentionally performs
no crawl and no write. Restore the pre-conversion commit on an isolated branch if a
future, separately approved backend migration needs the old ingestion pipeline.
"""
import sys

print("Database ingestion is unavailable in read-only mode.", file=sys.stderr)
raise SystemExit(2)
