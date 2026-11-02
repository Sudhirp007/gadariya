import os

def main():
    path = ".env.local"
    if not os.path.exists(path):
        print("NO .env.local")
        return
    keys = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip() or line.strip().startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip(); v = v.strip()
            keys.append(k)
            if any(s in k.upper() for s in ["ENC", "MASTER", "KEY", "SECRET", "SUPABASE"]):
                masked = "EMPTY" if not v else (f"LEN={len(v)} PREFIX={v[:8]}...")
                print(f"{k} => {masked}")
    print("--- ALL KEYS ---")
    print("\n".join(sorted(keys)))

if __name__ == "__main__":
    main()
