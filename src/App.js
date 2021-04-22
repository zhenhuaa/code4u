import "./App.css";
import { Controlled as CodeMirror } from "react-codemirror2";

function App() {
  return (
    <div className="playground-container">
      <div className="editors-container">
        <div className="editors">
          <div className="editor">
            <CodeMirror
              value="sample code"
              options={{
                mode: "javascript",
                lineNumbers: true,
                theme: "xq-light",
              }}
            />
          </div>
          <div className="editor">
            <CodeMirror
              value="sample code2 test"
              options={{
                mode: "javascript",
                lineNumbers: true,
                theme: "xq-light",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
