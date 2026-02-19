import os
from typing import Optional

from google import genai

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


class GeminiError(RuntimeError):
    """Raised when Gemini SDK call fails."""
    pass


def call_gemini(prompt: str, api_key: Optional[str] = None) -> str:
    """
    Calls Gemini using google-genai SDK and returns generated text.
    Reads API key from GEMINI_API_KEY if not provided.
    """

    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise GeminiError("GEMINI_API_KEY not set (check backend/.env)")

    try:
        client = genai.Client(api_key=key)

        # Text generation (sync)
        resp = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )

        text = getattr(resp, "text", None)
        if not text:
            raise GeminiError("Gemini returned empty resp.text")

        return text.strip()

    except Exception as e:
        raise GeminiError(f"Gemini SDK error: {e}") from e
