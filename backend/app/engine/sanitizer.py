"""Secret scrubbing and sensitive information sanitization utility."""

from __future__ import annotations

import re

# Compiled regular expressions for common sensitive credentials
SECRET_PATTERNS = [
    # Generic API Key/Token assignments (e.g. api_key="...", token='...')
    re.compile(r"""(?i)(api[_-]?key|access[_-]?token|auth[_-]?token|secret[_-]?key|password|passwd|pwd)\s*[:=]\s*['"]?([a-zA-Z0-9_\-\.]{8,})['"]?"""),
    # Bearer tokens
    re.compile(r"""(?i)\bBearer\s+([a-zA-Z0-9_\-\.]{15,})\b"""),
    # AWS Access Key IDs
    re.compile(r"""\b(AKIA[0-9A-Z]{16})\b"""),
    # GitHub Tokens
    re.compile(r"""\b(gh[pousr]_[a-zA-Z0-9]{36,})\b"""),
    # OpenAI/Anthropic/Gemini standard keys
    re.compile(r"""\b(sk-[a-zA-Z0-9]{20,})\b"""),
    # Private Key blocks
    re.compile(r"""-----BEGIN\s+[A-Z\s]+PRIVATE\s+KEY-----[\s\S]*?-----END\s+[A-Z\s]+PRIVATE\s+KEY-----"""),
    # Database connection strings with passwords (e.g. postgresql://user:pass@host/db)
    re.compile(r"""(?i)(postgres(?:ql)?|mysql|mongodb|redis)://([^:]+):([^@]+)@"""),
]


def sanitize_text(text: str) -> str:
    """Scrub sensitive credentials, passwords, and private keys from text.
    
    Replaces identified secrets with [REDACTED_SECRET].
    """
    if not text:
        return text

    sanitized = text

    # Database URLs: preserve protocol, host, and user, mask password
    sanitized = SECRET_PATTERNS[6].sub(r"\1://\2:[REDACTED_SECRET]@", sanitized)

    # Private key blocks
    sanitized = SECRET_PATTERNS[5].sub("[REDACTED_PRIVATE_KEY_BLOCK]", sanitized)

    # API keys and token assignments
    sanitized = SECRET_PATTERNS[0].sub(r"\1=[REDACTED_SECRET]", sanitized)

    # Bearer tokens
    sanitized = SECRET_PATTERNS[1].sub("Bearer [REDACTED_SECRET]", sanitized)

    # Specific credential formats
    sanitized = SECRET_PATTERNS[2].sub("[REDACTED_AWS_KEY]", sanitized)
    sanitized = SECRET_PATTERNS[3].sub("[REDACTED_GITHUB_TOKEN]", sanitized)
    sanitized = SECRET_PATTERNS[4].sub("[REDACTED_API_KEY]", sanitized)

    return sanitized
