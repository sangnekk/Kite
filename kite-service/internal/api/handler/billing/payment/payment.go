package payment

import (
	"strconv"
	"strings"
)

const invoicePrefix = "KITE"

// EncodeInvoiceNumber builds the bank transfer memo / payment id from a
// monotonic sequence number, e.g. 42 -> "KITE42".
//
// The code is intentionally just the ASCII prefix followed by decimal digits so
// banks cannot corrupt it: unlike the previous base64url scheme, digits survive
// uppercasing, special-character stripping, and (because the code is short)
// length truncation in the transfer memo.
func EncodeInvoiceNumber(seq int64) string {
	return invoicePrefix + strconv.FormatInt(seq, 10)
}

// DecodeInvoiceNumber parses the sequence number out of an invoice number such
// as "KITE42". It is case-insensitive on the prefix.
func DecodeInvoiceNumber(invoiceNumber string) (int64, bool) {
	if !strings.HasPrefix(strings.ToUpper(invoiceNumber), invoicePrefix) {
		return 0, false
	}

	digits := invoiceNumber[len(invoicePrefix):]
	if digits == "" {
		return 0, false
	}

	seq, err := strconv.ParseInt(digits, 10, 64)
	if err != nil || seq <= 0 {
		return 0, false
	}

	return seq, true
}

// ExtractInvoiceNumber finds the first "KITE<number>" token inside an arbitrary
// bank memo (which often carries extra reference codes around it, e.g.
// "BankAPINotify O5CH7JN0AN8H-KITE42") and returns the canonical invoice number
// "KITE42".
func ExtractInvoiceNumber(text string) (string, bool) {
	upper := strings.ToUpper(text)
	start := strings.Index(upper, invoicePrefix)
	if start < 0 {
		return "", false
	}

	i := start + len(invoicePrefix)
	j := i
	for j < len(text) && text[j] >= '0' && text[j] <= '9' {
		j++
	}
	if j == i {
		// "KITE" is not followed by any digit.
		return "", false
	}

	return invoicePrefix + text[i:j], true
}
