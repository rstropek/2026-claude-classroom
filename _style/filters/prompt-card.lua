--[[ prompt-card.lua -----------------------------------------------------
  Blockquotes whose first line is **Prompt N.M** are the prompts the
  audience copies. Render them as a titled card instead of an indented
  quote; the label moves into the card's title bar.
--------------------------------------------------------------------------]]

local function split_label(blocks)
  local first = blocks[1]
  if not first or first.t ~= "Para" then return nil end
  local head = first.content[1]
  if not head or head.t ~= "Strong" then return nil end

  local label = pandoc.utils.stringify(head)
  if not label:match("^Prompt%s") then return nil end

  -- drop the label and any separator that follows it on the same line
  local rest = {}
  for i = 2, #first.content do
    local inline = first.content[i]
    if #rest > 0 or (inline.t ~= "Space" and inline.t ~= "SoftBreak") then
      rest[#rest + 1] = inline
    end
  end

  local body = {}
  if #rest > 0 then body[#body + 1] = pandoc.Para(rest) end
  for i = 2, #blocks do body[#body + 1] = blocks[i] end
  return label, body
end

function BlockQuote(el)
  if not FORMAT:match("latex") then return nil end
  local label, body = split_label(el.content)
  if not label then return nil end

  local out = {pandoc.RawBlock("latex", "\\begin{sbprompt}{" .. label .. "}")}
  for _, b in ipairs(body) do out[#out + 1] = b end
  out[#out + 1] = pandoc.RawBlock("latex", "\\end{sbprompt}")
  return out
end
