import os, glob

targets = [
    "test-results/02-privacy-invariants-Priv-0dfb0-ted-by-a-protected-endpoint/error-context.md",
    "test-results/01-public-pages-Public-pag-69a2d-le-errors-renders-discovery/error-context.md",
]
for t in targets:
    if os.path.exists(t):
        print("=" * 70)
        print(t)
        print("=" * 70)
        with open(t, "r", encoding="utf-8", errors="replace") as f:
            print(f.read()[:3000])
    else:
        print("MISSING:", t)
