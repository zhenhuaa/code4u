import { OpenAPI3 } from "../types";
import { comment, tsUnionOf } from "../utils";

export function transServersToType(schema: OpenAPI3) {
  if (!schema.servers) return "";
  const servers = schema.servers;
  const codeLines: string[] = [];
  let i = 0;
  const serverNames: string[] = [];
  for (let s of servers) {
    let serverComment = "";
    if (s.description) {
      serverComment = comment(s.description);
    }
    const serverName = `Server${i}`;
    serverNames.push(serverName);
    const line = `${serverComment}type ${serverName} = "${s.url}";`;
    codeLines.push(line);
    i += 1;
  }

  if (serverNames.length > 0) {
    const line = `export type Servers = ${tsUnionOf(serverNames)};\n\n`;
    codeLines.push(line);
  }
  const code = codeLines.join("\n");
  return code;
}

export function transServers(schema: OpenAPI3) {
  const { code } = transServersToEnum(schema);
  return code;
}

export function getFirstServerEnum(schema: OpenAPI3) {
  const {serverNames} = transServersToEnum(schema)
  return serverNames[0] || ""
}

export function transServersToEnum(schema: OpenAPI3) {
  const result = { serverNames: [], code: "" };
  if (!schema.servers) return result;
  const servers = schema.servers;
  const enumLines: string[] = [];
  let i = 0;
  const serverNames: string[] = [];
  for (let s of servers) {
    let serverComment = "";
    if (s.description) {
      serverComment = comment(s.description);
    }
    const serverName = `Server${i}`;
    serverNames.push(serverName);
    const line = `${serverComment}${serverName} = "${s.url}",`;
    enumLines.push(line);
    i += 1;
  }

  if (serverNames.length > 0) {
    const fstLine = "export enum EServers {";
    const endLine = "}\n\n";
    const codeLines = [fstLine, ...enumLines, endLine];
    const code = codeLines.join("\n");
    return { serverNames: serverNames, code: code };
  }
  return result
}
