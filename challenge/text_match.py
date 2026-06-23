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
    budget = max(8, limit - len(ellipsis))
    cut = text[:budget]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    # Avoid trailing partial tokens (e.g. 'evolvin…' instead of 'evolving…')
    if len(cut) < len(text) and cut and cut[-1].isalnum() and text[len(cut) : len(cut) + 1].isalnum():
        sp = cut.rfind(" ")
        if sp > 0:
            cut = cut[:sp]
    cut = cut.rstrip(".,;:")
    return cut + ellipsis if cut else ellipsis


def align_to_word_start(text: str, pos: int) -> int:
    """Move forward to the next word boundary when pos lands inside a token."""
    if pos <= 0 or pos >= len(text):
        return max(0, pos)
    if not text[pos - 1].isalnum() or not text[pos].isalnum():
        return pos
    ws = text.find(" ", pos)
    return pos if ws == -1 else min(ws + 1, len(text))


def align_to_word_end(text: str, pos: int) -> int:
    """Move backward to the previous word boundary when pos lands inside a token."""
    if pos <= 0:
        return 0
    if pos >= len(text):
        return len(text)
    if not text[pos - 1].isalnum() or not text[pos].isalnum():
        return pos
    sp = text.rfind(" ", 0, pos)
    return sp if sp >= 0 else 0


_COMPLETE_SUFFIX = re.compile(
    r"(?:ing|tion|ment|ness|ally|ious|able|ive|ers?|ed|ly|ds|ms|cs|us|um|es|or|al|ic|on|s)$",
    re.I,
)
# Known mid-word cuts from career-description slicing (not complete English tokens).
_PARTIAL_BEFORE_ELLIPSIS = re.compile(
    r"(?<![a-z])(?:evolvin|consum|embeddin|recommen|implementin|developin|optimizin|"
    r"generatin|calibratin|storin|engineerin|integratin|migratin|evaluatin|deployin|"
    r"combin|convers|churn)(?=…)",
    re.I,
)


def has_trailing_partial_word_ellipsis(text: str) -> bool:
    return bool(_PARTIAL_BEFORE_ELLIPSIS.search(text))


def strip_trailing_partial_token(chunk: str) -> str:
    """Drop a trailing incomplete token before a terminal ellipsis."""
    if not chunk.endswith("…"):
        return chunk
    body = chunk[:-1].rstrip()
    if not body or not body[-1].isalnum():
        return chunk
    prefix = "…" if chunk.startswith("…") else ""
    core = body[1:] if prefix else body
    words = core.split()
    if not words:
        return chunk
    last = words[-1]
    if not last[-1].isalnum():
        return chunk
    # Complete English-ish tokens usually end with common suffixes; mid-word cuts do not.
    if _COMPLETE_SUFFIX.search(last):
        return chunk
    trimmed = " ".join(words[:-1]).strip()
    if prefix:
        return f"…{trimmed}…" if trimmed else "…"
    return f"{trimmed}…" if trimmed else "…"


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