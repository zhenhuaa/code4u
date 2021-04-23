import _ from "lodash";
import { httpMethods } from "./constants";
import { OpenApiSchema } from "./types";

export function tinyCorrect(schema: OpenApiSchema) {
  const paths = schema.paths;
  _.each(paths, (p, pathKey) => {
    for (let m of httpMethods) {
      const desc = p[m]?.description;
      const summary = p[m]?.summary;
      const operationId = p[m]?.operationId;
      if (summary && !desc) {
        // set api description when only exist summary
        _.set(p, m + ".description", summary);
      }
      if (p[m] && !operationId) {
        const myKey = _.camelCase((m + pathKey).replace(/\//g, "_"));
        _.set(p, m + ".operationId", myKey);
      }
    }
  });

  return schema;
}
