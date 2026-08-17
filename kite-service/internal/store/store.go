package store

import "errors"

var ErrNotFound = errors.New("not found")
var ErrAlreadyExists = errors.New("already exists")
var ErrInsufficientFunds = errors.New("insufficient funds")
var ErrInvalidData = errors.New("invalid data")
var ErrInvalidQuery = errors.New("invalid query")
