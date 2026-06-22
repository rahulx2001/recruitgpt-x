"""Word-boundary text matching — avoids substring traps (map/roadmap, search/research)."""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Iterable, Pattern

_WORD = r"(?<![a-z0-9])"
_WORD_END = r"(?![a-z0-9])"


def norm_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower().strip())


def norm_skill(name: str) -> str:
    n = norm_text(name)
    return re.sub(r"[-_/]+", " ", n)


@lru_cache(maxsize=512)
def _phrase_pattern(phrase: str) -> Pattern[str]:
    p = norm_text(phrase)
    if " " in p:
        body = re.escape(p).replace(r"\ ", r"\s+")
    else:
        body = re.escape(p)
    return re.compile(_WORD + body + _WORD_END, re.IGNORECASE)


def phrase_in_text(phrase: str, text: str) -> bool:
    if not phrase or not text:
        return False
    return bool(_phrase_pattern(phrase).search(norm_text(text)))


def any_phrase_in_text(phrases: Iterable[str], text: str) -> bool:
    return any(phrase_in_text(p, text) for p in phrases)


def count_phrases(phrases: Iterable[str], text: str) -> int:
    return sum(1 for p in phrases if phrase_in_text(p, text))