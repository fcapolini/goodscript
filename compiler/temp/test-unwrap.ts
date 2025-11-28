function test(): string {
  const x: string | null = "hello";
  
  if (x !== null) {
    return x + " world";
  }
  
  return "";
}
