import { useState } from 'react';
import Button from './Button-gs';

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>React + GoodScript</h1>
      <p>Count: {count}</p>
      <Button label="Increment" onClick={() => setCount(count + 1)} />
    </div>
  );
};

export default App;
