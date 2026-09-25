ALLOWED_EMAIL_DOMAIN = "@acharya.ac.in"


def validate_acharya_email(value: str) -> str:
    email = str(value).strip().lower()
    if email.count("@") != 1 or not email.endswith(ALLOWED_EMAIL_DOMAIN):
        raise ValueError("Use your official Acharya email address ending with @acharya.ac.in.")
    return email
