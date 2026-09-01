--[[ rubrics.lua ---------------------------------------------------------
  Every step in the storybook has the same skeleton, written in Markdown as
  plain bold-led paragraphs:

      **Goal:** ...            -> lead line under the step heading
      **Teaching points**      -> a section rubric (any bold-only line is)
      **Verify:** ...          -> the acceptance check, boxed

  This filter gives each of them its own typographic role in the PDF while
  the Markdown stays ordinary Markdown.
--------------------------------------------------------------------------]]

local LABELLED = {["Goal:"] = "goal", ["Verify:"] = "verify"}

-- inlines after the leading Strong, with the separating space removed
local function tail(content)
  local rest = {}
  for i = 2, #content do
    local inline = content[i]
    if #rest > 0 or (inline.t ~= "Space" and inline.t ~= "SoftBreak") then
      rest[#rest + 1] = inline
    end
  end
  return rest
end

local function bold_only(content)
  local strong = nil
  for _, inline in ipairs(content) do
    if inline.t == "Strong" then
      if strong then return nil end
      strong = inline
    elseif inline.t ~= "Space" and inline.t ~= "SoftBreak" then
      return nil
    end
  end
  return strong
end

function Para(el)
  if not FORMAT:match("latex") then return nil end
  local head = el.content[1]

  if head and head.t == "Strong" then
    local kind = LABELLED[pandoc.utils.stringify(head)]
    if kind == "goal" then
      local body = tail(el.content)
      table.insert(body, 1, pandoc.RawInline("latex", "\\sbgoalbegin "))
      table.insert(body, pandoc.RawInline("latex", "\\sbgoalend"))
      return pandoc.Para(body)
    elseif kind == "verify" then
      local body = tail(el.content)
      table.insert(body, 1, pandoc.RawInline("latex", "\\sbverifylabel "))
      return {
        pandoc.RawBlock("latex", "\\begin{sbverify}"),
        pandoc.Para(body),
        pandoc.RawBlock("latex", "\\end{sbverify}"),
      }
    end
  end

  local strong = bold_only(el.content)
  if strong then
    local out = {pandoc.RawInline("latex", "\\sbrubric{")}
    for _, inline in ipairs(strong.content) do out[#out + 1] = inline end
    out[#out + 1] = pandoc.RawInline("latex", "}")
    return pandoc.Plain(out)
  end
  return nil
end
