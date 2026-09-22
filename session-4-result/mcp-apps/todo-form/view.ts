// No framework and no imports: the built file is the whole view, and every
// byte of it ships inside the one HTML document the host loads.

const titleInput = document.getElementById("todo-title") as HTMLInputElement;
const addButton = document.getElementById("add-todo") as HTMLButtonElement;
const statusLine = document.getElementById("status") as HTMLParagraphElement;
const openList = document.getElementById("open-todos") as HTMLUListElement;
const openEmpty = document.getElementById(
  "open-todos-empty",
) as HTMLParagraphElement;

/** Prefills the input — in step 24 with the title the tool was called with. */
export function setTitle(text: string) {
  titleInput.value = text;
  syncAddButton();
}

export function setStatus(text: string, kind: "info" | "error" = "info") {
  statusLine.textContent = text;
  statusLine.dataset.kind = kind;
}

export function renderOpenTodos(
  items: { id: number | string; title: string }[],
) {
  openList.replaceChildren(
    ...items.map((item) => {
      const row = document.createElement("li");
      row.dataset.id = String(item.id);
      // textContent, never innerHTML: a to-do title is someone's own text.
      row.textContent = item.title;
      return row;
    }),
  );
  openEmpty.hidden = items.length > 0;
}

/** An empty title is not a to-do, so the button says so before the click does. */
function syncAddButton() {
  addButton.disabled = titleInput.value.trim() === "";
}

// biome-ignore lint/correctness/noUnusedFunctionParameters: title gets its reader in step 24
function onSubmit(title: string) {
  // ---------------------------------------------------------------------
  // Step 24 plugs in here: connect the ext-apps `App`, take the initial
  // title from the tool input the host delivers, and call the server tool
  // with this one on submit. Until then nothing leaves the iframe.
  // ---------------------------------------------------------------------
  setStatus("Not connected to an MCP host yet.");
}

function submit() {
  const title = titleInput.value.trim();
  if (title === "") return;
  onSubmit(title);
}

titleInput.addEventListener("input", syncAddButton);
titleInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  // The view is one field, so Enter is the submit an outer <form> would give.
  event.preventDefault();
  submit();
});
addButton.addEventListener("click", submit);

syncAddButton();
renderOpenTodos([]);
