// 화면에서 쓸 것들을 찾아 둔다
const input = document.getElementById("todo-input");
const addButton = document.getElementById("add-button");
const list = document.getElementById("todo-list");
const emptyMessage = document.getElementById("empty-message");
const remainingCount = document.getElementById("remaining-count");

// 브라우저에 저장할 때 쓰는 이름
const STORAGE_KEY = "todos";

// 할 일 목록: { text: "할 일 내용", done: 끝냈는지, starred: 중요한지 } 가 여러 개
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

  // 별표 친 할 일을 맨 위로. 저장된 순서는 그대로 두고 보여 주는 순서만 바꾼다.
  const entries = todos.map(function (todo, index) {
    return { todo: todo, index: index };
  });
  const starredFirst = entries
    .filter(function (entry) {
      return entry.todo.starred;
    })
    .concat(
      entries.filter(function (entry) {
        return !entry.todo.starred;
      })
    );

  starredFirst.forEach(function (entry) {
    const todo = entry.todo;
    const index = entry.index;
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

    // 별표 버튼: 누르면 중요한 일이 된다
    const starButton = document.createElement("button");
    starButton.type = "button";
    starButton.className = "star-button";
    starButton.textContent = todo.starred ? "★" : "☆";
    starButton.setAttribute("aria-label", todo.text + " 중요 표시");
    starButton.setAttribute("aria-pressed", todo.starred ? "true" : "false");
    starButton.addEventListener("click", function () {
      todos[index].starred = !todos[index].starred;
      saveTodos();
      render();
    });

    // 삭제 버튼
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", function () {
      todos.splice(index, 1);
      saveTodos();
      render();
    });

    item.append(checkbox, text, starButton, deleteButton);
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
