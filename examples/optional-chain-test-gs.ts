// Test optional chaining
// GoodScript test for Phase 7a.5

interface Options {
  method: string;
  timeout: number;
  headers: Map<string, string>;
}

function test1(): void {
  const options: Options | null = null;
  
  // Optional property access
  const method = options?.method || 'GET';
  console.log('Method:', method);
}

function test2(): void {
  const options: Options = {
    method: 'POST',
    timeout: 5000,
    headers: new Map<string, string>()
  };
  
  // Optional chaining with non-null value
  const method = options?.method || 'GET';
  const timeout = options?.timeout;
  console.log('Method:', method, 'Timeout:', timeout);
}

function test3(): void {
  const options: Options | null = {
    method: 'PUT',
    timeout: 3000,
    headers: new Map<string, string>()
  };
  
  // Optional chaining in conditional
  if (options?.headers) {
    console.log('Has headers');
  }
  
  // Nested optional chaining
  const hasAuth = options?.headers?.has('Authorization');
  console.log('Has auth:', hasAuth);
}

test1();
test2();
test3();
