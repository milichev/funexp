import {
  DEFAULT_CTX_VAR,
  DEFAULT_ENTRY_PREFIX,
  fun,
  FunExp,
  makeFun,
} from "../index";

describe("funtplexp", () => {
  it("should export proper things", () => {
    expect(fun).toEqual(expect.any(Function));
    expect(makeFun).toEqual(expect.any(Function));
    expect(DEFAULT_CTX_VAR).toEqual("ctx");
    expect(DEFAULT_ENTRY_PREFIX).toEqual("$e_");
  });

  it("should return an object describing the expression without any interpolations", () => {
    expect(fun`exp`).toEqual<FunExp>({
      src: "exp",
      ctx: {},
    });
  });

  it("should interpolate placeholder values", () => {
    const method1 = () => undefined;
    const method2 = () => undefined;
    const bool = true;
    const str = "str";
    const num = 3.14;
    const nul = null;

    expect(
      fun`${method1}; ${method2}(model, ${bool}, ${str}, ${num}, ${nul});`
    ).toEqual<FunExp>({
      src: `ctx.$e_0; ctx.$e_1(model, true, "str", 3.14, null);`,
      ctx: { $e_0: method1, $e_1: method2 },
    });
  });

  it("should not inline primitives", () => {
    const myExp = makeFun({ inlinePrimitives: false });
    const bool = true;
    const str = "str";
    const num = 3.14;
    const nul = null;

    expect(myExp`${bool}, ${str}, ${num}, ${nul};`).toEqual<FunExp>({
      src: `ctx.$e_0, ctx.$e_1, ctx.$e_2, ctx.$e_3;`,
      ctx: {
        $e_0: bool,
        $e_1: str,
        $e_2: num,
        $e_3: null,
      },
    });
  });

  it("should reuse same interventions", () => {
    const method1 = () => 1;
    expect(fun`return {
      a: ${method1}(),
      b: ${method1}(),
      c: ${method1}(),
      d: ${method1}(),
    };`).toEqual<FunExp>({
      src: `return {
      a: ctx.$e_0(),
      b: ctx.$e_0(),
      c: ctx.$e_0(),
      d: ctx.$e_0(),
    };`,
      ctx: {
        $e_0: method1,
      },
    });
  });

  it("should iterate each value", () => {
    const model = {
      a: 1,
      b: 2,
      c: 3,
    };
    const props: ReadonlyArray<keyof typeof model> = ["a", "b", "c"];

    const actual = fun.each(props)`log(model.${"%s"});`;

    expect(actual).toEqual<FunExp>({
      src: "log(model.a);log(model.b);log(model.c);",
      ctx: {},
    });
  });

  it("should be usable for real case", () => {
    // Define a method that is used in the function expression.
    const toDate = jest.fn((value: Date | string | number) => new Date(value));
    // You can pass to the expression whatever you need, not only functions:
    // literal values, objects, dates, regexp, you name it.
    const discount = 0.75;
    const calcTotal = jest.fn(
      (price: number, discount: number) => price * discount
    );

    // Use the factory to create a customized tagged expression processor.
    // Essentially, it only used to change the variable names in the resulting function source.
    // Therefore, if you are OK with the default ctxVar and entryPrefix, use the default processor `fun`.
    const myExpr = makeFun({ ctxVar: "methods", entryPrefix: "$m_" });

    // Process the tagged expression passing whatever you need in it,
    // and get the function source and the context dictionary with the passed arguments.
    const exp = myExpr`
model.createdOn = ${toDate}(model.createdOn);
model.total = ${calcTotal}(model.price, ${discount});
return model;`;

    // console.log(exp);
    // return;
    // From the composed expression, compile a function and pass the context object to it.
    const patcher = new Function("methods", "model", exp.src).bind(
      null,
      exp.ctx
    );

    // just a test data
    const createdOn = "2023-05-26T14:04:08.023Z";
    const model = { createdOn, price: 100 };

    // here you are, call the highly performant function, which is composed just the way you need
    const result = patcher(model);

    expect(calcTotal).toHaveBeenCalledWith(100, 0.75);
    expect(toDate).toHaveBeenCalledWith(createdOn);
    expect(result).toBe(model);
    expect(result.createdOn).toEqual(new Date(createdOn));
    expect(result.total).toEqual(75);
  });
});
