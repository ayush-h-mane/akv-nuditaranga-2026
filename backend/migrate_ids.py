import sqlite3

conn = sqlite3.connect('akv_fest.db')
cursor = conn.cursor()

# 1. Update event id
cursor.execute("UPDATE events SET id = 'AKV-NT-01' WHERE id = 'nud-evt-01'")
print('Updated events rows:', cursor.rowcount)

# 2. Update registrations
cursor.execute("UPDATE registrations SET registration_id = 'AKV26001', event_id = 'AKV-NT-01' WHERE registration_id = 'AKV-ND-2026-00101'")
print('Updated registrations rows:', cursor.rowcount)

# 3. Update checkin_logs
cursor.execute("UPDATE checkin_logs SET registration_id = 'AKV26001' WHERE registration_id = 'AKV-ND-2026-00101'")
print('Updated checkin_logs rows:', cursor.rowcount)

conn.commit()

print('\n--- VERIFYING RECORDS ---')
print('Events:', cursor.execute('SELECT id, title_en FROM events').fetchall())
print('Registrations:', cursor.execute('SELECT id, registration_id, event_id, full_name FROM registrations').fetchall())
print('Checkin logs:', cursor.execute('SELECT * FROM checkin_logs').fetchall())

conn.close()
