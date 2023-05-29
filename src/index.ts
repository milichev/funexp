/**
 * Describes a function expression that was translated by {@link TplFun} form a template literal.
 */
export interface FunExp {
  /**
   * A function source translated from the template literal.
   */
  src: string;

  /**
   * A map of template literal arguments, where
   * the argument's key in the map corresponds to its reference
   * in {@link src}.
   */
  ctx: Record<string, any>;
}

/**
 * Represents a tag function accepting a template literal with arguments injected,
 * and returning {@link FunExp} describing a function expression.
 */
type TplFun = (tpl: TemplateStringsArray, ...args: readonly any[]) => FunExp;

/**
 * Helper method for applying the same template to each element of `values` array.
 * To reference the item, a `"%s"` placeholder is used.
 *
 * @example
 *  fun.each(["a", "b", "c"])`log(model.${"%s"});`
 *  // {
 *  //    src: "log(model.a);log(model.b);log(model.c);",
 *  //    ctx: {},
 *  // }
 */
type Each = (values: readonly any[]) => TplFun;

/**
 * Represents a {@link TplFun}, where the context variable name
 * and the context's key prefix are customized via
 * the {@link makeFun} factory (or left default, as with {@link fun}),
 * and the `each` method is available.
 */
export type Fun = TplFun & {
  each: Each;
};

/**
 * Name of the context object variable in the resulting expression.
 */
export const DEFAULT_CTX_VAR = "ctx";

/**
 * A prefix for the context object keys.
 */
export const DEFAULT_ENTRY_PREFIX = "$e_";

/**
 *
 */
export const DEFAULT_INLINE_PRIMITIVES = true;

export interface TplFunOptions {
  /**
   * Optional. Name of the context object variable in the resulting expression.
   * If not provided, {@link DEFAULT_CTX_VAR} value is used (`"ctx"`).
   */
  ctxVar?: string;

  /**
   * Optional. A prefix for the context object keys.
   * If not provided, {@link DEFAULT_ENTRY_PREFIX} value is used (`"$e_"`).
   */
  entryPrefix?: string;

  /**
   * Optional. Whether the primitive arguments such as strings and numbers should be inlined in the expression.
   * If `false`, the primitive value is stored in the context object and referenced from the resulting expression.
   * If not provided, {@link DEFAULT_INLINE_PRIMITIVES} value is used (`true`).
   */
  inlinePrimitives?: boolean;
}

/**
 * A factory. Accepts options for customizing and returns an instance
 * of {@link Fun} tag function.
 *
 * @param ctxVar Optional. Name of the context object variable in the resulting expression. If not provided, {@link DEFAULT_CTX_VAR} value is used.
 * @param entryPrefix Optional. A prefix for the context object keys. If not provided, {@link DEFAULT_ENTRY_PREFIX} value is used.
 * @param inlinePrimitives Optional. Whether the primitive arguments such as strings and numbers should be inlined in the expression.
 *   If `false`, the primitive value is stored in the context object and referenced from the resulting expression.
 *   If not provided, {@link DEFAULT_INLINE_PRIMITIVES} value is used (`true`).
 */
export const makeFun = ({
  ctxVar = DEFAULT_CTX_VAR,
  entryPrefix = DEFAULT_ENTRY_PREFIX,
  inlinePrimitives = DEFAULT_INLINE_PRIMITIVES,
}: TplFunOptions = {}): Fun => {
  const makeTpl =
    (values?: readonly any[]): TplFun =>
    (tpl, ...args): FunExp => {
      const intervents = new Map<any, string>();
      const result: FunExp = { src: "", ctx: {} };

      const runTpl = (value?: any) =>
        tpl.forEach((str, i) => {
          result.src += str;
          if (args.length > i) {
            const arg = args[i];
            if (arg === "%s") {
              result.src += value;
            } else if (shouldInline(arg)) {
              result.src += JSON.stringify(arg);
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

  const shouldInline = (arg: any) => {
    if (!inlinePrimitives) {
      return false;
    }
    const typeOfArg = typeof arg;
    return (
      typeOfArg === "string" ||
      (typeOfArg === "number" && !Number.isNaN(arg)) ||
      typeOfArg === "boolean" ||
      arg === null
    );
  };

  const each: Each = (values) => makeTpl(values);

  return Object.assign(makeTpl(), { each });
};

/**
 * Tag function implementing the {@link TplFun} functionality.
 * Accepts a template literal with arguments injected,
 * and returns a {@link FunExp} describing a function expression.
 *
 * @example
 *    // template literal arguments
 *    const calcTotal = (model: Model, discount: number) => model.price * discount;
 *    const processModel = (model: Model) => doSomethingWithTheModel(model);
 *    const discount = 0.75;
 *
 *    // creating the expression
 *    const exp = fun`
 *    model.total = ${calcTotal}(model, ${discount});
 *    return ${processModel}(model);`;
 *    // {
 *   //   src: `
 *   //     model.total = ctx.$e_0(model, ctx.$e_1);
 *   //     return ctx.$e_2(model);",
 *   //   ctx: { $e_0: calcTotal, $e_1: 0.75, $e_2: processModel },
 *   // }
 *
 *    // compile a function, binding the context object.
 *    const fn = new Function("ctx", "model", exp.src).bind(null, exp.ctx);
 *
 *    // use the resulting function, pass a model argument and get it processed
 *    console.log(fn(model));
 */
export const fun = makeFun();
