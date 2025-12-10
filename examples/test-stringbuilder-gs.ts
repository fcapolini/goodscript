// Test StringBuilder optimization
function testStringBuilder(): string {
  let result: string = "";
  
  for (let i: integer = 0; i < 10; i = i + 1) {
    result = result + "x";
  }
  
  return result;
}

console.log(testStringBuilder());
