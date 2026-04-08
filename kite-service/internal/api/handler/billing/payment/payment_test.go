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
