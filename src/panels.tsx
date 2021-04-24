import { Controlled as CodeMirror } from "react-codemirror2";

interface InputProps {
  value: string;
  setValue: (val: string) => void;
}

export function InputPanel(props: InputProps) {
  function onBeforeChange(editor: any, data: any, value: string) {
    props.setValue(value);
  }

  return (
    <div className="editor">
      <CodeMirror
        value={props.value}
        onBeforeChange={onBeforeChange}
        options={{
          mode: {
            name: "application/json",
          },
          lineNumbers: true,
          theme: "default",
        }}
      />
    </div>
  );
}

function onCodeNoChange() {}

interface OutputProps {
  value: string;
}

export function OutPutPanel(props: OutputProps) {
  return (
    <div className="editor">
      <CodeMirror
        onBeforeChange={onCodeNoChange}
        value={props.value}
        options={{
          mode: "application/typescript",
          lineNumbers: true,
          theme: "default",
          readOnly: true,
        }}
      />
    </div>
  );
}
