import io
from unittest.mock import patch

from PIL import Image

from backend.app.services.id_card_service import get_photo_bytes_for_pdf


def test_get_photo_bytes_for_pdf_accepts_data_url():
    image = Image.new("RGB", (40, 40), color="red")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    data_url = "data:image/png;base64," + __import__("base64").b64encode(buf.getvalue()).decode("ascii")

    payload = get_photo_bytes_for_pdf(data_url)

    assert payload is not None
    assert len(payload) > 0


def test_get_photo_bytes_for_pdf_accepts_http_url():
    image = Image.new("RGB", (40, 40), color="blue")
    buf = io.BytesIO()
    image.save(buf, format="PNG")

    class FakeResponse:
        def __init__(self, payload):
            self.payload = payload
        def read(self):
            return self.payload
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc, tb):
            return False

    with patch("backend.app.services.id_card_service.urlopen") as mock_urlopen:
        mock_urlopen.return_value = FakeResponse(buf.getvalue())
        payload = get_photo_bytes_for_pdf("https://example.com/photo.png")

    assert payload is not None
    assert len(payload) > 0
