"""Check migration 037 in an isolated, disposable PostgreSQL container.
Run from any directory: python kite-service/scripts/check_select_migration.py
Requires Docker and the postgres:17 image. Never connects to the app database.
"""
import pathlib
import subprocess
import time
import uuid

name = "kite-select-check-" + uuid.uuid4().hex[:12]
migrations = pathlib.Path(__file__).resolve().parents[1] / "internal/db/postgres/migrations"


def docker(*args, **kwargs):
    return subprocess.run(["docker", *args], check=True, capture_output=True, text=True, **kwargs).stdout.strip()


def sql(query):
    return docker("exec", "-i", name, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", input=query)


try:
    docker("run", "--detach", "--name", name, "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17")
    for _ in range(60):
        try:
            sql("SELECT 1;")
            break
        except subprocess.CalledProcessError:
            time.sleep(1)
    else:
        raise RuntimeError("PostgreSQL did not become ready")

    for migration in sorted(migrations.glob("*.up.sql")):
        if int(migration.name.split("_", 1)[0]) >= 37:
            continue
        sql(migration.read_text(encoding="utf-8"))

    up = (migrations / "037_select_menus.up.sql").read_text(encoding="utf-8")
    down = (migrations / "037_select_menus.down.sql").read_text(encoding="utf-8")
    columns = """SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND
        ((table_name='message_instances' AND column_name='message_data') OR
         (table_name='resume_points' AND column_name='schedule_id') OR
         (table_name='app_settings' AND column_name='log_component_interactions'));"""
    sql(up)
    assert sql(columns) == "3"
    assert sql("SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN ('resume_points_schedule_id','resume_points_expires_at');") == "2"
    assert sql("SELECT count(*) FROM information_schema.columns WHERE table_name='app_settings' AND column_name='log_component_interactions' AND is_nullable='NO' AND column_default='false';") == "1"
    sql(down)
    assert sql(columns) == "0"
    sql(up)
    assert sql(columns) == "3"
    print("Migration 001–036 + 037 up/down/up passed (isolated PostgreSQL 17)")
finally:
    subprocess.run(["docker", "rm", "--force", name], check=False, capture_output=True)
