#!/usr/bin/env bash
# Live demo acceptance checklist — requires backend on :8000
set -euo pipefail

API="${API_URL:-http://127.0.0.1:8000}"
HDR=(-H "X-User-Id: dev-user" -H "Content-Type: application/json")

echo "==> Demo acceptance against $API"

python3 << PYEOF
import json
import sys
import httpx

BASE = "$API"
H = {"X-User-Id": "dev-user", "Content-Type": "application/json"}
passed = failed = 0

def check(name, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"[PASS] {name}" + (f" — {detail}" if detail else ""))
    else:
        failed += 1
        print(f"[FAIL] {name}" + (f" — {detail}" if detail else ""))

try:
    r = httpx.get(f"{BASE}/health", timeout=10)
    check("/health", r.status_code == 200 and r.json().get("status") == "ok")
except Exception as e:
    check("/health", False, str(e))
    print(f"\n{passed} passed, {failed} failed — is the backend running?")
    sys.exit(1)

r = httpx.get(f"{BASE}/ready", timeout=10)
ready = r.json()
check("/ready candidates_indexed > 0", ready.get("vector_store", {}).get("candidates_indexed", 0) > 0,
      str(ready.get("vector_store")))

r = httpx.get(f"{BASE}/api/jobs/ranking-weights", timeout=10)
w = r.json()
check("hackathon ranking weights", w.get("mode") == "hackathon_spec" and w["weights"]["semantic"] == 0.0)

r = httpx.get(f"{BASE}/api/jobs", headers=H, timeout=10)
jobs = r.json()
check("jobs seeded", len(jobs) > 0, f"{len(jobs)} jobs")
ml = next((j for j in jobs if "ML" in j.get("title", "") or "Machine" in j.get("title", "")), jobs[0])
job_id = ml["id"]

r = httpx.get(f"{BASE}/api/jobs/{job_id}/rank", headers=H, timeout=180)
check("rank endpoint", r.status_code == 200)
if r.status_code == 200:
    data = r.json()
    ranked = data.get("ranked_candidates", [])
    names = [c.get("candidate_name", "") for c in ranked]
    check("Priya Sharma in top-5", any("Priya" in n for n in names[:5]), str(names[:5]))
    weights = (data.get("pipeline_metadata") or {}).get("ranking_weights", {})
    check("PROMPT_WEIGHTS in metadata", weights.get("semantic", -1) == 0.0, str(weights))
    expl = sum(1 for c in ranked[:5] if c.get("explanation"))
    check("explanations on top-5", expl >= 3, f"{expl}/5")

r = httpx.post(f"{BASE}/api/jobs/{job_id}/chat", headers=H, json={
    "job_id": job_id,
    "message": "Why is Rahul ranked above Amit?",
    "history": [],
}, timeout=60)
check("chat comparison", r.status_code == 200 and ("rahul" in r.json().get("reply", "").lower() or "amit" in r.json().get("reply", "").lower()),
      (r.json().get("reply", "")[:100] if r.status_code == 200 else r.text[:100]))

r = httpx.post(f"{BASE}/api/jobs/{job_id}/whatif", headers=H, json={
    "job_id": job_id,
    "removed_skills": ["PyTorch"],
    "added_skills": [],
}, timeout=180)
check("what-if re-rank", r.status_code == 200)

r = httpx.post(f"{BASE}/api/search", headers=H, json={"query": "SQL strong, Power BI weak", "top_k": 10}, timeout=30)
check("NL search", r.status_code == 200 and len(r.json()) > 0, f"{len(r.json()) if r.status_code == 200 else 0} hits")

r = httpx.post(f"{BASE}/api/search", headers=H, json={"q": "ML engineer"}, timeout=10)
check("NL search rejects wrong schema", r.status_code == 422, r.text[:80])

r = httpx.get(f"{BASE}/api/jobs/{job_id}/bias", headers=H, timeout=30)
if r.status_code == 200:
    b = r.json()
    dims = ["gender_distribution", "ethnicity_distribution", "school_distribution", "location_distribution"]
    check("bias audit dimensions", all(k in b for k in dims))
else:
    check("bias audit", False, r.text[:100])

print(f"\n==> {passed} passed, {failed} failed")
sys.exit(0 if failed == 0 else 1)
PYEOF