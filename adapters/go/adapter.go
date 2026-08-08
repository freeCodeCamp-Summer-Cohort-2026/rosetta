// Rosetta reference adapter: Go.
//
// Implements the stdin/stdout JSON contract documented in
// docs/ADAPTER_CONTRACT.md. Reads a single JSON request object from stdin,
// writes a single JSON response object to stdout, and exits 0 even when the
// request itself is invalid (invalid input is reported via the "error"
// field, not a crash/non-zero exit).
//
// Supported operation: "convert" - converts an identifier between
// snake_case, camelCase, PascalCase and kebab-case.
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"unicode"
)

// The RequestOptions passed in from the primary nodejs converter code.
// To or one of the four "direct-to" types are required
type RequestOptions struct {
	To     string `json:"to"`
	From   string `json:"from"`
	Pascal bool   `json:"pascal"`
	Kebab  bool   `json:"kebab"`
	Snake  bool   `json:"snake"`
	Camel  bool   `json:"camel"`
}

type request struct {
	Operation string         `json:"operation"`
	Input     string         `json:"input"`
	Options   RequestOptions `json:"options"`
}

type response struct {
	Output *string `json:"output"`
	Error  *string `json:"error"`
}

var validStyles = map[string]bool{
	"snake": true, "camel": true, "pascal": true, "kebab": true,
}

// Calculates the to format from either the direct "to" option value or
// from the direct to values. If an invalid state is passed, then
// the first value will return an empty string, and the second an error
func getToFormat(o RequestOptions) (string, error) {
	to := o.To

	// direct cases
	pascal, camel, snake, kebab := o.Pascal, o.Camel, o.Snake, o.Kebab

	// TODO: move to exclusive "or", or throw if multiple set.
	// meantime, just use the first one in alphabetical order
	if camel {
		return "camel", nil
	}
	if kebab {
		return "kebab", nil
	}
	if pascal {
		return "pascal", nil
	}
	if snake {
		return "snake", nil
	}

	if styleForToOption := validStyles[to]; !styleForToOption {
		// if invalid "to" format is given return unsupported target case
		label := to
		if label == "" {
			label = "null"
		}
		return "", fmt.Errorf("Unsupported target case: %s", label)
	}

	return to, nil
}

// tokenize breaks an identifier into lowercase word tokens, regardless of
// its original case style.
func tokenize(identifier string) []string {
	identifier = strings.TrimSpace(identifier)

	var parts []string
	switch {
	case strings.Contains(identifier, "_"):
		parts = strings.Split(identifier, "_")
	case strings.Contains(identifier, "-"):
		parts = strings.Split(identifier, "-")
	default:
		// camelCase / PascalCase: insert a space before every interior
		// capital letter, then split on whitespace.
		var b strings.Builder
		for i, r := range identifier {
			if i > 0 && unicode.IsUpper(r) {
				b.WriteRune(' ')
			}
			b.WriteRune(r)
		}
		parts = strings.Split(b.String(), " ")
	}

	tokens := make([]string, 0, len(parts))
	for _, p := range parts {
		if p != "" {
			tokens = append(tokens, strings.ToLower(p))
		}
	}
	return tokens
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	r := []rune(s)
	r[0] = unicode.ToUpper(r[0])
	return string(r)
}

func joinTokens(tokens []string, style string) (string, error) {
	switch style {
	case "snake":
		return strings.Join(tokens, "_"), nil
	case "kebab":
		return strings.Join(tokens, "-"), nil
	case "camel":
		var b strings.Builder
		for i, t := range tokens {
			if i == 0 {
				b.WriteString(t)
			} else {
				b.WriteString(capitalize(t))
			}
		}
		return b.String(), nil
	case "pascal":
		var b strings.Builder
		for _, t := range tokens {
			b.WriteString(capitalize(t))
		}
		return b.String(), nil
	default:
		return "", fmt.Errorf("unknown case style: %s", style)
	}
}

func errorResponse(msg string) response {
	return response{Output: nil, Error: &msg}
}

func handle(req request) response {
	if req.Operation != "convert" {
		op := req.Operation
		if op == "" {
			op = "null"
		}
		return errorResponse(fmt.Sprintf("unsupported operation: %s", op))
	}
	if req.Input == "" {
		return errorResponse("input must be a non-empty string")
	}

	options := req.Options

	to, toErr := getToFormat(req.Options)
	if toErr != nil {
		return errorResponse(toErr.Error())
	}

	from := options.From

	if from != "" && !validStyles[from] {
		return errorResponse(fmt.Sprintf("unsupported source case: %s", from))
	}

	tokens := tokenize(req.Input)
	if len(tokens) == 0 {
		return errorResponse("could not tokenize input")
	}

	output, err := joinTokens(tokens, to)
	if err != nil {
		return errorResponse(err.Error())
	}
	return response{Output: &output, Error: nil}
}

func main() {
	raw, err := io.ReadAll(os.Stdin)

	var resp response
	if err != nil {
		resp = errorResponse(fmt.Sprintf("failed to read stdin: %v", err))
	} else {
		var req request
		if err := json.Unmarshal(raw, &req); err != nil {
			resp = errorResponse(fmt.Sprintf("invalid JSON payload: %v", err))
		} else {
			resp = handle(req)
		}
	}

	out, marshalErr := json.Marshal(resp)
	if marshalErr != nil {
		// Should be unreachable given the response shape, but keep the
		// contract intact even in that case.
		fmt.Fprintln(os.Stdout, `{"output":null,"error":"failed to marshal response"}`)
		return
	}
	fmt.Fprintln(os.Stdout, string(out))
}
