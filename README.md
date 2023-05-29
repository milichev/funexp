# funtplexp

> A simple template function expression generator.

## Installation

NPM:

```shell
npm install funtplexp
```

Yarn:

```shell
yarn add funtplexp
```

## Usage

With this tiny tagged expression processor, you can create a highly performant functions in runtime.

```typescript
// template literal arguments
const calcTotal = (model: Model, discount: number) => model.price * discount;
const processModel = (model: Model) => doSomethingWithTheModel(model);
const discount = 0.75;

// creating the expression
const exp = fun`
    model.total = ${calcTotal}(model, ${discount});
    return ${processModel}(model);`;
// {
//   src: `
//     model.total = ctx.$e_0(model, ctx.$e_1);
//     return ctx.$e_2(model);`,
//   ctx: { $e_0: calcTotal, $e_1: 0.75, $e_2: processModel },
// }

// compile a function, binding the context object.
const fn = new Function("ctx", "model", exp.src).bind(null, exp.ctx);

// use the resulting function, pass a model argument and get it processed
console.log(fn(model));
```

### Example: making a data model processor

Here, we create a function that accepts a model object and patches its
properties:

- changes the `createdOn` type to `Date`;
- calculates the `total` value.

```typescript
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
const patcher = new Function("methods", "model", exp.src).bind(null, exp.ctx);

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
```

### Example: processing an array of arguments with the same template

Using the method `each(values: any[])`, you can apply the same template to each value.

To inject the next value to the template, use the placeholder `"%s"` as follows:

```typescript
const model = {
  a: 1,
  b: 2,
  c: 3,
};
const props: ReadonlyArray<keyof typeof model> = ["a", "b", "c"];

const actual = fun.each(props)`log(model.${"%s"});`;

expect(actual).toEqual<FunExpResult>({
  src: "log(model.a);log(model.b);log(model.c);",
  ctx: {},
});
```
