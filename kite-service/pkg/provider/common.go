package provider

import "errors"

var (
	ErrNotFound = errors.New("not found")
	// ErrInsufficientFunds is returned by the EconomyProvider when a balance
	// operation would push a balance below zero and negative balances are not allowed.
	ErrInsufficientFunds = errors.New("insufficient funds")
)
