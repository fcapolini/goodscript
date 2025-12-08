/**
 * Exception handling test for GoodScript
 */

export function testThrow(): void {
  throw new Error("test error");
}

export function testTryCatch(): string {
  try {
    const x: number = 42;
    return "success";
  } catch (error) {
    return "caught";
  }
}

export function testTryCatchFinally(): string {
  let result: string = "";
  try {
    result = "try";
  } catch (error) {
    result = "catch";
  } finally {
    console.log("finally");
  }
  return result;
}

export function main(): void {
  // Test try-catch
  const result: string = testTryCatch();
  console.log("Result:", result);
  
  // Test try-catch-finally
  const result2: string = testTryCatchFinally();
  console.log("Result2:", result2);
}
