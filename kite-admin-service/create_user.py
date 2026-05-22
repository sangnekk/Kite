import argparse
import json
import os
from getpass import getpass

from argon2 import PasswordHasher

USERS_FILE = "users.json"
ROLES = ("admins", "staffs")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update a user in users.json")
    parser.add_argument("username")
    parser.add_argument("role", choices=["admin", "staff"])
    parser.add_argument("--password", help="Password (prompted if omitted)")
    args = parser.parse_args()

    password = args.password or getpass("Password: ")
    if not password:
        raise SystemExit("Password must not be empty")

    hash_password = PasswordHasher().hash(password)

    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"admins": [], "staffs": []}

    for key in ROLES:
        data.setdefault(key, [])

    target_key = "admins" if args.role == "admin" else "staffs"

    for key in ROLES:
        data[key] = [u for u in data[key] if u.get("username") != args.username]

    data[target_key].append({
        "username": args.username,
        "hash_password": hash_password,
    })

    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Saved {args.role} '{args.username}' to {USERS_FILE}")


if __name__ == "__main__":
    main()
