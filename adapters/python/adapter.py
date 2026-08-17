#!/usr/bin/env python3
"""
Rosetta reference adapter: Python.

Implements the stdin/stdout JSON contract documented in
docs/ADAPTER_CONTRACT.md. Reads a single JSON request object from stdin,
writes a single JSON response object to stdout, and exits 0 even when the
request itself is invalid (invalid input is reported via the `error`
field, not a crash/non-zero exit).

Supported operation: "convert" - converts an identifier between
snake_case, camelCase, PascalCase and kebab-case.
"""

from __future__ import annotations

import json
import re
import sys
from typing import Any

VALID_STYLES = frozenset({"snake", "camel", "pascal", "kebab"})


def tokenize(identifier: str) -> list[str]:
    identifier = identifier.strip()

    if "_" in identifier:
        parts = identifier.split("_")
    elif "-" in identifier:
        parts = identifier.split("-")
    else:
        spaced = re.sub(r"(?<!^)([A-Z])", r" \1", identifier)
        parts = spaced.split(" ")

    tokens: list[str] = []
    for part in parts:
        if part:
            tokens.append(part.lower())
    return tokens


def join_tokens(tokens: list[str], style: str) -> str:
    if style == "snake":
        return "_".join(tokens)
    if style == "kebab":
        return "-".join(tokens)
    if style == "camel":
        result = []
        for i, token in enumerate(tokens):
            if i == 0:
                result.append(token)
            else:
                result.append(token.capitalize())
        return "".join(result)
    if style == "pascal":
        return "".join(token.capitalize() for token in tokens)
    raise ValueError(f"Unknown case style: {style}")


def handle(request: dict[str, Any]) -> dict[str, Any]:
    operation = request.get("operation")
    if operation != "convert":
        op_label = "null" if operation is None else str(operation)
        raise ValueError(f"Unsupported operation: {op_label}")

    input_val = request.get("input")
    if not isinstance(input_val, str) or input_val == "":
        raise ValueError("Input must be a non-empty string.")

    options = request.get("options") or {}
    if not isinstance(options, dict):
        options = {}

    to = options.get("to")
    from_ = options.get("from")

    if not to:
        for style in ("camel", "kebab", "pascal", "snake"):
            if options.get(style):
                to = style
                break

    if to not in VALID_STYLES:
        to_label = "null" if to is None else str(to)
        raise ValueError(f"Unsupported target case: {to_label}")

    if from_ is not None and from_ not in VALID_STYLES:
        raise ValueError(f"Unsupported source case: {from_}")

    tokens = tokenize(input_val)
    if not tokens:
        raise ValueError("Could not tokenize input.")

    return {"output": join_tokens(tokens, to), "error": None}

def main() -> None:
    raw = sys.stdin.read()
    response: dict[str, Any] = {"output": None, "error": None}

    try:
        request = json.loads(raw)
        if not isinstance(request, dict):
            raise TypeError("Request payload must be a JSON object.")
        response = handle(request)
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        response = {"output": None, "error": str(e)}

    sys.stdout.write(json.dumps(response) + "\n")


if __name__ == "__main__":
    main()