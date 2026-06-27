package staticcontents

import _ "embed"

// BanksJSON is the VietQR bank reference list, downloaded from the official
// VietQR API and embedded so it can be served without a filesystem dependency.
//
//go:embed banks.json
var BanksJSON []byte
