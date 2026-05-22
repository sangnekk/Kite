import subprocess
import sys


ALEMBIC_COMMAND = [sys.executable, "-m", "alembic"]

def init_db():
    try:
        print("\n🔧 Upgrading database to latest revision...")
        result = subprocess.run(
            [*ALEMBIC_COMMAND, "upgrade", "head"],
            check=True,
            capture_output=True,
            text=True,
        )
        print("✅ Upgrade complete.")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print("❌ Failed to upgrade database:")
        print(e.stderr)

if __name__ == "__main__":
    init_db()