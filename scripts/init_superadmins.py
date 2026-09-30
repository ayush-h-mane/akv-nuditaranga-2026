import sys
import os
import datetime

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import SessionLocal
from backend.app.models import User, Admin
from backend.app.auth_deps import get_password_hash

db = SessionLocal()

superadmins_def = [
    {
        'username': 'akvsadayt',
        'name': 'Ayush H Mane',
        'password': 'akvsa@ayush',
        'email': 'ayushhmane@gmail.com',
        'auid': 'ADM-AYUSH',
        'phone': '9535174767',
        'dept': 'Artificial Intelligence and Machine Learning',
        'setup_required': False,
        'user_id': 23
    },
    {
        'username': 'akvsapriya',
        'name': 'Priyanka S Reddy',
        'password': 'akvsa@priya',
        'email': 'priyankas.23.beee@acharya.ac.in',
        'auid': '1AY23EE045',
        'phone': '9513093026',
        'dept': 'Electrical and Electronics Engineering',
        'setup_required': False,
        'user_id': None
    },
    {
        'username': 'akvsaarjun',
        'name': 'Arjun V',
        'password': 'akvsa@arjun',
        'email': 'pending.arjun@acharya.ac.in',
        'auid': 'PENDING-ARJUNV',
        'phone': '',
        'dept': 'Department of Kannada Vedike',
        'setup_required': True,
        'user_id': None
    },
    {
        'username': 'akvsaculturals',
        'name': 'Culturals',
        'password': 'akvsa@culturals',
        'email': 'culturals.akv@acharya.ac.in',
        'auid': 'SA-CULTURALS',
        'phone': '0000000000',
        'dept': 'Culturals',
        'setup_required': False,
        'user_id': None
    },
    {
        'username': 'akvsatejas',
        'name': 'Mr. Tejas K',
        'password': 'akvsa@tejas',
        'email': 'pending.tejas@acharya.ac.in',
        'auid': 'PENDING-TEJAS',
        'phone': '9449890035',
        'dept': 'Department of Student Activities',
        'setup_required': True,
        'user_id': None
    },
    {
        'username': 'akvsarakshi',
        'name': 'Mrs. Rakshitha B. T',
        'password': 'akvsa@rakshi',
        'email': 'pending.rakshitha@acharya.ac.in',
        'auid': 'PENDING-RAKSHI',
        'phone': '9945671394',
        'dept': 'Department of Computer Science & Engineering',
        'setup_required': True,
        'user_id': None
    }
]

for sa in superadmins_def:
    uname = sa['username']
    adm = db.query(Admin).filter(Admin.username == uname).first()
    usr = None
    if sa['user_id']:
        usr = db.query(User).filter(User.id == sa['user_id']).first()
    if not usr and adm:
        usr = adm.user
    if not usr:
        usr = db.query(User).filter(User.email == sa['email']).first()
    if not usr:
        usr = db.query(User).filter(User.auid == sa['auid']).first()
        
    if not usr:
        usr = User(
            name=sa['name'],
            auid=sa['auid'],
            email=sa['email'],
            phone=sa['phone'],
            institute='Acharya Institute of Technology',
            department=sa['dept'],
            semester=8,
            section='A',
            gender='Other',
            role='SUPERADMIN',
            registration_id=f"AKV-SA-{uname.upper()}",
            password_hash=get_password_hash(sa['password']),
            account_status='ACTIVE',
            first_time_setup_required=sa['setup_required']
        )
        db.add(usr)
        db.commit()
        db.refresh(usr)
    else:
        usr.name = sa['name']
        usr.role = 'SUPERADMIN'
        usr.account_status = 'ACTIVE'
        usr.password_hash = get_password_hash(sa['password'])
        usr.first_time_setup_required = sa['setup_required']
        db.commit()
        db.refresh(usr)

    if not adm:
        adm = db.query(Admin).filter(Admin.user_id == usr.id).first()
        if not adm:
            adm = Admin(
                user_id=usr.id,
                username=uname,
                admin_type='SUPERADMIN',
                approval_status='APPROVED',
                approved_by='MASTER_SUPERADMIN',
                approved_at=datetime.datetime.utcnow()
            )
            db.add(adm)
        else:
            adm.username = uname
            adm.admin_type = 'SUPERADMIN'
            adm.approval_status = 'APPROVED'
    else:
        adm.admin_type = 'SUPERADMIN'
        adm.approval_status = 'APPROVED'
        adm.user_id = usr.id
    db.commit()

print('ALL 6 SUPERADMINS CREATED/UPDATED SUCCESSFULLY:')
for sa in superadmins_def:
    adm = db.query(Admin).filter(Admin.username == sa['username']).first()
    usr = adm.user if adm else None
    print(f"{sa['username']} -> Name: {usr.name if usr else 'None'} | Email: {usr.email if usr else 'None'} | AUID: {usr.auid if usr else 'None'} | SetupReq: {usr.first_time_setup_required if usr else 'None'}")

db.close()
