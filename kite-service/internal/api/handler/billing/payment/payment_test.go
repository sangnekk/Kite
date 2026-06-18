package payment

import "testing"

func TestEncodeInvoiceNumber(t *testing.T) {
	if got := EncodeInvoiceNumber(42); got != "KITE42" {
		t.Fatalf("unexpected invoice number: %s", got)
	}
}

func TestDecodeInvoiceNumber(t *testing.T) {
	seq, ok := DecodeInvoiceNumber("KITE42")
	if !ok {
		t.Fatalf("expected KITE42 to decode")
	}
	if seq != 42 {
		t.Fatalf("unexpected seq: %d", seq)
	}

	// Case-insensitive prefix.
	if seq, ok := DecodeInvoiceNumber("kite7"); !ok || seq != 7 {
		t.Fatalf("expected kite7 to decode to 7, got %d ok=%v", seq, ok)
	}
}

func TestDecodeInvoiceNumberRejectsInvalid(t *testing.T) {
	cases := []string{"", "KITE", "KITEabc", "KITE0", "KITE-1", "FOO42", "42"}
	for _, c := range cases {
		if _, ok := DecodeInvoiceNumber(c); ok {
			t.Fatalf("expected %q to be rejected", c)
		}
	}
}

func TestExtractInvoiceNumberFromBankMemo(t *testing.T) {
	// Real-world shape: a bank reference is prepended to the memo.
	cases := map[string]string{
		"O5CH7JN0AN8H-KITE128":                  "KITE128",
		"BankAPINotify O5CH7JN0AN8H-KITE128":    "KITE128",
		"KITE5":                                 "KITE5",
		"chuyen tien KITE99 cam on":             "KITE99",
		"kite77 lowercase":                      "KITE77",
	}
	for input, want := range cases {
		got, ok := ExtractInvoiceNumber(input)
		if !ok {
			t.Fatalf("expected to extract invoice from %q", input)
		}
		if got != want {
			t.Fatalf("for %q expected %q, got %q", input, want, got)
		}
	}
}

func TestExtractInvoiceNumberStopsAtNonDigit(t *testing.T) {
	// Trailing non-digits / extra refs must not be swallowed into the number.
	got, ok := ExtractInvoiceNumber("KITE128-MOMO999")
	if !ok || got != "KITE128" {
		t.Fatalf("expected KITE128, got %q ok=%v", got, ok)
	}
}

func TestExtractInvoiceNumberFailsWithoutDigits(t *testing.T) {
	for _, input := range []string{"no code here", "KITE no digits", "KITE-"} {
		if _, ok := ExtractInvoiceNumber(input); ok {
			t.Fatalf("expected %q to fail extraction", input)
		}
	}
}
