# ai_service.py
import os, base64, json, logging
from dotenv import load_dotenv
from openai import OpenAI
from typing import Tuple

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY") or exit("OPENAI_API_KEY missing"))
logger = logging.getLogger("ai_service")
logger.setLevel(logging.INFO)

def image_to_base64(path: str) -> str:
    return base64.b64encode(open(path, "rb").read()).decode()

def _strip_code_fence(s: str) -> str:
    return s.strip("` \n")

def _parse_json(s: str) -> dict:
    s = _strip_code_fence(s)
    try:
        return json.loads(s)
    except:
        start, depth, in_str, esc = s.find("{"), 0, False, False
        for i, ch in enumerate(s[start:], start):
            if ch == '"' and not esc: in_str = not in_str
            esc = ch == "\\" and not esc
            if not in_str:
                depth += ch == "{"
                depth -= ch == "}"
                if depth == 0: return json.loads(s[start:i+1])
        return {}

def _title_from_text(text: str) -> str:
    for line in text.splitlines():
        if line.strip() and not line.strip().isdigit():
            return " ".join(line.split()[:6]).rstrip(",:;.").title()
    return "Image (no text)"

def process_image_with_ai(path: str) -> Tuple[str, str]:
    b64 = image_to_base64(path)
    sys_prompt = (
        "Extract all text from the image and create a short (3-8 words) descriptive title. "
        "Reply in JSON: {\"title\":\"...\",\"text\":\"...\"}, no 'Untitled'."
    )
    user_content = [
        {"type": "text", "text": "Return JSON with title and text."},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
    ]

    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": sys_prompt},
                      {"role": "user", "content": user_content}],
            temperature=0.0
        )
        data = _parse_json(resp.choices[0].message.content)
        title, text = (data.get("title") or "").strip(), (data.get("text") or "").strip()

        if not title or title.lower() in {"untitled", "none"}:
            resp2 = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Give only a short (3-8 words) descriptive title."},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.0, max_tokens=40
            )
            title = _strip_code_fence(resp2.choices[0].message.content.strip())

        if not title or title.lower() in {"untitled", "none"}:
            title = _title_from_text(text)

        return title or "Image (no title)", text
    except Exception as e:
        logger.exception("AI processing failed: %s", e)
        return "Image (processing failed)", ""