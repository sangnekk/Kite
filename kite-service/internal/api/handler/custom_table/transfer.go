package custom_table

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

func (h *Handler) ImportRows(c *handler.Context, req wire.CustomTableImportRequest) (*wire.CustomTableImportResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	if len([]byte(req.Content)) > provider.MaxCustomTableImportBytes {
		return nil, handler.ErrBadRequest("import_too_large", "File nhập vượt quá giới hạn 5 MiB")
	}

	rows, err := decodeCustomTableImport(table.Schema, req.Format, req.Content)
	if err != nil {
		return nil, handler.ErrBadRequest("invalid_import", err.Error())
	}
	inserted, err := h.store.ImportCustomTableRows(
		c.Context(), table, req.ScopeID, rows, req.Mode == wire.CustomTableImportModeReplace,
	)
	if err != nil {
		return nil, customTableError(err)
	}
	return &wire.CustomTableImportResponse{InsertedRows: inserted}, nil
}

func (h *Handler) ExportRows(c *handler.Context, req wire.CustomTableExportRequest) (*wire.CustomTableExportResponse, error) {
	table, err := h.tableForApp(c)
	if err != nil {
		return nil, err
	}
	rows, err := h.store.ExportCustomTableRows(c.Context(), table, req.ScopeID, provider.MaxCustomTableTransferRows)
	if err != nil {
		return nil, customTableError(err)
	}
	content, contentType, err := encodeCustomTableExport(table.Schema, req.Format, rows)
	if err != nil {
		return nil, fmt.Errorf("encode custom table export: %w", err)
	}
	extension := string(req.Format)
	return &wire.CustomTableExportResponse{
		Filename: table.Name + "." + extension, ContentType: contentType,
		Content: content, RowCount: len(rows),
	}, nil
}

func decodeCustomTableImport(schema provider.CustomTableSchema, format wire.CustomTableTransferFormat, content string) ([]map[string]any, error) {
	switch format {
	case wire.CustomTableTransferFormatCSV:
		return decodeCustomTableCSV(schema, content)
	case wire.CustomTableTransferFormatJSON:
		return decodeCustomTableJSON(schema, content)
	default:
		return nil, fmt.Errorf("Định dạng %q không được hỗ trợ", format)
	}
}

func decodeCustomTableCSV(schema provider.CustomTableSchema, content string) ([]map[string]any, error) {
	reader := csv.NewReader(strings.NewReader(content))
	reader.ReuseRecord = false
	header, err := reader.Read()
	if errors.Is(err, io.EOF) {
		return nil, errors.New("File CSV phải có hàng tiêu đề")
	}
	if err != nil {
		return nil, fmt.Errorf("Không thể đọc tiêu đề CSV: %v", err)
	}
	if len(header) == 0 {
		return nil, errors.New("File CSV phải có ít nhất một cột")
	}
	header[0] = strings.TrimPrefix(header[0], "\ufeff")
	columns := make([]provider.CustomTableColumn, len(header))
	seen := make(map[string]struct{}, len(header))
	for i, name := range header {
		name = strings.TrimSpace(name)
		if name == "" {
			return nil, fmt.Errorf("Tiêu đề cột thứ %d đang để trống", i+1)
		}
		if _, exists := seen[name]; exists {
			return nil, fmt.Errorf("Cột %q xuất hiện nhiều hơn một lần trong tiêu đề CSV", name)
		}
		column, ok := schema.ColumnByName(name)
		if !ok {
			return nil, fmt.Errorf("Không tìm thấy cột %q trong cấu trúc bảng", name)
		}
		seen[name] = struct{}{}
		columns[i] = column
	}

	rows := make([]map[string]any, 0)
	for {
		record, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("Không thể đọc CSV gần dòng %d: %v", len(rows)+2, err)
		}
		if len(rows) >= provider.MaxCustomTableTransferRows {
			return nil, fmt.Errorf("Mỗi lần chỉ được nhập tối đa %d dòng", provider.MaxCustomTableTransferRows)
		}
		row := make(map[string]any, len(columns))
		for i, raw := range record {
			if raw == "" {
				continue
			}
			value, err := parseCustomTableTransferValue(columns[i], raw, true)
			if err != nil {
				return nil, fmt.Errorf("Dòng %d, cột %q: %v", len(rows)+2, columns[i].Name, err)
			}
			row[columns[i].ID] = value
		}
		rows = append(rows, row)
	}
	return rows, nil
}

func decodeCustomTableJSON(schema provider.CustomTableSchema, content string) ([]map[string]any, error) {
	decoder := json.NewDecoder(strings.NewReader(content))
	decoder.UseNumber()
	var source []map[string]any
	if err := decoder.Decode(&source); err != nil {
		return nil, fmt.Errorf("JSON phải là một mảng object hợp lệ: %v", err)
	}
	if err := ensureJSONEOF(decoder); err != nil {
		return nil, err
	}
	if len(source) > provider.MaxCustomTableTransferRows {
		return nil, fmt.Errorf("Mỗi lần chỉ được nhập tối đa %d dòng", provider.MaxCustomTableTransferRows)
	}
	rows := make([]map[string]any, len(source))
	for i, sourceRow := range source {
		row := make(map[string]any, len(sourceRow))
		for name, raw := range sourceRow {
			column, ok := schema.ColumnByName(name)
			if !ok {
				return nil, fmt.Errorf("Dòng %d: không tìm thấy cột %q trong cấu trúc bảng", i+1, name)
			}
			value, err := parseCustomTableTransferValue(column, raw, false)
			if err != nil {
				return nil, fmt.Errorf("Dòng %d, cột %q: %v", i+1, column.Name, err)
			}
			row[column.ID] = value
		}
		rows[i] = row
	}
	return rows, nil
}

func ensureJSONEOF(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); errors.Is(err, io.EOF) {
		return nil
	} else if err != nil {
		return fmt.Errorf("JSON chứa dữ liệu thừa: %v", err)
	}
	return errors.New("JSON chỉ được chứa một mảng dữ liệu")
}

func parseCustomTableTransferValue(column provider.CustomTableColumn, raw any, fromCSV bool) (any, error) {
	if raw == nil {
		if column.Required {
			return nil, errors.New("không được để trống")
		}
		return nil, nil
	}
	switch column.Type {
	case provider.CustomTableColumnTypeText:
		value, ok := raw.(string)
		if !ok {
			return nil, errors.New("phải là chuỗi")
		}
		if fromCSV {
			value = unescapeSpreadsheetFormula(value)
		}
		return value, nil
	case provider.CustomTableColumnTypeNumber:
		var text string
		switch value := raw.(type) {
		case json.Number:
			text = value.String()
		case string:
			if !fromCSV {
				return nil, errors.New("phải là số, không phải chuỗi")
			}
			text = strings.TrimSpace(value)
		case float64:
			if math.IsNaN(value) || math.IsInf(value, 0) {
				return nil, errors.New("phải là số hợp lệ")
			}
			return value, nil
		default:
			return nil, errors.New("phải là số")
		}
		value, err := strconv.ParseFloat(text, 64)
		if err != nil || math.IsNaN(value) || math.IsInf(value, 0) {
			return nil, errors.New("phải là số hợp lệ")
		}
		if math.Trunc(value) == value && math.Abs(value) > 9007199254740991 {
			return nil, errors.New("vượt giới hạn số nguyên an toàn; ID Discord nên dùng kiểu Chuỗi")
		}
		return value, nil
	case provider.CustomTableColumnTypeBoolean:
		if value, ok := raw.(bool); ok {
			return value, nil
		}
		if fromCSV {
			if value, ok := raw.(string); ok {
				switch strings.ToLower(strings.TrimSpace(value)) {
				case "true":
					return true, nil
				case "false":
					return false, nil
				}
			}
		}
		return nil, errors.New("phải là true hoặc false")
	case provider.CustomTableColumnTypeDateTime:
		value, ok := raw.(string)
		if !ok {
			return nil, errors.New("phải là chuỗi thời gian RFC3339")
		}
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(value))
		if err != nil {
			return nil, errors.New("phải là thời gian RFC3339 hợp lệ, ví dụ 2026-08-17T14:30:00Z")
		}
		return parsed.UTC().Format(time.RFC3339Nano), nil
	case provider.CustomTableColumnTypeJSON:
		if fromCSV {
			value, ok := raw.(string)
			if !ok {
				return nil, errors.New("phải là JSON hợp lệ")
			}
			var decoded any
			decoder := json.NewDecoder(strings.NewReader(value))
			decoder.UseNumber()
			if err := decoder.Decode(&decoded); err != nil {
				return nil, errors.New("phải là JSON hợp lệ")
			}
			if err := ensureJSONEOF(decoder); err != nil {
				return nil, errors.New("phải là JSON hợp lệ")
			}
			return decoded, nil
		}
		if _, err := json.Marshal(raw); err != nil {
			return nil, errors.New("phải là JSON hợp lệ")
		}
		return raw, nil
	default:
		return nil, fmt.Errorf("kiểu dữ liệu %q không được hỗ trợ", column.Type)
	}
}

func encodeCustomTableExport(schema provider.CustomTableSchema, format wire.CustomTableTransferFormat, rows []*model.CustomTableRow) (string, string, error) {
	switch format {
	case wire.CustomTableTransferFormatJSON:
		values := make([]map[string]any, len(rows))
		for i, row := range rows {
			values[i] = customTableRowByColumnName(schema, row.Data)
		}
		raw, err := json.MarshalIndent(values, "", "  ")
		return string(raw), "application/json; charset=utf-8", err
	case wire.CustomTableTransferFormatCSV:
		var output bytes.Buffer
		output.WriteString("\ufeff")
		writer := csv.NewWriter(&output)
		header := make([]string, len(schema.Columns))
		for i, column := range schema.Columns {
			header[i] = column.Name
		}
		if err := writer.Write(header); err != nil {
			return "", "", err
		}
		for _, row := range rows {
			record := make([]string, len(schema.Columns))
			for i, column := range schema.Columns {
				value, exists := row.Data[column.ID]
				if !exists {
					continue
				}
				encoded, err := formatCustomTableCSVValue(column, value)
				if err != nil {
					return "", "", fmt.Errorf("cột %q: %w", column.Name, err)
				}
				record[i] = encoded
			}
			if err := writer.Write(record); err != nil {
				return "", "", err
			}
		}
		writer.Flush()
		if err := writer.Error(); err != nil {
			return "", "", err
		}
		return output.String(), "text/csv; charset=utf-8", nil
	default:
		return "", "", fmt.Errorf("unsupported export format %q", format)
	}
}

func customTableRowByColumnName(schema provider.CustomTableSchema, data map[string]any) map[string]any {
	result := make(map[string]any, len(data))
	for _, column := range schema.Columns {
		if value, exists := data[column.ID]; exists {
			result[column.Name] = value
		}
	}
	return result
}

func formatCustomTableCSVValue(column provider.CustomTableColumn, value any) (string, error) {
	if value == nil {
		if column.Type == provider.CustomTableColumnTypeJSON {
			return "null", nil
		}
		return "", nil
	}
	switch column.Type {
	case provider.CustomTableColumnTypeText:
		return escapeSpreadsheetFormula(fmt.Sprint(value)), nil
	case provider.CustomTableColumnTypeDateTime:
		return fmt.Sprint(value), nil
	case provider.CustomTableColumnTypeNumber:
		number, ok := numberAsFloat64(value)
		if !ok {
			return "", errors.New("giá trị không phải số")
		}
		return strconv.FormatFloat(number, 'f', -1, 64), nil
	case provider.CustomTableColumnTypeBoolean:
		boolean, ok := value.(bool)
		if !ok {
			return "", errors.New("giá trị không phải true/false")
		}
		return strconv.FormatBool(boolean), nil
	case provider.CustomTableColumnTypeJSON:
		raw, err := json.Marshal(value)
		return string(raw), err
	default:
		return "", fmt.Errorf("kiểu dữ liệu %q không được hỗ trợ", column.Type)
	}
}

func escapeSpreadsheetFormula(value string) string {
	trimmed := strings.TrimLeft(value, " \t\r\n")
	if trimmed != "" && strings.ContainsRune("=+-@", rune(trimmed[0])) {
		return "'" + value
	}
	return value
}

func unescapeSpreadsheetFormula(value string) string {
	if !strings.HasPrefix(value, "'") {
		return value
	}
	candidate := strings.TrimLeft(strings.TrimPrefix(value, "'"), " \t\r\n")
	if candidate != "" && strings.ContainsRune("=+-@", rune(candidate[0])) {
		return strings.TrimPrefix(value, "'")
	}
	return value
}

func numberAsFloat64(value any) (float64, bool) {
	switch value := value.(type) {
	case float64:
		return value, true
	case float32:
		return float64(value), true
	case int:
		return float64(value), true
	case int64:
		return float64(value), true
	case json.Number:
		number, err := value.Float64()
		return number, err == nil
	default:
		return 0, false
	}
}
