import subprocess

def run_psql(db, sql):
    cmd = ['docker', 'exec', '-i', '-e', 'PGCLIENTENCODING=UTF8', 'sih26043-pg', 'psql', '-U', 'sih', '-d', db]
    res = subprocess.run(cmd, input=f"SET client_encoding = 'UTF8';\n{sql}".encode('utf-8'), capture_output=True)
    return res.stdout.decode('utf-8', errors='replace')

# 1. Get all published problems from sih_portal
out = run_psql('sih_portal', 'SELECT problem_id, title FROM published_problem;')
problems = []
for line in out.splitlines():
    parts = [p.strip() for p in line.split('|')]
    if len(parts) >= 2 and len(parts[0]) == 36:
        problems.append((parts[0], parts[1]))

print(f'Found {len(problems)} problems in sih_portal')

evaluator_profile_id = 'f94d67f8-33d4-400f-82b7-c50bad7fdde5'

for pid, title in problems:
    cycle_out = run_psql('sih_eval', f"SELECT cycle_id FROM evaluation_cycle WHERE problem_id = '{pid}';")
    cycle_id = None
    for line in cycle_out.splitlines():
        parts = [p.strip() for p in line.split('|')]
        if len(parts) >= 1 and len(parts[0]) == 36:
            cycle_id = parts[0]
            break
    if not cycle_id:
        print(f'Creating cycle for problem {pid} ({title})')
        ins = run_psql('sih_eval', f"INSERT INTO evaluation_cycle (problem_id, status, started_at, completed_at, final_score) VALUES ('{pid}', 'EVALUATION_COMPLETED', now() - interval '3 days', now() - interval '1 day', 88.5) RETURNING cycle_id;")
        for line in ins.splitlines():
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 1 and len(parts[0]) == 36:
                cycle_id = parts[0]
                break
    
    # Link cycle_id back into sih_portal.published_problem
    run_psql('sih_portal', f"UPDATE published_problem SET cycle_id = '{cycle_id}' WHERE problem_id = '{pid}';")
    
    # Ensure submitted assignment
    run_psql('sih_eval', f"""
        INSERT INTO evaluation_assignment (cycle_id, evaluator_profile_id, status, deadline, submitted_at)
        VALUES ('{cycle_id}', '{evaluator_profile_id}', 'SUBMITTED'::assignment_status, now() + interval '7 days', now())
        ON CONFLICT (cycle_id, evaluator_profile_id) DO UPDATE SET status = 'SUBMITTED'::assignment_status, submitted_at = now();
    """)

print('All problems now have completed cycles and submitted evaluator assignments!')
