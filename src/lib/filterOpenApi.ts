import { PathItemObject } from "openapi-typescript";
import _ from "lodash";
import { httpMethods } from "./constants";
import { OpenApiSchema } from "./types";
import {getComponentRef} from "./openapi-typescript/utils";

export function cloneOpenApi(openApi: OpenApiSchema): OpenApiSchema {
  return JSON.parse(JSON.stringify(openApi));
}

function getRegex(re: string) {
  try {
    const regex = new RegExp(re, "i");
    return regex;
  } catch (err) {
    console.error("Invalid Regex");
    return null;
  }
}

function getReferTags(paths: PathItemObject[]): string[] {
  const newTags = paths.flatMap((p) => {
    const tags: string[] = [];
    for (let m of httpMethods) {
      let refTags = _.get(p, m + ".tags");
      if (_.isArray(refTags)) {
        tags.push(...refTags);
      }
    }
    return tags;
  });
  return newTags;
}

export function filterOpenApi(schema: OpenApiSchema, grepRegex: string): OpenApiSchema {
  if (!grepRegex) return schema;
  const regex = getRegex(grepRegex);
  if (!regex) return schema;
  if (schema.paths) {
    const checkMatch = (p: string) => regex.test(p);
    const paths = filterPaths(schema.paths, checkMatch);
    const newSchema = cloneOpenApi(schema);
    newSchema.paths = paths;
    const referTags = getReferTags(_.values(paths));
    if (schema.tags) {
      newSchema.tags = schema.tags.filter((r) => referTags.includes(r.name));
    }
    const components = newSchema.components;
    if (components) {
      const refs = getAllRefs(paths, components);
      const newComp = rebuildComponents(components, refs);
      newSchema.components = newComp;
    }
    return newSchema;
  } else {
    return schema;
  }
}

function filterPaths(
  r: Record<string, PathItemObject>,
  predict: (e: string) => boolean
): Record<string, PathItemObject> {
  const keys = Object.keys(r).filter((k) => {
    if (predict(k)) {
      return true;
    }
    for (let m of httpMethods) {
      if (r[k][m]) {
        const tags = _.get(r[k], `${m}.tags`) || [];
        const isTagMatch = _.some(tags, predict);
        if (isTagMatch) {
          return isTagMatch;
        }

        const operationId: string = _.get(r[k], `${m}.operationId`);
        if (predict(operationId)) {
          return true;
        }
      }
    }
  });
  return keys.reduce((ret, k) => {
    ret[k] = r[k];
    return ret;
  }, {} as Record<string, PathItemObject>);
}

function getAllRefs(openApi: object, components: OpenApiSchema["components"]) {
  const allRefs: string[] = [];

  function walk(obj: any) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    } else if (_.isArray(obj)) {
      for (let e of obj) {
        walk(e);
      }
    } else {
      for (let key of Object.keys(obj)) {
        if (key === "$ref") {
          const refKey = getComponentRef(obj[key]);
          allRefs.push(refKey);
          const refObj = _.get(components, refKey);
          if (refObj) {
            walk(refObj);
          }
        }
        walk(obj[key]);
      }
    }
  }
  walk(openApi);
  return allRefs;
}

export function rebuildComponents(
  components: OpenApiSchema["components"],
  refKeys: string[]
): OpenApiSchema["components"] {
  const result = {};
  for (let path of refKeys) {
    _.set(result, path, _.get(components, path));
  }
  return result;
}
