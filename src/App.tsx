import "./App.css";
import { ToolBar } from "./toolBar";
import { InputPanel, OutPutPanel } from "./panels";
import { useState } from "react";
import swaggerToTS, {OpenAPI3} from "openapi-typescript";

function App() {
  const [spec, setSpec] = useState("");
  const [genCode, setGenCode] = useState("");

  function updateTsCode(schema: OpenAPI3) {
    const tsCode = swaggerToTS(schema, { version: 3 });
    setGenCode(tsCode);
  }

  function useGenCode(schema: OpenAPI3) {
    const specCode = JSON.stringify(schema, null, 2)
    setSpec(specCode)
    updateTsCode(schema)
    return ''
  }

  return (
    <div className="playground-container">
      <ToolBar useGenCode={useGenCode}></ToolBar>
      <div className="editors-container">
        <div className="editors">
          <InputPanel value={spec} useGenCode={useGenCode}></InputPanel>
          <OutPutPanel value={genCode}></OutPutPanel>
        </div>
      </div>
    </div>
  );
}

export default App;
