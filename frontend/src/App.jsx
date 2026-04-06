import { useEffect, useState } from "react";
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const API_URL = "http://localhost:3000";

  const fetchTasks = () => {
    fetch(`${API_URL}/tasks`)
      .then(res => res.json())
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(fetchTasks, []);

  const addTask = (e) => {
    e.preventDefault();
    fetch(`${API_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: input })
    }).then(() => {
      setInput("");
      fetchTasks();
    });
  };

  return (
    <div className="container">
      <h1>Task Manager</h1>
      <form onSubmit={addTask}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="New Task" />
        <button type="submit">Add</button>
      </form>

      <ul>
        {tasks.map(task => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  )
}

export default App;