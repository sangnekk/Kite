package eval

import (
	"fmt"
	"reflect"
	"regexp"
	"sort"
	"strings"
	"unicode"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/expr-lang/expr"
	"github.com/expr-lang/expr/ast"
	"github.com/expr-lang/expr/builtin"
	"github.com/expr-lang/expr/file"
	"github.com/expr-lang/expr/parser"
)

// Problem is something wrong in a template, with the part of the text it is
// about. From and To count UTF-16 code units, which is what a JavaScript string
// indexes by, so the editor can use them as they are.
type Problem struct {
	From    int    `json:"from"`
	To      int    `json:"to"`
	Message string `json:"message"`
}

// Flow context types the checker knows, as the editor names them.
const (
	CheckContextCommand         = "command"
	CheckContextComponentButton = "component_button"
	CheckContextComponentSelect = "component_select"
	CheckContextEventDiscord    = "event_discord"
	CheckContextEventCustom     = "event_custom"
	CheckContextSchedule        = "schedule"
)

// flowFunctions are the functions every flow gets next to the ones of expr.
var flowFunctions = []string{"result", "var", "arg", "input", "node"}

// Values that exist in every flow because the flow engine adds them while it
// runs (loops, select menus), whatever started the flow.
var flowValues = []string{"result", "var", "arg", "input", "node", "item", "index", "option", "select", "ctx"}

// rootsByContext are the values the engine puts in the expression environment,
// per kind of flow (see the NewContextFrom... functions of this package). A
// context that is not listed gets all of them.
var rootsByContext = map[string][]string{
	CheckContextCommand:         {"interaction", "channel", "guild", "server", "user", "member", "app", "event", "message"},
	CheckContextComponentButton: {"interaction", "channel", "guild", "server", "user", "member", "app"},
	CheckContextComponentSelect: {"interaction", "channel", "guild", "server", "user", "member", "app"},
	CheckContextEventDiscord:    {"event", "channel", "guild", "server", "user", "member", "message", "app"},
	CheckContextEventCustom:     {"event", "app"},
	CheckContextSchedule:        {"app"},
}

// shapeTypes are the types of the values whose fields can be checked.
var shapeTypes = map[string]reflect.Type{
	"eval.MemberEnv":    reflect.TypeOf(MemberEnv{}),
	"eval.UserEnv":      reflect.TypeOf(UserEnv{}),
	"eval.SnowflakeEnv": reflect.TypeOf(SnowflakeEnv{}),
	"eval.AppEnv":       reflect.TypeOf(AppEnv{}),
}

var shapeNames = map[string]string{
	"eval.MemberEnv":    "người dùng / thành viên",
	"eval.UserEnv":      "người dùng",
	"eval.SnowflakeEnv": "giá trị này",
	"eval.AppEnv":       "app",
}

func allowedRoots(flowContext string) []string {
	if roots, ok := rootsByContext[flowContext]; ok {
		return roots
	}

	seen := map[string]bool{}
	var all []string
	for _, roots := range rootsByContext {
		for _, r := range roots {
			if !seen[r] {
				seen[r] = true
				all = append(all, r)
			}
		}
	}
	sort.Strings(all)
	return all
}

// checkEnv builds an environment with the right types for the values whose
// fields are known, so expr can say that user.nme does not exist. Everything
// else stays undefined, which expr allows.
func checkEnv(roots []string) map[string]any {
	member := NewMemberEnv(discord.Member{})
	env := map[string]any{
		"result": func(id string) any { return nil },
		"var":    func(name string) any { return nil },
		"arg":    func(name string) any { return nil },
		"input":  func(id string) any { return nil },
	}

	for _, root := range roots {
		switch root {
		case "user", "member":
			env[root] = member
		case "channel", "guild", "server":
			env[root] = NewSnowflakeEnv(discord.GuildID(0))
		case "app":
			env[root] = &AppEnv{User: NewUserEnv(discord.User{})}
		}
	}

	return env
}

// CheckTemplate looks for mistakes in the {{ expressions }} of a text without
// running them: a syntax error, a function or value that does not exist in this
// kind of flow, a field a value does not have, a wrong number of arguments.
// The backend itself treats an unknown name as an empty value, so this is the
// only place such a typo is noticed.
func CheckTemplate(text, flowContext string) []Problem {
	runes := []rune(text)

	// utf16At maps the index of a rune to its index in UTF-16 code units.
	utf16At := make([]int, len(runes)+1)
	for i, r := range runes {
		n := 1
		if r > 0xFFFF {
			n = 2
		}
		utf16At[i+1] = utf16At[i] + n
	}

	var problems []Problem

	pos := 0
	for pos < len(runes) {
		open := indexRunes(runes, "{{", pos)
		if open == -1 {
			break
		}

		start := open + 2
		end := indexRunes(runes, "}}", start)
		closed := end != -1
		if !closed {
			end = len(runes)
		}

		for _, p := range checkExpression(string(runes[start:end]), flowContext) {
			from, to := start+p.from, start+p.to
			if to > len(runes) {
				to = len(runes)
			}
			if from > to {
				from = to
			}
			problems = append(problems, Problem{
				From:    utf16At[from],
				To:      utf16At[to],
				Message: p.message,
			})
		}

		if !closed {
			break
		}
		pos = end + 2
	}

	return problems
}

func indexRunes(runes []rune, sep string, from int) int {
	s := []rune(sep)
	for i := from; i+len(s) <= len(runes); i++ {
		match := true
		for j := range s {
			if runes[i+j] != s[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

// problem is a Problem in rune offsets inside one expression.
type problem struct {
	from, to int
	message  string
}

func checkExpression(source, flowContext string) []problem {
	runes := []rune(source)
	if strings.TrimSpace(source) == "" {
		return []problem{{from: 0, to: len(runes), message: "Biểu thức trống, hãy nhập một giá trị."}}
	}

	// Syntax first: nothing else can be said about text that does not parse.
	tree, err := parser.Parse(source)
	if err != nil {
		return []problem{fromExprError(err, len(runes))}
	}

	roots := allowedRoots(flowContext)
	var problems []problem
	problems = append(problems, checkNames(tree, roots)...)

	// Then types: unknown fields, wrong argument counts, mismatched operands.
	if _, err := expr.Compile(
		source,
		expr.Env(checkEnv(roots)),
		expr.AllowUndefinedVariables(),
	); err != nil {
		p := fromExprError(err, len(runes))
		// A name problem found above is more specific than the compile error.
		if !overlaps(problems, p) {
			problems = append(problems, p)
		}
	}

	sort.SliceStable(problems, func(i, j int) bool { return problems[i].from < problems[j].from })
	return problems
}

func overlaps(list []problem, p problem) bool {
	for _, q := range list {
		if q.from < p.to && p.from < q.to {
			return true
		}
	}
	return false
}

// declared collects the names a let makes up, which are not roots.
type nameCollector struct {
	declared map[string]bool
	calls    []*ast.IdentifierNode
	idents   []*ast.IdentifierNode
	callees  map[*ast.IdentifierNode]bool
}

func (c *nameCollector) Visit(node *ast.Node) {
	switch n := (*node).(type) {
	case *ast.VariableDeclaratorNode:
		c.declared[n.Name] = true
	case *ast.CallNode:
		if id, ok := n.Callee.(*ast.IdentifierNode); ok {
			c.callees[id] = true
			c.calls = append(c.calls, id)
		}
	case *ast.IdentifierNode:
		c.idents = append(c.idents, n)
	}
}

func checkNames(tree *parser.Tree, roots []string) []problem {
	c := &nameCollector{declared: map[string]bool{}, callees: map[*ast.IdentifierNode]bool{}}
	ast.Walk(&tree.Node, c)

	known := map[string]bool{}
	for _, r := range roots {
		known[r] = true
	}
	for _, v := range flowValues {
		known[v] = true
	}

	functions := map[string]bool{}
	for _, f := range flowFunctions {
		functions[f] = true
	}

	var problems []problem

	for _, id := range c.calls {
		if functions[id.Value] {
			continue
		}
		problems = append(problems, problem{
			from:    id.Location().From,
			to:      id.Location().From + len([]rune(id.Value)),
			message: unknownMessage("Hàm", id.Value, append(functionNames(), flowFunctions...)),
		})
	}

	for _, id := range c.idents {
		if c.callees[id] || known[id.Value] || c.declared[id.Value] {
			continue
		}
		// Not a name of this kind of flow. The names of the others are listed so the
		// message tells a typo from a value that only exists elsewhere.
		problems = append(problems, problem{
			from:    id.Location().From,
			to:      id.Location().From + len([]rune(id.Value)),
			message: unknownRootMessage(id.Value, roots),
		})
	}

	return problems
}

func unknownRootMessage(name string, roots []string) string {
	available := append(append([]string{}, roots...), "result", "var", "arg", "input")
	for _, root := range allowedRoots("") {
		if root == name {
			return fmt.Sprintf("'%s' không dùng được trong loại flow này. Các giá trị có sẵn: %s.", name, strings.Join(sortedUnique(roots), ", "))
		}
	}

	return unknownMessage("Giá trị", name, available) + " Các giá trị có sẵn: " + strings.Join(sortedUnique(roots), ", ") + "."
}

func unknownMessage(kind, name string, candidates []string) string {
	msg := fmt.Sprintf("%s '%s' không tồn tại.", kind, name)
	if s := closest(name, candidates); s != "" {
		msg += fmt.Sprintf(" Ý bạn là '%s'?", s)
	}
	return msg
}

func sortedUnique(in []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range in {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	sort.Strings(out)
	return out
}

// closest returns the candidate that is one or two edits from the name, or "".
func closest(name string, candidates []string) string {
	best, bestDistance := "", 3
	for _, c := range candidates {
		d := editDistance(strings.ToLower(name), strings.ToLower(c))
		// A short name is too easy to match by chance.
		limit := 2
		if len([]rune(name)) <= 3 {
			limit = 1
		}
		if d <= limit && d < bestDistance {
			best, bestDistance = c, d
		}
	}
	return best
}

func editDistance(a, b string) int {
	ra, rb := []rune(a), []rune(b)
	prev := make([]int, len(rb)+1)
	for j := range prev {
		prev[j] = j
	}
	for i := 1; i <= len(ra); i++ {
		cur := make([]int, len(rb)+1)
		cur[0] = i
		for j := 1; j <= len(rb); j++ {
			cost := 1
			if ra[i-1] == rb[j-1] {
				cost = 0
			}
			cur[j] = min(prev[j]+1, cur[j-1]+1, prev[j-1]+cost)
		}
		prev = cur
	}
	return prev[len(rb)]
}

var (
	noFieldPattern    = regexp.MustCompile(`type (\S+) has no field (\w+)`)
	tokenPattern      = regexp.MustCompile(`unexpected token (.+)`)
	notEnoughPattern  = regexp.MustCompile(`not enough arguments to call (\w+)`)
	tooManyPattern    = regexp.MustCompile(`too many arguments to call (\w+)`)
	mismatchedPattern = regexp.MustCompile(`invalid operation: (\S+) \(mismatched types (\w+) and (\w+)\)`)
)

func kindName(t string) string {
	switch t {
	case "string":
		return "văn bản"
	case "int", "int64", "float64", "float":
		return "số"
	case "bool":
		return "đúng/sai"
	default:
		return t
	}
}

func fromExprError(err error, length int) problem {
	p := problem{from: 0, to: length, message: "Biểu thức không hợp lệ: " + err.Error()}

	fe, ok := err.(*file.Error)
	if !ok {
		return p
	}

	p.from, p.to = fe.From, fe.To
	if p.to <= p.from {
		p.to = p.from + 1
	}
	// An error at the end of the text (something is missing) points at the last
	// character instead of past it.
	if p.from >= length {
		p.from = max(0, length-1)
	}
	p.to = min(p.to, length)

	p.message = describeExprError(fe.Message)
	return p
}

func describeExprError(msg string) string {
	if m := noFieldPattern.FindStringSubmatch(msg); m != nil {
		typeName := m[1]
		what := shapeNames[typeName]
		if what == "" {
			what = typeName
		}
		out := fmt.Sprintf("Không có trường '%s' trong %s.", m[2], what)
		if t, ok := shapeTypes[typeName]; ok {
			fields := fieldNames(t)
			if s := closest(m[2], fields); s != "" {
				out += fmt.Sprintf(" Ý bạn là '%s'?", s)
			} else {
				out += " Các trường có: " + strings.Join(fields, ", ") + "."
			}
		}
		return out
	}
	if m := notEnoughPattern.FindStringSubmatch(msg); m != nil {
		return fmt.Sprintf("Hàm '%s' thiếu tham số.", m[1])
	}
	if m := tooManyPattern.FindStringSubmatch(msg); m != nil {
		return fmt.Sprintf("Hàm '%s' thừa tham số.", m[1])
	}
	if m := mismatchedPattern.FindStringSubmatch(msg); m != nil {
		return fmt.Sprintf("Không thể dùng '%s' giữa %s và %s.", m[1], kindName(m[2]), kindName(m[3]))
	}
	if strings.Contains(msg, "unexpected token EOF") {
		return "Biểu thức chưa hoàn chỉnh (thiếu một giá trị hoặc dấu đóng)."
	}
	if m := tokenPattern.FindStringSubmatch(msg); m != nil {
		return "Ký hiệu không hợp lệ: " + m[1] + "."
	}
	return "Biểu thức không hợp lệ: " + msg
}

// fieldNames lists the fields of a type by the name an expression uses (the
// `expr` tag), embedded structs included.
func fieldNames(t reflect.Type) []string {
	var names []string
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		if f.Anonymous {
			names = append(names, fieldNames(f.Type)...)
			continue
		}
		if tag := f.Tag.Get("expr"); tag != "" && tag != "-" && unicode.IsLower(rune(tag[0])) {
			names = append(names, tag)
		}
	}
	return sortedUnique(names)
}

// functionNames are the builtin functions of expr, for the "did you mean" hint.
func functionNames() []string {
	names := make([]string, 0, len(builtin.Builtins))
	for _, f := range builtin.Builtins {
		names = append(names, f.Name)
	}
	return names
}
