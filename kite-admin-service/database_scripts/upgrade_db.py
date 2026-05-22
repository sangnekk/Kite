import subprocess
import sys


ALEMBIC_COMMAND = [sys.executable, "-m", "alembic"]

def create_and_upgrade():
    message = input("📦 Enter Alembic commit message: ").strip()
    if not message:
        print("❌ Commit message cannot be empty.")
        return

    # Step 1: Create the migration
    try:
        print("\n📜 Creating Alembic revision...")
        result = subprocess.run(
            [*ALEMBIC_COMMAND, "revision", "--autogenerate", "-m", message],
            check=True,
            capture_output=True,
            text=True,
        )
        print("✅ Revision created successfully.")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print("❌ Failed to create Alembic revision:")
        print(e.stderr)
        return

    # Step 2: Upgrade the database
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
    create_and_upgrade()