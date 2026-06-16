package store

import "errors"

var ErrNotFound = errors.New("not found")
var ErrAlreadyExists = errors.New("already exists")
var ErrInsufficientFunds = errors.New("insufficient funds")
