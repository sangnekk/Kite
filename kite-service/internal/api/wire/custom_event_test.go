package wire

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCustomEventCreateRequestValidate(t *testing.T) {
	require.NoError(t, (CustomEventCreateRequest{
		Name:        "shop.item_purchased",
		Description: "Item purchase signal",
	}).Validate())

	for _, name := range []string{"Shop.ItemPurchased", "shop item", "shop..item", "shop.item-1"} {
		t.Run(name, func(t *testing.T) {
			require.Error(t, (CustomEventCreateRequest{Name: name}).Validate())
		})
	}
}
