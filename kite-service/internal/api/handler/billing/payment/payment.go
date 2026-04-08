package payment

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"regexp"
	"strconv"
	"strings"
)

type TransferCodeParts struct {
	AppID  string
	PlanID string
	Nonce  string
}

var transferCodeRegex = regexp.MustCompile(`(?i)\b([a-z0-9]+)-([a-z0-9]+)-([a-z0-9_-]+)-([a-z0-9_-]+)\b`)
var invoiceNumberRegex = regexp.MustCompile(`(?i)KITE[a-z0-9_-]+=*`)

func EncodeInvoiceNumber(appID, planID, uniqueID string) string {
	raw := appID + "-" + planID + "-" + uniqueID
	encoded := base64.URLEncoding.EncodeToString([]byte(raw))
	return "KITE" + encoded
}

func DecodeInvoiceNumber(invoiceNumber string) (*TransferCodeParts, bool) {
	if invoiceNumber == "" || !strings.HasPrefix(invoiceNumber, "KITE") {
		return nil, false
	}

	encoded := strings.TrimPrefix(invoiceNumber, "KITE")
	if encoded == "" {
		return nil, false
	}

	decoded, err := base64.URLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, false
	}

	parts := strings.SplitN(string(decoded), "-", 3)
	if len(parts) != 3 {
		return nil, false
	}

	return &TransferCodeParts{
		AppID:  parts[0],
		PlanID: parts[1],
		Nonce:  parts[2],
	}, true
}

func ExtractInvoiceNumber(text string) (string, bool) {
	if text == "" {
		return "", false
	}

	match := invoiceNumberRegex.FindString(text)
	if match == "" {
		return "", false
	}

	return match, true
}

func VerifyHMAC(payload []byte, signature string, secret string) bool {
	if secret == "" || signature == "" {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := mac.Sum(nil)

	rawSignature := strings.TrimSpace(strings.ToLower(signature))
	rawSignature = strings.TrimPrefix(rawSignature, "sha256=")

	decoded, err := hex.DecodeString(rawSignature)
	if err != nil {
		return false
	}

	return hmac.Equal(expected, decoded)
}

func ParseTransferCode(description string, prefix string) (*TransferCodeParts, bool) {
	if description == "" || prefix == "" {
		return nil, false
	}

	matches := transferCodeRegex.FindAllStringSubmatch(description, -1)
	if len(matches) == 0 {
		return nil, false
	}

	normalizedPrefix := strings.ToLower(strings.TrimSpace(prefix))
	for _, m := range matches {
		if len(m) < 5 {
			continue
		}

		if strings.ToLower(m[1]) != normalizedPrefix {
			continue
		}

		return &TransferCodeParts{
			AppID:  m[2],
			PlanID: m[3],
			Nonce:  m[4],
		}, true
	}

	return nil, false
}

func ParseAmountVND(raw string) (int, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.ReplaceAll(cleaned, ",", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	if cleaned == "" {
		return 0, strconv.ErrSyntax
	}

	if v, err := strconv.ParseFloat(cleaned, 64); err == nil {
		return int(v), nil
	}

	var b strings.Builder
	for _, r := range cleaned {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}

	if b.Len() == 0 {
		return 0, strconv.ErrSyntax
	}

	v, err := strconv.Atoi(b.String())
	if err != nil {
		return 0, err
	}

	return v, nil
}
