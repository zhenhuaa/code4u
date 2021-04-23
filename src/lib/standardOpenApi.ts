import _ from "lodash";
import { httpMethods } from "./constants";
import { OpenApiSchema } from "./types";

export function tinyCorrect(schema: OpenApiSchema) {
  // set api description when only exist summary
  const paths = schema.paths;
  _.values(paths).flatMap((p) => {
    for (let m of httpMethods) {
      const desc = p[m]?.description;
      const summary = p[m]?.summary;
      if (summary && !desc) {
        _.set(p, m + ".description", summary);
      }
    }
    return null
  });
  return schema;
}
