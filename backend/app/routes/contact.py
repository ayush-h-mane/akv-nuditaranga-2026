from html import escape

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator

from ..services.email_service import send_email, wrap_email_html

router = APIRouter(prefix="/contact", tags=["Contact"])
CONTACT_INBOX = "akv@acharya.ac.in"


class ContactMessageRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(..., min_length=3, max_length=160)
    message: str = Field(..., min_length=5, max_length=5000)

    @field_validator("name", "subject", "message")
    @classmethod
    def strip_and_reject_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("subject")
    @classmethod
    def subject_is_single_line(cls, value: str) -> str:
        if "\n" in value or "\r" in value:
            raise ValueError("Subject must be a single line.")
        return value


@router.post("/message")
def send_contact_message(payload: ContactMessageRequest):
    name = escape(payload.name)
    sender_email = str(payload.email)
    subject = escape(payload.subject)
    message = escape(payload.message).replace("\n", "<br>")
    html_body = wrap_email_html(
        "Website contact message",
        f"""
        <h2 style="margin-top:0">Website contact message</h2>
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Email:</strong> {escape(sender_email)}</p>
        <p><strong>Subject:</strong> {subject}</p>
        <div><strong>Message:</strong><p>{message}</p></div>
        """,
    )
    text_body = (
        f"Website contact message\n\nName: {payload.name}\n"
        f"Email: {sender_email}\nSubject: {payload.subject}\n\n{payload.message}"
    )

    if not send_email(
        to_email=CONTACT_INBOX,
        subject=f"Website contact: {payload.subject}",
        html_content=html_body,
        text_content=text_body,
        reply_to=sender_email,
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We could not send your message right now. Please try again later or email akv@acharya.ac.in directly.",
        )

    return {"success": True, "message": "Your message has been sent to the Acharya Kannada Vedike team."}
