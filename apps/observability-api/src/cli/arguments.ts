export function parseArguments(values: string[]) {
  const result: Record<string, string | boolean> = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value?.startsWith("--")) throw new Error(`Unknown argument: ${value}`);
    const key = value.slice(2);
    if (["json", "include-email", "apply"].includes(key)) {
      result[key] = true;
      continue;
    }
    const next = values[++index];
    if (!next || next.startsWith("--")) throw new Error(`${value} requires a value.`);
    result[key] = next;
  }
  return result;
}

export function dateArgument(value: string | boolean | undefined, fallback: Date) {
  if (typeof value !== "string") return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed;
}
