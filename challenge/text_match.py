"""Fast word-boundary matching — token sets for singles, regex for multi-word phrases."""

from __future__ import annotations

import re
from functools import lru_cache
from typing import FrozenSet, Iterable, Pattern, Sequence, Tuple

_WORD = r"(?<![a-z0-9])"
_WORD_END = r"(?![a-z0-9])"
_TOKEN_RE = re.compile(r"[a-z0-9]{2,}")


def norm_text(s: str) -> str:
    if not s:
        return ""
    s = s.lower().strip()
    if "  " not in s and "\n" not in s and "\t" not in s:
        return s
    return re.sub(r"\s+", " ", s)


def norm_skill(name: str) -> str:
    n = norm_text(name)
    return re.sub(r"[-_/]+", " ", n)


def truncate_at_word_boundary(text: str, limit: int, ellipsis: str = "…") -> str:
    """Truncate without mid-word cuts (Stage-4 reasoning quality)."""
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    elif limit < len(text):
        cut = text[: max(1, limit - len(ellipsis))]
    return cut + ellipsis


def align_to_word_start(text: str, pos: int) -> int:
    """Move forward to the next word boundary when pos lands inside a token."""
    if pos <= 0 or pos >= len(text):
        return max(0, pos)
    if not text[pos - 1].isalnum() or not text[pos].isalnum():
        return pos
    ws = text.find(" ", pos)
    return pos if ws == -1 else min(ws + 1, len(text))


def clean_leading_ellipsis_fragment(text: str) -> str:
    """Remove orphan prefix tokens after '…' (e.g. '…and shipped' → '…shipped')."""
    if not text.startswith("…"):
        return text
    rest = text[1:].lstrip()
    parts = rest.split(None, 1)
    if len(parts) == 2 and len(parts[0]) <= 3 and parts[0].isalpha():
        return "…" + parts[1]
    return text


def tokenize(text: str) -> FrozenSet[str]:
    return frozenset(_TOKEN_RE.findall(norm_text(text)))


def split_phrases(phrases: Sequence[str]) -> Tuple[FrozenSet[str], Tuple[str, ...]]:
    singles: set[str] = set()
    multi: list[str] = []
    for p in phrases:
        if " " in p.strip():
            multi.append(p)
        else:
            singles.add(p.strip().lower())
    return frozenset(singles), tuple(multi)


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
    p = norm_text(phrase)
    if " " not in p:
        return p in tokenize(text)
    return bool(_phrase_pattern(phrase).search(norm_text(text)))


def phrase_in_tokens(phrase: str, tokens: FrozenSet[str], text: str) -> bool:
    if not phrase:
        return False
    if " " not in phrase:
        return phrase in tokens
    return bool(_phrase_pattern(phrase).search(text))


def compile_multi_patterns(multi: Tuple[str, ...]) -> Tuple[Pattern[str], ...]:
    return tuple(_phrase_pattern(m) for m in multi)


def count_phrases_fast(
    singles: FrozenSet[str],
    multi: Tuple[str, ...],
    tokens: FrozenSet[str],
    blob: str,
    multi_patterns: Tuple[Pattern[str], ...] | None = None,
) -> int:
    hits = sum(1 for s in singles if s in tokens)
    patterns = multi_patterns if multi_patterns is not None else compile_multi_patterns(multi)
    hits += sum(1 for pat in patterns if pat.search(blob))
    return hits


def count_phrases(phrases: Iterable[str], text: str) -> int:
    singles, multi = split_phrases(tuple(phrases))
    blob = norm_text(text)
    return count_phrases_fast(singles, multi, tokenize(blob), blob)