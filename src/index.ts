export interface FunExpResult {
  src: string;
  ctx: Record<string, any>;
}

export interface FunExpOptions {
  ctxVar?: string;
  entryPrefix?: string;
}

type FunTpl = (
  tpl: TemplateStringsArray,
  ...args: readonly any[]
) => FunExpResult;
type Each = (values: readonly any[]) => FunTpl;

export type Fun = FunTpl & {
  each: Each;
};

export const DEFAULT_CTX_VAR = "ctx";
export const DEFAULT_ENTRY_PREFIX = "_e";

export const makeFun = ({
  ctxVar = DEFAULT_CTX_VAR,
  entryPrefix = DEFAULT_ENTRY_PREFIX,
}: FunExpOptions = {}): Fun => {
  const makeTpl =
    (values?: readonly any[]): FunTpl =>
    (tpl, ...args): FunExpResult => {
      const intervents = new Map<any, string>();
      const result: FunExpResult = { src: "", ctx: {} };

      const runTpl = (value?: any) =>
        tpl.forEach((str, i) => {
          result.src += str;
          if (args.length > i) {
            const arg = args[i];
            if (arg === "%s") {
              result.src += String(value);
            } else {
              const entryKey = intervents.get(arg) ?? `${entryPrefix}${i}`;
              intervents.set(arg, entryKey);
              result.src += `${ctxVar}.${entryKey}`;
              result.ctx[entryKey] = args[i];
            }
          }
        });

      values ? values.forEach(runTpl) : runTpl();

      return result;
    };

  const each: Each = (values) => makeTpl(values);

  return Object.assign(makeTpl(), { each });
};

export const fun = makeFun();
