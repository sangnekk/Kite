package eval

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// messages runs the check and returns "text of the range: message" for each
// problem, so a test reads like what the editor underlines.
func messages(text, flowContext string) []string {
	units := utf16Of(text)

	var out []string
	for _, p := range CheckTemplate(text, flowContext) {
		out = append(out, string(units[p.From:p.To])+" => "+p.Message)
	}
	return out
}

// utf16Of is the text as UTF-16 code units, which is how Problem counts.
func utf16Of(text string) []rune {
	var res []rune
	for _, r := range text {
		if r > 0xFFFF {
			r -= 0x10000
			res = append(res, 0xD800+(r>>10), 0xDC00+(r&0x3FF))
		} else {
			res = append(res, r)
		}
	}
	return res
}

func TestCheckTemplateAcceptsGoodExpressions(t *testing.T) {
	good := []string{
		"hello",
		"{{user.id}}",
		"{{ user.username }} joined {{guild.id}}",
		"{{result('a').content}}",
		"{{upper(user.username)}}",
		"{{user.username | upper()}}",
		"{{len(user.username) > 3 ? 'long' : 'short'}}",
		"{{arg('name') ?? 'default'}}",
		"{{app.user.mention}}",
		"{{filter([1, 2, 3], # > 1)}}",
		"{{let x = 1; x + 1}}",
		"{{item.name}} {{index + 1}}",
		"{{user.nick}} {{member.role_ids}}",
		"{{var('x')}} {{input('reason')}}",
	}
	for _, text := range good {
		assert.Empty(t, messages(text, CheckContextCommand), text)
	}
}

func TestCheckTemplateSyntaxErrors(t *testing.T) {

	res := messages("{{1 +}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "chưa hoàn chỉnh")

	res = messages("{{(1}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "chưa hoàn chỉnh")

	res = messages("{{a b}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "Ký hiệu không hợp lệ")
}

func TestCheckTemplateEmptyExpression(t *testing.T) {
	res := messages("a {{ }} b", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "Biểu thức trống")
}

func TestCheckTemplateUnfinishedBraces(t *testing.T) {
	// no closing braces: the rest of the text is the expression
	res := messages("{{user.nme", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "nme")
}

func TestCheckTemplateUnknownField(t *testing.T) {
	res := messages("{{user.nme}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "nme => Không có trường 'nme'")
	assert.Contains(t, res[0], "Ý bạn là 'name'?")

	res = messages("{{app.usr.id}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "'usr'")
	assert.Contains(t, res[0], "Ý bạn là 'user'?")

	// a field that is nowhere near any lists the real ones
	res = messages("{{channel.zzzzzz}}", CheckContextCommand)
	assert.Contains(t, res[0], "Các trường có: id.")

	// fields of the member are fine
	assert.Empty(t, messages("{{member.nick}} {{member.display_name}}", CheckContextCommand))
}

func TestCheckTemplateUnknownFunction(t *testing.T) {
	res := messages("{{upperr(user.username)}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "upperr => Hàm 'upperr' không tồn tại.")
	assert.Contains(t, res[0], "Ý bạn là 'upper'?")

	res = messages("{{foo()}}", CheckContextCommand)
	assert.Contains(t, res[0], "Hàm 'foo' không tồn tại.")
	assert.NotContains(t, res[0], "Ý bạn là")

	// the functions of the flow are known
	assert.Empty(t, messages("{{result('a')}}{{var('b')}}{{arg('c')}}{{input('d')}}", CheckContextCommand))
}

func TestCheckTemplateArguments(t *testing.T) {
	res := messages("{{upper()}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "Hàm 'upper' thiếu tham số.")

	res = messages("{{upper('a', 'b')}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "Hàm 'upper' thừa tham số.")
}

func TestCheckTemplateMismatchedTypes(t *testing.T) {
	res := messages("{{'abc' + 1}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "Không thể dùng '+' giữa văn bản và số.")

	res = messages("{{channel.id == 1}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "giữa văn bản và số")
}

func TestCheckTemplateUnknownValue(t *testing.T) {
	res := messages("{{usr.id}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "usr => Giá trị 'usr' không tồn tại.")
	assert.Contains(t, res[0], "Ý bạn là 'user'?")
	assert.Contains(t, res[0], "Các giá trị có sẵn:")

	// a name made up by let is not unknown
	assert.Empty(t, messages("{{let total = 2; total * 3}}", CheckContextCommand))
}

func TestCheckTemplateValuesOfOtherKindsOfFlow(t *testing.T) {
	// a schedule has no user, the editor says so instead of a silent empty value
	res := messages("{{user.id}}", CheckContextSchedule)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "'user' không dùng được trong loại flow này")
	assert.Contains(t, res[0], "app")

	assert.Empty(t, messages("{{app.user.id}}", CheckContextSchedule))

	// a Discord event has the message, a command does not need it but may
	assert.Empty(t, messages("{{message.content}} {{event.name}}", CheckContextEventDiscord))

	// a custom event only has the event and the bot
	res = messages("{{channel.id}}", CheckContextEventCustom)
	assert.Contains(t, res[0], "không dùng được")

	// a context nobody knows gets every value
	assert.Empty(t, messages("{{user.id}} {{event.x}} {{message.y}}", "something_new"))
}

func TestCheckTemplateReportsEveryProblemInOrder(t *testing.T) {
	res := messages("{{user.nme}} and {{upperr('x')}} and {{result('a')}}", CheckContextCommand)
	assert.Len(t, res, 2)
	assert.Contains(t, res[0], "nme")
	assert.Contains(t, res[1], "upperr")
}

func TestCheckTemplateOffsetsCountUTF16(t *testing.T) {
	// "😀" is two UTF-16 code units, the range of the problem must account for it
	res := messages("😀 Đặng {{user.nme}}", CheckContextCommand)
	assert.Len(t, res, 1)
	assert.Contains(t, res[0], "nme => ")
}

func TestCheckTemplatePlainTextIsFine(t *testing.T) {
	assert.Empty(t, messages("no braces at all", CheckContextCommand))
	assert.Empty(t, messages("", CheckContextCommand))
	assert.Empty(t, messages("a } b { c", CheckContextCommand))
}
