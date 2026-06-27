package integration

import (
	"encoding/json"
	"fmt"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	staticcontents "github.com/kitecloud/kite/kite-service/static_contents"
)

type IntegrationHandler struct {
	banks wire.BankListResponse
}

// NewIntegrationHandler parses the embedded VietQR bank list once at startup.
func NewIntegrationHandler() (*IntegrationHandler, error) {
	var parsed struct {
		Data wire.BankListResponse `json:"data"`
	}
	if err := json.Unmarshal(staticcontents.BanksJSON, &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse embedded banks.json: %w", err)
	}

	return &IntegrationHandler{banks: parsed.Data}, nil
}

// HandleBankList returns the full VietQR bank list, including the `supported`
// flag so the frontend can filter to banks that can actually generate a QR.
func (h *IntegrationHandler) HandleBankList(c *handler.Context) (*wire.BankListResponse, error) {
	return &h.banks, nil
}
