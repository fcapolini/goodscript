const x: string | null = null;
const y: number | undefined = 42;
const z: boolean | null | undefined = true;

function test(a: string | null): number | null {
  if (a !== null) {
    return 123;
  }
  return null;
}
