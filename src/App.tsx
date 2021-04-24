import "./App.css";
import { ToolBar } from "./toolBar";
import { InputPanel, OutPutPanel } from "./panels";
import { useMemo, useState } from "react";
import swaggerToTS from "./lib/openapi-typescript";
import { tinyCorrect } from "./lib/standardOpenApi";

function App() {
  const [input, setInput] = useState("");

  const inputSchema = useMemo(() => {
    try {
      return JSON.parse(input);
    } catch (err) {
      return null;
    }
  }, [input]);

  const genCode = useMemo(() => {
    if (!inputSchema) return "";
    const schema = tinyCorrect(inputSchema);
    const tsCode = swaggerToTS(schema, { version: 3 });
    return tsCode;
  }, [inputSchema]);

  return (
    <div className="playground-container">
      <ToolBar setInput={setInput}></ToolBar>
      <div className="editors-container">
        <div className="editors">
          <InputPanel value={input} setValue={setInput}></InputPanel>
          <OutPutPanel value={genCode}></OutPutPanel>
        </div>
      </div>
    </div>
  );
}

export default App;
