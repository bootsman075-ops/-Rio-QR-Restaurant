#!/usr/bin/env python3
"""Small bounded public read-only RIO stress run; no POST requests.

Runs only against the public hostname with a hard budget of <= 327 GET
requests, maximum concurrency 100 on login UI, 15 on QR (production DB).
Stops on 5xx, high errors, or p95 > 8s. Never performs management login.
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

BASE="https://rio-qr-restaurant.vercel.app"
QR_TOKEN=os.environ["RIO_QR_AUDIT_TOKEN"]
PATHS={"login":("/management/login",b"Management inloggen"),
       "qr":("/qr/"+QR_TOKEN,b"Toevoegen")}
DEPLOY=os.environ["RIO_EXPECTED_PRODUCTION_DEPLOYMENT"]
STAGES=[
    ("login",1,12),
    ("login",10,25),
    ("login",25,50),
    ("login",50,70),
    ("login",100,110),
    ("qr",1,5),
    ("qr",5,10),
    ("qr",10,20),
    ("qr",15,25),
]
assert sum(n for _,_,n in STAGES)==327
assert sum(n for t,_,n in STAGES if t=="qr")==60
assert max(c for t,c,_ in STAGES if t=="qr")==15

def request(category, ordinal):
    path,marker=PATHS[category]
    begin=time.perf_counter()
    status=0;size=0;error="";ok=False;deployment=False
    try:
        req=urllib.request.Request(BASE+path,method="GET",headers={
           "User-Agent":"RIO-safety-audit-2026-11-03/read-only",
           "Accept":"text/html",
        })
        with urllib.request.urlopen(req,timeout=15) as response:
            status=response.status
            body=response.read(180_000)
            size=len(body)
            ok=marker in body
            deployment=DEPLOY.encode() in body
    except urllib.error.HTTPError as e:
        status=e.code;error="HTTP "+str(e.code)
    except Exception as e:
        error=type(e).__name__+": "+str(e)[:90]
    return dict(category=category,ordinal=ordinal,status=status,
      latency_ms=round(1000*(time.perf_counter()-begin),2),
      bytes=size,expected_content=ok,expected_deployment=deployment,error=error)

def perc(arr,p):
    a=sorted(arr)
    idx=(len(a)-1)*p
    lo=int(idx);hi=min(lo+1,len(a)-1)
    return round(a[lo]+(a[hi]-a[lo])*(idx-lo),1)

def main():
    for category in PATHS:
        probe=request(category,-1)
        print("PREFLIGHT "+category+" "+json.dumps(probe),flush=True)
        if probe["status"]!=200 or not probe["expected_content"] or not probe["expected_deployment"]:
            print("ABORT: unexpected production version or page; no load generated",flush=True)
            return 2
    report={"test":"public read-only bounded live","mode":"HTTP GET, from GitHub Ubuntu runner",
            "run_utc":datetime.now(timezone.utc).isoformat(),
            "limitations":"No real login, no checkout, no guest order POST; QR <=15 concurrent requests",
            "stages":[]}
    all_rows=[]
    for category,concurrency,n in STAGES:
        start=time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
            rows=list(pool.map(lambda x:request(category,x),range(n)))
        wall=time.perf_counter()-start
        all_rows+=rows
        bad=[r for r in rows if r["status"]!=200 or not r["expected_content"] or not r["expected_deployment"]]
        values=[r["latency_ms"] for r in rows]
        stage=dict(category=category,concurrency=concurrency,requests=n,
                   elapsed_sec=round(wall,2),throughput_rps=round(n/max(.001,wall),1),
                   success_pct=round(100*(n-len(bad))/n,2),errors=len(bad),
                   codes=dict(sorted(Counter(r["status"] for r in rows).items())),
                   p50_ms=perc(values,.5),p95_ms=perc(values,.95),p99_ms=perc(values,.99),
                   min_ms=min(values),max_ms=max(values),
                   error_examples=[r["error"] for r in bad[:3]])
        report["stages"].append(stage)
        print("STAGE "+json.dumps(stage,ensure_ascii=False),flush=True)
        # Abort if even one 5xx/timeout occurs on the live system.
        critical=any(r["status"]>=500 or r["status"]==0 for r in bad)
        if critical or len(bad)>=max(3,n*.04) or stage["p95_ms"]>8000:
            report["aborted"]="critical HTTP failure, error rate, or latency"
            print("SAFETY STOP: "+report["aborted"],flush=True)
            break
        time.sleep(3) # cooldown between stages
    Path("rio-live-bounded-results.json").write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf8")
    with open("rio-live-bounded-requests.csv","w",encoding="utf8",newline="") as file:
        w=csv.DictWriter(file,fieldnames=["category","ordinal","status","latency_ms","bytes",
                                          "expected_content","expected_deployment","error"])
        w.writeheader();w.writerows(all_rows)
    print("SUMMARY "+json.dumps({"stages":len(report["stages"]),"count":len(all_rows),
         "failures":sum(s["errors"] for s in report["stages"]),
         "aborted":report.get("aborted",False)}),flush=True)
    return int(bool(report.get("aborted")))

if __name__=="__main__":
    sys.exit(main())
