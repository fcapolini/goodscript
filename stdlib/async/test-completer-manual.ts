import { Completer } from './src/completer-gs';

async function test() {
  console.log('Creating completer...');
  const completer = new Completer<number>();
  
  console.log('Getting promise...');
  const promise = completer.getPromise();
  
  console.log('Completing...');
  completer.complete(42);
  
  console.log('Awaiting...');
  const result = await promise;
  
  console.log('Result:', result);
}

test().catch(err => console.error('Error:', err));
