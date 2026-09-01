--[[ diagram.lua ---------------------------------------------------------
  Swap an ASCII-art code block for its rendered SVG.

  Convention: the paragraph introducing the diagram names the render, e.g.
      ... with the svgbob source in `images/architecture.bob` and the
      render in `images/architecture.svg`:
  The next unlabelled code block is then replaced by that SVG. If the file
  is missing the ASCII block is kept, so the Markdown always stands alone
  and nothing silently disappears.

  Only fires for unlabelled fences, so ```bash and friends are untouched.
--------------------------------------------------------------------------]]

local pending = nil   -- svg path announced by the last paragraph

local function exists(path)
  local f = io.open(path, "r")
  if f then f:close() return true end
  return false
end

function Para(el)
  pending = nil
  local text = pandoc.utils.stringify(el)
  for path in text:gmatch("[%w%._%-/]+%.svg") do
    if exists(path) then pending = path end
  end
  return nil
end

function Header(el) pending = nil; return nil end

function CodeBlock(el)
  local svg = pending
  pending = nil
  if not svg then return nil end
  if el.attr and #el.attr.classes > 0 then return nil end

  local img = pandoc.Image({}, svg, "", pandoc.Attr("", {}, {width = "100%"}))

  if FORMAT:match("latex") then
    -- Deliberately not a float: the diagram belongs where it was written,
    -- and floats are the classic source of "figure two pages later".
    return {
      pandoc.RawBlock("latex", "\\begin{center}"),
      pandoc.Para({img}),
      pandoc.RawBlock("latex", "\\end{center}"),
    }
  end
  return pandoc.Para({img})
end
