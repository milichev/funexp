import {
  DEFAULT_CTX_VAR,
  DEFAULT_ENTRY_PREFIX,
  fun,
  FunExpResult,
  makeFun,
} from "../index";

describe("funexp", () => {
  it("should export proper things", () => {
    expect(fun).toEqual(expect.any(Function));
    expect(makeFun).toEqual(expect.any(Function));
    expect(DEFAULT_CTX_VAR).toEqual("ctx");
    expect(DEFAULT_ENTRY_PREFIX).toEqual("_e");
  });

  it("should return an object describing the expression without any interpolations", () => {
    expect(fun`exp`).toEqual<FunExpResult>({
      src: "exp",
      ctx: {},
    });
  });

  it("should interpolate placeholder values", () => {
    const method1 = () => undefined;
    const method2 = () => undefined;

    expect(fun`${method1}; ${method2}(model);`).toEqual<FunExpResult>({
      src: "ctx._e0; ctx._e1(model);",
      ctx: { _e0: method1, _e1: method2 },
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

    expect(toDate).toHaveBeenCalledWith(createdOn);
    expect(calcTotal).toHaveBeenCalledWith(100, 0.75);
    expect(result).toBe(model);
    expect(result.createdOn).toEqual(new Date(createdOn));
    expect(result.total).toEqual(75);
  });
});
