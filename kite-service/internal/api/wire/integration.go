package wire

// Bank mirrors an entry in static_contents/banks.json (VietQR bank list).
type Bank struct {
	Name      string `json:"name"`
	Code      string `json:"code"`
	Bin       string `json:"bin"`
	ShortName string `json:"short_name"`
	Supported bool   `json:"supported"`
}

type BankListResponse []*Bank
