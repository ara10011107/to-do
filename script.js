// 화면에서 쓸 것들을 찾아 둔다
const input = document.getElementById("todo-input");
const addButton = document.getElementById("add-button");
const list = document.getElementById("todo-list");
const emptyMessage = document.getElementById("empty-message");
const remainingCount = document.getElementById("remaining-count");

// 브라우저에 저장할 때 쓰는 이름
const STORAGE_KEY = "todos";

// 할 일 목록: { text: "할 일 내용", done: 끝냈는지 } 가 여러 개
let todos = loadTodos();

// 저장해 둔 목록을 불러온다. 없거나 읽을 수 없으면 빈 목록.
function loadTodos() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

// 지금 목록을 브라우저에 저장한다
function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    // 저장할 수 없는 브라우저에서는 화면만 바뀐다
  }
}

// 목록을 화면에 다시 그린다
function render() {
  list.innerHTML = "";

  todos.forEach(function (todo, index) {
    const item = document.createElement("li");

    // 끝냈는지 표시하는 체크 칸
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.setAttribute("aria-label", todo.text + " 끝냄");
    checkbox.addEventListener("change", function () {
      todos[index].done = checkbox.checked;
      saveTodos();
      render();
    });

    // 할 일 내용
    const text = document.createElement("span");
    text.textContent = todo.text;

    // 삭제 버튼
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", function () {
      todos.splice(index, 1);
      saveTodos();
      render();
    });

    item.append(checkbox, text, deleteButton);
    list.append(item);
  });

  // 할 일이 하나도 없을 때만 안내 글을 보여 준다
  emptyMessage.hidden = todos.length > 0;

  // 끝내지 않은 할 일 개수
  const remaining = todos.filter(function (todo) {
    return !todo.done;
  }).length;
  remainingCount.textContent = "남은 할 일 " + remaining + "개";
}

// 추가 버튼을 누르면
addButton.addEventListener("click", function () {
  const text = input.value.trim();

  // 빈 칸이나 띄어쓰기만 있으면 추가하지 않는다
  if (text === "") {
    return;
  }

  todos.push({ text: text, done: false });
  saveTodos();
  render();
  input.value = "";
});

render();
