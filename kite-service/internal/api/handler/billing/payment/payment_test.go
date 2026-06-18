package payment

import (
	"strings"
	"testing"
)

func TestDecodeInvoiceNumberAcceptsUnpaddedPaymentID(t *testing.T) {
	paymentID := EncodeInvoiceNumber("app1", "plan2", "unique123")
	unpad := strings.TrimRight(paymentID, "=")

	parts, ok := DecodeInvoiceNumber(unpad)
	if !ok {
		t.Fatalf("expected unpadded invoice number to decode")
	}

	if parts.AppID != "app1" {
		t.Fatalf("unexpected app id: %s", parts.AppID)
	}
	if parts.PlanID != "plan2" {
		t.Fatalf("unexpected plan id: %s", parts.PlanID)
	}
	if parts.Nonce != "unique123" {
		t.Fatalf("unexpected nonce: %s", parts.Nonce)
	}
}

func TestExtractInvoiceNumberNormalizesUnpaddedTokenInsideText(t *testing.T) {
	canonical := EncodeInvoiceNumber("app1", "plan2", "unique123")
	unpad := strings.TrimRight(canonical, "=")
	text := "124442742434-" + unpad + "-CHUYEN TIEN-OQCH0009Zbsk-MOMO124442742434MOMO"

	extracted, ok := ExtractInvoiceNumber(text)
	if !ok {
		t.Fatalf("expected invoice number to be extracted")
	}

	if extracted != canonical {
		t.Fatalf("expected canonical invoice number %q, got %q", canonical, extracted)
	}
}

func TestExtractInvoiceNumberFromFullBankContent(t *testing.T) {
	// Real MBBank SePay payload: the `content` field carries the full memo with
	// a bank reference prefix, and must decode to the original invoice.
	content := "O5CH7JN0AN8H-KITEbHNxdG9rYzIxNDVodmRhdy1zdHVkZW50LWhteWhrMWxwdzBhbXA2NXI"

	id, ok := ExtractInvoiceNumber(content)
	if !ok {
		t.Fatalf("expected invoice number to be extracted from full content")
	}

	parts, ok := DecodeInvoiceNumber(id)
	if !ok {
		t.Fatalf("expected extracted invoice number to decode")
	}
	if parts.AppID != "lsqtokc2145hvdaw" {
		t.Fatalf("unexpected app id: %s", parts.AppID)
	}
	if parts.PlanID != "student" {
		t.Fatalf("unexpected plan id: %s", parts.PlanID)
	}
	if parts.Nonce != "hmyhk1lpw0amp65r" {
		t.Fatalf("unexpected nonce: %s", parts.Nonce)
	}
}

func TestExtractInvoiceNumberFailsOnTruncatedCode(t *testing.T) {
	// Real MBBank SePay payload: the `code` field is truncated by the bank and
	// must NOT yield a (wrong) invoice number — extraction has to fall back to
	// the full content field instead.
	truncatedCode := "KITEbHNxdG9rYzIxNDVodmRhdy1zdHVkZW"

	if _, ok := ExtractInvoiceNumber(truncatedCode); ok {
		t.Fatalf("expected truncated code to fail extraction")
	}
}

func TestDecodeInvoiceNumberAllowsUnderscorePlanID(t *testing.T) {
	canonical := EncodeInvoiceNumber("zm8jzz9wskkvahds", "premium_extra", "wgbeocdh8mqhxo09")

	parts, ok := DecodeInvoiceNumber(canonical)
	if !ok {
		t.Fatalf("expected invoice number to decode with underscore plan id")
	}

	if parts.AppID != "zm8jzz9wskkvahds" {
		t.Fatalf("unexpected app id: %s", parts.AppID)
	}
	if parts.PlanID != "premium_extra" {
		t.Fatalf("unexpected plan id: %s", parts.PlanID)
	}
	if parts.Nonce != "wgbeocdh8mqhxo09" {
		t.Fatalf("unexpected nonce: %s", parts.Nonce)
	}
}

func TestExtractInvoiceNumberWithUnderscorePlanIDFromBankText(t *testing.T) {
	canonical := EncodeInvoiceNumber("zm8jzz9wskkvahds", "premium_extra", "wgbeocdh8mqhxo09")
	unpad := strings.TrimRight(canonical, "=")
	text := "124446678719-" + unpad + "-CHUYEN TIEN-OQCH0009Zhek-MOMO124446678719MOMO"

	extracted, ok := ExtractInvoiceNumber(text)
	if !ok {
		t.Fatalf("expected invoice number to be extracted")
	}

	if extracted != canonical {
		t.Fatalf("expected canonical invoice number %q, got %q", canonical, extracted)
	}
}
