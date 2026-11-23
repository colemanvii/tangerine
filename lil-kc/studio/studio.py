#!/usr/bin/env python3
"""Lil KC studio — private, local-first animation workspace.

    python3 lil-kc/studio/studio.py            # http://127.0.0.1:8612/studio/
    python3 lil-kc/studio/studio.py --port 9000

Binds to 127.0.0.1 only. Serves the lil-kc/ folder (never the public website)
and a tiny JSON API over the private projects in lil-kc/private/projects/,
which is git-ignored because this repository is public.

API
  GET  /api/projects                         list projects
  GET  /api/project/<id>                     project.json + verified reference hashes
  PUT  /api/project/<id>/revision/<rid>      save exposures of an editable revision
  POST /api/project/<id>/revision            save a new revision (copy with new timing)
  POST /api/project/<id>/approval            append a decision to the approval log
  POST /api/project/<id>/export              {revision, formats[], bg, scale} -> files
"""
import hashlib, http.server, json, os, re, sys, datetime, threading, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
import kc_export  # noqa: E402

ROOT = kc_export.LIL_KC_ROOT
PROJECTS = os.path.join(ROOT, "private", "projects")
LOCK = threading.Lock()
EDITABLE = {"draft", "for review", "needs changes"}


def project_dir(pid):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", pid):
        raise ValueError("bad project id")
    d = os.path.join(PROJECTS, pid)
    if not os.path.isfile(os.path.join(d, "project.json")):
        raise FileNotFoundError(pid)
    return d


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def save(d, proj):
    tmp = os.path.join(d, "project.json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(proj, f, indent=1, ensure_ascii=False)
    os.replace(tmp, os.path.join(d, "project.json"))


def now():
    return datetime.datetime.now().isoformat(timespec="seconds")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        if "/api/" in str(args[0] if args else "") or (args and str(args[0]).isdigit() and int(str(args[0])) >= 400):
            sys.stderr.write("%s\n" % (fmt % args))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def route(self, method):
        path = urllib.parse.urlparse(self.path).path
        parts = [p for p in path.split("/") if p]
        try:
            if parts[:2] == ["api", "projects"] and method == "GET":
                out = []
                for pid in sorted(os.listdir(PROJECTS)) if os.path.isdir(PROJECTS) else []:
                    try:
                        p = kc_export.load_project(project_dir(pid))
                        out.append({"id": p["id"], "title": p["title"], "subtitle": p.get("subtitle")})
                    except Exception:
                        pass
                return self.send_json(out)
            if parts[:2] != ["api", "project"] or len(parts) < 3:
                return self.send_json({"error": "not found"}, 404)
            d = project_dir(parts[2])
            with LOCK:
                proj = kc_export.load_project(d)
                if method == "GET" and len(parts) == 3:
                    for r in proj["model"]["refs"]:
                        f = os.path.join(ROOT, r["file"])
                        r["verified"] = os.path.isfile(f) and sha256(f) == r["sha256"]
                    proj["_server"] = True
                    return self.send_json(proj)
                if method == "PUT" and parts[3:4] == ["revision"] and len(parts) == 5:
                    rev = next(r for r in proj["revisions"] if r["id"] == parts[4])
                    if rev.get("status") not in EDITABLE:
                        return self.send_json({"error": f"revision is '{rev.get('status')}' and locked; save a new revision"}, 409)
                    xs = self.body()["exposures"]
                    if len(xs) != len(rev["drawings"]) or not all(isinstance(x, int) and 1 <= x <= 96 for x in xs):
                        return self.send_json({"error": "exposures must be integers 1–96, one per drawing"}, 400)
                    for dr, x in zip(rev["drawings"], xs):
                        dr["x"] = x
                    rev["modified"] = now()
                    save(d, proj)
                    return self.send_json(rev)
                if method == "POST" and parts[3:4] == ["revision"]:
                    b = self.body()
                    src = next(r for r in proj["revisions"] if r["id"] == b["from"])
                    ids = {r["id"] for r in proj["revisions"]}
                    base = re.sub(r"[^a-z0-9-]+", "-", (b.get("id") or src["id"] + "-v").lower()).strip("-")
                    nid, k = base, 2
                    while nid in ids:
                        nid, k = f"{base}{k}", k + 1
                    xs = b.get("exposures") or [dr.get("x", 1) for dr in src["drawings"]]
                    new = json.loads(json.dumps(src))
                    new.update(id=nid, title=b.get("title") or src["title"] + " (copy)", status="draft",
                               created=now(), derived_from=src["id"], notes=b.get("notes", ""))
                    new.pop("modified", None)
                    for dr, x in zip(new["drawings"], xs):
                        dr["x"] = int(x)
                    proj["revisions"].append(new)
                    save(d, proj)
                    return self.send_json(new)
                if method == "POST" and parts[3:4] == ["approval"]:
                    b = self.body()
                    if b.get("decision") not in ("approved", "needs changes", "comment"):
                        return self.send_json({"error": "decision must be approved | needs changes | comment"}, 400)
                    entry = {"at": now(), "target": str(b.get("target", ""))[:80], "decision": b["decision"],
                             "note": str(b.get("note", ""))[:2000], "by": "creative director (local studio)"}
                    proj.setdefault("approvals", []).append(entry)
                    m = re.fullmatch(r"revision:(.+)", entry["target"])
                    if m and b["decision"] != "comment":
                        for r in proj["revisions"]:
                            if r["id"] == m.group(1) and r.get("kind") != "archive":
                                r["status"] = b["decision"]
                    save(d, proj)
                    return self.send_json(entry)
            if method == "POST" and parts[3:4] == ["export"]:
                b = self.body()
                fm = [f for f in b.get("formats", []) if f in ("mp4", "gif", "png", "webm")]
                if not fm:
                    return self.send_json({"error": "choose at least one format"}, 400)
                res = kc_export.export(d, b["revision"], fm, bg=b.get("bg", "paper"),
                                       scale=max(0.1, min(1.0, float(b.get("scale", 1.0)))))
                return self.send_json(res)
            return self.send_json({"error": "not found"}, 404)
        except StopIteration:
            return self.send_json({"error": "revision not found"}, 404)
        except FileNotFoundError as e:
            return self.send_json({"error": f"not found: {e}"}, 404)
        except Exception as e:  # surfaced in the UI
            return self.send_json({"error": f"{type(e).__name__}: {e}"}, 500)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self.route("GET")
        if self.path in ("/", ""):
            self.send_response(302)
            self.send_header("Location", "/studio/")
            return self.end_headers()
        return super().do_GET()

    def do_PUT(self):
        return self.route("PUT")

    def do_POST(self):
        return self.route("POST")


def main():
    port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8612
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Lil KC studio — http://127.0.0.1:{port}/studio/   (private, local only; Ctrl-C to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
