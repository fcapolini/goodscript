// Simple nested function test

function outer(): integer {
  function inner(x: integer): integer {
    return x * 2;
  }
  return inner(5);
}

console.log(outer());
