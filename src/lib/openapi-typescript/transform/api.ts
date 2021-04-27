import _ from "lodash";
import {
  HttpMethod,
  OpenAPI3,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBody,
  SchemaObject,
} from "../types";
import { httpMethods } from "../../constants";
import { getRefObject, tsIntersectionOf, comment } from "../utils";

function upperCamelCase(tag: string) {
  const ret = _.camelCase(tag);
  if (ret[0]) {
    return ret[0].toUpperCase() + ret.substr(1);
  }
  return ret;
}

function getBaseUrl(servers: OpenAPI3["servers"]) {
  if (servers && servers.length > 0) {
    return servers[0].url;
  }
  return "";
}

export function getTypeParamsList(
  params: (ReferenceObject | ParameterObject)[] | undefined,
  type: "path" | "query",
  schema: OpenAPI3
): PathItemObject[] {
  if (!params) return [];
  const list: PathItemObject[] = [];
  for (let p of params) {
    let item: ParameterObject = p as ParameterObject;
    if ("$ref" in p) {
      const refP = getRefObject<ParameterObject>(p.$ref, schema.components);
      item = refP;
    }
    if (item.in === type) {
      list.push(item);
    }
  }
  return list;
}

export function getPathParamsList(
  params: (ReferenceObject | ParameterObject)[] | undefined,
  schema: OpenAPI3
): PathItemObject[] {
  return getTypeParamsList(params, "path", schema);
}

export function getQsList(
  params: (ReferenceObject | ParameterObject)[] | undefined,
  schema: OpenAPI3
): PathItemObject[] {
  return getTypeParamsList(params, "query", schema);
}

export function getReqBody(reqBody: ReferenceObject | RequestBody | undefined, schema: OpenAPI3): RequestBody | null {
  if (!reqBody) return null;
  if ("$ref" in reqBody) {
    return getRefObject<RequestBody>(reqBody.$ref, schema.components);
  } else {
    return reqBody;
  }
}

type TagOpMap = Record<string, OperationObject[]>;

type AllTypeParams = [PathItemObject[], PathItemObject[], RequestBody];


function getAllTypeReqParams(op: OperationObject, schema: OpenAPI3): AllTypeParams {
  const qsList = getQsList(op.parameters, schema);
  const pathList = getPathParamsList(op.parameters, schema);
  const reqBody = getReqBody(op.requestBody, schema);
  const result = [pathList, qsList, reqBody] as AllTypeParams;
  return result
}

function getReqUnionTypes(op: OperationObject, schema: OpenAPI3): string[] {
  const fn = op.operationId as string;

  const unionTypes: string[] = [];

  const [pathList, qsList, reqBody] = getAllTypeReqParams(op, schema);

  if (!_.isEmpty(qsList)) {
    const qsType = `operations["${fn}"]["parameters"]["query"]`;
    unionTypes.push(qsType);
  }

  if (!_.isEmpty(pathList)) {
    const pathType = `operations["${fn}"]["parameters"]["path"]`;
    unionTypes.push(pathType);
  }

  if (reqBody) {
    const hasJsonBody = isContainJsonSchema(reqBody, schema);
    if (hasJsonBody) {
      const bodyType = `operations["${fn}"]["requestBody"]["content"]["application/json"]`;
      unionTypes.push(bodyType);
    }
  }

  return unionTypes;
}

function transReqNs(tagOpMap: TagOpMap, schema: OpenAPI3) {
  const lines: string[] = [];
  for (const [tag, ops] of Object.entries(tagOpMap)) {
    const nsLines: string[] = [];
    for (let op of ops) {
      const fn = op.operationId as string;
      const typeName = upperCamelCase(fn);
      const unionTypes = getReqUnionTypes(op, schema);
      if (unionTypes && unionTypes.length > 0) {
        const refType = tsIntersectionOf(unionTypes);
        nsLines.push(`export type ${typeName} = ${refType}`);
      }
    }
    const ns = tag + "Req";
    lines.push(...wrapToNameSpaceLines(nsLines, ns));
  }
  const reqNsCode = lines.join("\n");
  return reqNsCode;
}

function wrapToNameSpaceLines(nsLines: string[], ns: string) {
  let lines: string[] = [];
  if (nsLines && nsLines.length > 0) {
    const fstLine = `\nexport namespace ${ns} {`;
    const lstLine = "}\n\n";
    lines = [fstLine, ...nsLines, lstLine];
  }
  return lines;
}

function isAnyOfOrOneOfOrAllOf(node: object) {
  const isAnyOfOrOneOfOrAllOf = "anyOf" in node || "oneOf" in node || "allOf" in node;
  return isAnyOfOrOneOfOrAllOf;
}

function isContainJsonSchema(obj: SchemaObject, schema: OpenAPI3) {
  if (!obj) return false;
  const deepGetKey = "content.application/json.schema";
  const refObj: SchemaObject | ReferenceObject = _.get(obj, deepGetKey);

  let schemaObj = refObj || {};
  if ("$ref" in schemaObj) {
    const resSchema: SchemaObject = getRefObject(schemaObj.$ref, schema.components) || {};
    schemaObj = resSchema;
  }
  const hasRes =
    isAnyOfOrOneOfOrAllOf(schemaObj || {}) ||
    !!schemaObj.type ||
    !!schemaObj.properties ||
    !!schemaObj.additionalProperties;
  return hasRes;
}

function isHas200JsonResponse(op: OperationObject, schema: OpenAPI3): boolean {
  let response = _.get(op, "responses.200");
  if (!response) return false;
  if ("$ref" in response) {
    response = getRefObject(response.$ref, schema.components);
  }
  const hasRes = isContainJsonSchema(response, schema);
  return hasRes;
}

function transResNs(tagNsMap: TagOpMap, schema: OpenAPI3) {
  const lines: string[] = [];
  for (const [tag, ops] of Object.entries(tagNsMap)) {
    const nsLines: string[] = [];
    for (let op of ops) {
      const fn = op.operationId as string;
      const refType = upperCamelCase(fn);
      const has200Json = isHas200JsonResponse(op, schema);
      if (has200Json) {
        const code = `export type ${refType} = operations["${fn}"]["responses"]["200"]["content"]["application/json"]`;
        nsLines.push(code);
      }
    }
    const ns = tag + "Res";
    lines.push(...wrapToNameSpaceLines(nsLines, ns));
  }
  const reqNsCode = lines.join("\n");
  return reqNsCode;
}

function genFunCode(tag: string, url: string, m: HttpMethod, operation: OperationObject, schema: OpenAPI3) {
  function getReturnType() {
    let retType = "unknown";
    const has200Json = isHas200JsonResponse(operation, schema);
    if (has200Json) {
      retType = `${resNs}.${refType}`;
    }
    return retType;
  }

  function getParameters() {
    let parameters = "";
    const unionTypes = getReqUnionTypes(operation, schema);
    if (!_.isEmpty(unionTypes)) {
      parameters = `params: ${reqNs}.${refType}`;
    }
    return parameters;
  }

  function getUrlLine(pathParams: PathItemObject[]) {
    if (pathParams.length > 0) {
      /* eslint-disable no-template-curly-in-string*/
      url = url.replace(/{([a-zA-Z_]+)}/g, "${params.$1}");
      return `url: \`${url}\`,`;
    } else {
      return `url: "${url}",`;
    }
  }

  function getFnStart() {
    let fnComment = "";
    if (operation.description) {
      fnComment = comment(operation.description);
    }
    return `${fnComment}export async function ${fn}(${parameters}): Promise<${retType}> {`;
  }

  function getParamDataLine(qsList: PathItemObject[], body: RequestBody, fn: string) {
    let line = "";
    // console.log(qsList, body, "fn");
    if (!_.isEmpty(qsList)) {
      line += "params: params,\n";
    }
    if (body) {
      line += "data: params\n";
    }
    return line;
  }

  const fn = operation.operationId;
  if (!fn) return "";
  const reqNs = `${tag}Req`;
  const resNs = `${tag}Res`;
  const refType = upperCamelCase(fn);
  let parameters = getParameters();
  let retType = getReturnType();
  const fnLine: string[] = [];

  const fnStart = getFnStart();
  const fnEnd = "}\n";

  const [pathList, qsList, reqBody] = getAllTypeReqParams(operation, schema);

  fnLine.push(fnStart);
  fnLine.push(`const data = await request({`);
  const method = _.upperCase(m);
  fnLine.push(`method: "${method}",`);
  const urlLine = getUrlLine(pathList);
  fnLine.push(urlLine);
  fnLine.push(getParamDataLine(qsList, reqBody, fn));
  fnLine.push("})");
  fnLine.push(`const result: ${retType} = data.data\nreturn result`);
  fnLine.push(fnEnd);
  const funcCode = fnLine.join("\n");
  return funcCode;
}

function transRequestLibCode(schema: OpenAPI3) {
  const axiosLines = [];
  const baseUrl = getBaseUrl(schema.servers);
  axiosLines.push('import axios from "axios"\n');
  axiosLines.push("const request = axios.create({");
  axiosLines.push(`baseURL: "${baseUrl}"`);
  axiosLines.push("})\n\n");
  const axiosCode = axiosLines.join("\n");
  return axiosCode;
}

export function transApiStub(schema: OpenAPI3): string {
  let output = "";
  const tagNsMap: TagOpMap = {};

  const apiFnCode = genApiFnCode(schema, tagNsMap);

  // generate req namespace code
  const reqNsCode = transReqNs(tagNsMap, schema);
  output += reqNsCode;

  // generate res namespace code
  const resNsCode = transResNs(tagNsMap, schema);
  output += resNsCode;

  // gen axios code
  if (apiFnCode) {
    const axiosCode = transRequestLibCode(schema);
    output += axiosCode;
  }

  // generate api stub code
  output += apiFnCode;

  return output;
}

function genApiFnCode(schema: OpenAPI3, tagNsMap: TagOpMap) {
  const paths = schema.paths;
  if (!paths) return "";
  const apiStubLines: string[] = [];
  Object.entries(paths).forEach(([url, pathItem]) => {
    for (let m of httpMethods) {
      const operation = pathItem[m];
      if (!operation) continue;
      let tag = "";
      if (operation.tags) {
        tag = operation.tags[0];
      }
      tag = upperCamelCase(tag);

      const funcCode = genFunCode(tag, url, m, operation, schema);
      apiStubLines.push(funcCode);

      if (tagNsMap[tag]) {
        tagNsMap[tag].push(operation);
      } else {
        tagNsMap[tag] = [operation];
      }
    }
  });

  const code = apiStubLines.join("\n");
  return code;
}
