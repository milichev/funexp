export interface FunExpResult {
  src: string;
  ctx: Record<string, any>;
}

export interface FunExpOptions {
  ctxVar?: string;
  entryPrefix?: string;
}

export type Fun = (tpl: TemplateStringsArray, ...args: any[]) => FunExpResult;

export const DEFAULT_CTX_VAR = "ctx";
export const DEFAULT_ENTRY_PREFIX = "_e";

export const makeFun =
  ({
    ctxVar = DEFAULT_CTX_VAR,
    entryPrefix = DEFAULT_ENTRY_PREFIX,
  }: FunExpOptions = {}): Fun =>
  (tpl, ...args): FunExpResult => {
    const intervents = new Map<any, string>();
    return tpl.reduce(
      (result, str, i) => {
        result.src += str;
        if (args.length > i) {
          const value = args[i];
          const entryKey = intervents.get(value) ?? `${entryPrefix}${i}`;
          intervents.set(value, entryKey);
          result.src += `${ctxVar}.${entryKey}`;
          result.ctx[entryKey] = args[i];
        }
        return result;
      },
      { src: "", ctx: {} } as FunExpResult
    );
  };

export const fun = makeFun();
