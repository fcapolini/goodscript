# Example: GoodScript + React + Vite

A minimal example showing how to set up a React project with GoodScript.

## Project Structure

```
my-react-app/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx              # Entry point (regular TS)
    ├── App.gs.tsx            # GoodScript component
    ├── components/
    │   ├── Button.gs.tsx     # GoodScript component
    │   └── Card.tsx          # Regular TS component (mixed)
    └── utils/
        └── helpers.gs.ts     # GoodScript utilities
```

## Setup Files

### package.json

```json
{
  "name": "my-react-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "goodscript": "^0.5.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "goodscript": {
    "level": "clean"
  },
  "include": ["src"]
}
```

### vite.config.ts

**Option 1: With Vite Plugin (Future)**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import goodscript from '@goodscript/vite-plugin';

export default defineConfig({
  plugins: [
    goodscript({
      level: 'clean'
    }),
    react()
  ],
  resolve: {
    extensions: ['.gs.tsx', '.gs.ts', '.tsx', '.ts', '.jsx', '.js']
  }
});
```

**Option 2: Pre-compilation (Available Now)**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js']
  }
});
```

With build scripts:
```json
{
  "scripts": {
    "gs:compile": "gsc --out-dir src",
    "predev": "npm run gs:compile",
    "dev": "vite",
    "prebuild": "npm run gs:compile",
    "build": "tsc && vite build"
  }
}
```

### index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GoodScript + React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Source Files

### src/main.tsx (Entry Point - Regular TypeScript)

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.gs';  // Import from GoodScript
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### src/App.gs.tsx (GoodScript)

```tsx
import { useState } from 'react';
import { Button } from './components/Button.gs';
import { Card } from './components/Card';  // Regular TS component

const App = () => {
  const [count, setCount] = useState(0);
  
  const handleIncrement = () => {
    setCount(count + 1);
  };
  
  const handleDecrement = () => {
    setCount(count - 1);
  };
  
  return (
    <div className="app">
      <h1>GoodScript + React</h1>
      
      <Card title="Counter">
        <p>Count: {count}</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button onClick={handleDecrement} label="−" />
          <Button onClick={handleIncrement} label="+" />
        </div>
      </Card>
    </div>
  );
};

export { App };
```

### src/components/Button.gs.tsx (GoodScript)

```tsx
interface ButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}

const Button = (props: ButtonProps) => {
  const disabled = props.disabled ?? false;
  
  const handleClick = () => {
    if (!disabled) {  // ✅ Explicit check (not truthy)
      props.onClick();
    }
  };
  
  return (
    <button 
      onClick={handleClick}
      disabled={disabled}
      className="button"
    >
      {props.label}
    </button>
  );
};

export { Button };
```

### src/components/Card.tsx (Regular TypeScript - Mixed)

```tsx
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
}

// Regular function declaration - OK in .tsx files
function Card(props: CardProps) {
  return (
    <div className="card">
      <h2>{props.title}</h2>
      <div className="card-content">
        {props.children}
      </div>
    </div>
  );
}

export { Card };
```

### src/utils/helpers.gs.ts (GoodScript Utilities)

```typescript
const formatNumber = (value: number): string => {
  return value.toString().padStart(2, '0');
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export { formatNumber, clamp };
```

## Running the Project

### Development

```bash
npm install
npm run dev
```

Navigate to `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## What GoodScript Enforces

In `.gs.tsx` and `.gs.ts` files:

✅ **Allowed:**
- Arrow functions only
- `const` and `let` (no `var`)
- Strict equality (`===`, `!==`)
- Explicit type checks
- Standard React hooks
- JSX syntax

❌ **Not Allowed:**
- Function declarations (`function Button() {}`)
- `var` keyword
- Loose equality (`==`, `!=`)
- Truthy/falsy checks (`if (value)`)
- `any` type
- Type coercion

## Gradual Migration

You can mix `.tsx` and `.gs.tsx` freely:

1. Start with one component: `Button.gs.tsx`
2. Keep existing code: `Card.tsx`
3. Gradually migrate: `App.tsx` → `App.gs.tsx`
4. No breaking changes to existing code

## Adding More Components

```tsx
// src/components/TodoItem.gs.tsx
interface TodoItemProps {
  id: number;
  text: string;
  completed: boolean;
  onToggle: (id: number) => void;
}

const TodoItem = (props: TodoItemProps) => {
  const handleClick = () => {
    props.onToggle(props.id);
  };
  
  return (
    <li 
      className={props.completed ? 'completed' : ''}
      onClick={handleClick}
    >
      {props.text}
    </li>
  );
};

export { TodoItem };
```

## Troubleshooting

### Build fails with "Cannot find module"

Make sure Vite resolves `.gs.tsx` extensions:

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    extensions: ['.gs.tsx', '.gs.ts', '.tsx', '.ts']
  }
});
```

### Hot reload doesn't work for .gs.tsx files

Currently, you need to refresh manually after changing `.gs.tsx` files. This will be fixed with the Vite plugin.

### Type errors in IDE but builds successfully

VS Code's TypeScript server may not recognize `.gs.tsx` files. This is expected - the build will work correctly.

## Next Steps

- Add CSS/styling
- Add React Router
- Add state management (Redux, Zustand, etc.)
- Deploy to Vercel/Netlify
- Progressively migrate more components to GoodScript

---

**Status**: This example uses pre-compilation. The Vite plugin (coming soon) will make the experience seamless.
