#!/usr/bin/env python3
"""Bounded, read-only RIO capacity test against an isolated Vercel preview.

NO POST/PUT/PATCH/DELETE, no production hostname, no login attempts or mutations.
Vercel preview may share production Supabase, so the database-backed QR path
is intentionally capped at 30 simultaneous readers and <=148 requests.
"""
import concurrent.futures
import csv
import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

BASE = os.environ["RIO_PREVIEW_BASE"].rstrip("/")
if not BASE.startswith("https://rio-qr-restaurant-") or not BASE.endswith(".vercel.app"):
    raise SystemExit("SAFETY HALT: target is not a Vercel preview deployment URL")
if "rio-qr-restaurant.vercel.app" in BASE:
    raise SystemExit("SAFETY HALT: never stress the production alias")
DEPLOYMENT = os.environ["RIO_EXPECTED_DEPLOYMENT"]
TOKEN = os.environ["RIO_TEST_QR_TOKEN"]
HEADERS = {
    "User-Agent": "RIO-Capacity-Audit/2026-11-03 (read-only; controlled)",
    "Accept": "text/html",
    "Cache-Control": "no-cache",
}
TARGETS = {
    "management_login": ("/management/login", b"Management inloggen"),
    "qr_menu": ("/qr/" + TOKEN, b"Toevoegen"),
}
# Managers only: Vercel-auth/login page has minimal Supabase work.
# QR reads resolve token and fetch section/menu rows from existing Supabase.
# Avoid excessive shared-database activity.
STAGES = [
    ("management_login", 1, 15),
    ("management_login", 10, 40),
    ("management_login", 25, 75),
    ("management_login", 50, 100),
    ("management_login", 100, 140),
    ("qr_menu", 1, 8),
    ("qr_menu", 5, 15),
    ("qr_menu", 10, 25),
    ("qr_menu", 20, 40),
    ("qr_menu", 30, 60),
]
assert sum(n for kind, workers, n in STAGES if kind == "qr_menu") == 148
assert max(w for kind,w,_ in STAGES if kind == "qr_menu") == 30
assert max(w for _,w,_ in STAGES) == 100
assert sum(n for _,_,n in STAGES) == 518 # 370 login + 148 QR

def request(target: str, number: int) -> dict:
    route, marker = TARGETS[target]
    start = time.perf_counter()
    status = 0
    size = 0
    marker_ok = False
    deployment_ok = False
    error_text = ""
    try:
        req = urllib.request.Request(BASE+route, headers=HEADERS, method="GET")
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            body = resp.read(180_000)
            size = len(body)
            marker_ok = marker in body
            deployment_ok = DEPLOYMENT.encode() in body
    except urllib.error.HTTPError as exc:
        status = exc.code
        error_text = "HTTP " + str(exc.code)
    except Exception as exc:
        error_text = type(exc).__name__ + ": " + str(exc)[:90]
    elapsed = round((time.perf_counter()-start)*1000,2)
    return {
        "route":target, "ordinal":number, "status":status,
        "ms":elapsed,"bytes":size,
        "body_ok":marker_ok, "deployment_ok":deployment_ok,
        "error":error_text,
    }

def percentile(values:list[float], p:float) -> float:
    if not values:return 0.0
    ordered=sorted(values)
    i=(len(ordered)-1)*p
    low=int(i)
    high=min(low+1,len(ordered)-1)
    return round(ordered[low]+(ordered[high]-ordered[low])*(i-low),1)

def main() -> int:
    # Never run load unless the correct preview is reachable.
    for target in TARGETS:
        sample = request(target,-1)
        print("PREFLIGHT "+target+": "+json.dumps(sample,ensure_ascii=False),flush=True)
        if sample["status"]!=200 or not sample["body_ok"] or not sample["deployment_ok"]:
            print("SAFETY HALT: preview inaccessible, wrong deployment, or no expected page",flush=True)
            return 2

    report={
      "kind":"bounded-readonly-preview",
      "preview":BASE,
      "deployment":DEPLOYMENT,
      "time_utc":datetime.now(timezone.utc).isoformat(),
      "safety":"No mutations, QR reads max 30 concurrent, 148 total; same Supabase as live",
      "stages":[],
    }
    allrows=[]
    for target, concurrency, count in STAGES:
        start=time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
            rows=list(pool.map(lambda i:request(target,i),range(count)))
        duration=time.perf_counter()-start
        allrows+=rows
        status_counts=dict(sorted(Counter(r["status"] for r in rows).items()))
        failures=[r for r in rows if r["status"]!=200 or not r["body_ok"] or not r["deployment_ok"]]
        duration_ms=[r["ms"] for r in rows]
        metrics={
           "route":target,
           "concurrency":concurrency,
           "requests":len(rows),
           "duration_seconds":round(duration,2),
           "requests_per_second":round(len(rows)/max(duration,0.001),1),
           "success_pct":round(100*(len(rows)-len(failures))/len(rows),2),
           "failed":len(failures),
           "status_codes":status_counts,
           "p50_ms":percentile(duration_ms,.5),
           "p95_ms":percentile(duration_ms,.95),
           "p99_ms":percentile(duration_ms,.99),
           "max_ms":max(duration_ms),
           "min_ms":min(duration_ms),
           "errors":[r["error"] for r in failures[:5]],
        }
        report["stages"].append(metrics)
        print("STAGE: "+json.dumps(metrics,ensure_ascii=False),flush=True)
        if len(failures)>=max(3,len(rows)*.05) or metrics["p95_ms"]>8000:
            print("SAFETY HALT: high failures or 8-second p95; stop further load",flush=True)
            report["aborted_reason"]="failures_or_latency"
            break
        time.sleep(3)

    Path("rio-capacity-results.json").write_text(
      json.dumps(report,indent=2,ensure_ascii=False),encoding="utf8")
    with open("rio-capacity-requests.csv","w",newline="",encoding="utf8") as fh:
        writer=csv.DictWriter(fh,fieldnames=["route","ordinal","status","ms","bytes","body_ok","deployment_ok","error"])
        writer.writeheader()
        writer.writerows(allrows)
    print("RESULT_SUMMARY: "+json.dumps({
       "stages_run":len(report["stages"]),
       "requests_total":len(allrows),
       "errors_total":sum(s["failed"] for s in report["stages"]),
       "aborted":bool(report.get("aborted_reason")),
    }),flush=True)
    return 1 if report.get("aborted_reason") else 0

if __name__=="__main__":
  sys.exit(main())
