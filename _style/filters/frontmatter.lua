--[[ frontmatter.lua -----------------------------------------------------
  The storybook files carry no YAML front matter — they open with a plain
  H1 and an all-bold subtitle line. Lift those two into document metadata
  so the PDF gets a real title page, and drop them from the body so the
  title does not appear twice.
--------------------------------------------------------------------------]]

local function is_bold_only(block)
  if block.t ~= "Para" then return false end
  local strong = nil
  for _, inline in ipairs(block.content) do
    if inline.t == "Strong" then
      if strong then return false end
      strong = inline
    elseif inline.t ~= "Space" and inline.t ~= "SoftBreak" then
      return false
    end
  end
  return strong ~= nil and strong.content or false
end

function Pandoc(doc)
  local blocks = doc.blocks

  if blocks[1] and blocks[1].t == "Header" and blocks[1].level == 1 then
    if not doc.meta.title then
      doc.meta.title = pandoc.MetaInlines(blocks[1].content)
    end
    table.remove(blocks, 1)

    local subtitle = blocks[1] and is_bold_only(blocks[1])
    if subtitle and not doc.meta.subtitle then
      doc.meta.subtitle = pandoc.MetaInlines(subtitle)
      table.remove(blocks, 1)
    end
  end

  return pandoc.Pandoc(blocks, doc.meta)
end
