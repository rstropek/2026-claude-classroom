--[[ pagination.lua ------------------------------------------------------
  The storybooks use `---` to separate the major parts (intro, the steps,
  the closing step, the appendices). On paper that job is done better by a
  page break than by a rule floating mid-page.
--------------------------------------------------------------------------]]

function HorizontalRule()
  if not FORMAT:match("latex") then return nil end
  return pandoc.RawBlock("latex", "\\clearpage")
end
