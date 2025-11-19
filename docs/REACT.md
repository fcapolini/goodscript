# Using GoodScript with React

This guide explains how to use GoodScript (`.gs.tsx` files) in a React project.

## Quick Start

### 1. Install GoodScript

```bash
npm install --save-dev goodscript
```

### 2. Create GoodScript React Components

```tsx
// src/components/UserCard.gs.tsx
const UserCard = (props: { name: string; email: string }) => {
  return (
    <div className="user-card">
      <h2>{props.name}</h2>
      <p>{props.email}</p>
    </div>
  );
};

export { UserCard };
```

### 3. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true
  },
  "goodscript": {
    "level": "clean"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.gs.ts", "src/**/*.gs.tsx"]
}
```

## Integration Options

### Option 1: Pre-compilation Script (Available Now)

Compile GoodScript files to TypeScript before your build tool runs.

**Setup:**

```json
// package.json
{
  "scripts": {
    "gs:compile": "gsc --out-dir src",
    "prebuild": "npm run gs:compile",
    "build": "vite build",
    "predev": "npm run gs:compile",
    "dev": "vite dev"
  }
}
```

**How it works:**
1. `gsc` compiles `.gs.tsx` → `.tsx` files in the same directory
2. Vite/webpack picks up the generated `.tsx` files
3. Standard React build continues

**Pros:**
- Works with any build tool
- No additional plugins needed
- Available today

**Cons:**
- Manual re-compilation during development
- No hot reload for `.gs.tsx` files
- Generated files clutter source directory

**Tip:** Add `*.tsx` to `.gitignore` if you only write `.gs.tsx`:
```gitignore
# Generated TypeScript files from GoodScript
src/**/*.tsx
!src/**/*.gs.tsx
```

### Option 2: Vite Plugin (Recommended - Coming Soon)

Real-time compilation during development with full hot reload support.

**Setup:**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import goodscript from '@goodscript/vite-plugin';

export default defineConfig({
  plugins: [
    goodscript({
      level: 'clean',  // Language level
      include: ['**/*.gs.ts', '**/*.gs.tsx']
    }),
    react()
  ]
});
```

**How it works:**
1. Vite intercepts `.gs.tsx` files during module resolution
2. GoodScript compiler validates and transforms on-the-fly
3. Generated TypeScript flows into React plugin
4. Full HMR support

**Pros:**
- Seamless development experience
- No generated files in source
- Full hot module reload
- Watch mode built-in

**Cons:**
- Requires plugin installation
- Vite-specific (other plugins needed for webpack/etc)

**Status:** 🚧 Plugin not yet implemented - see [Future Roadmap](#future-roadmap)

### Option 3: Webpack Loader (Coming Soon)

For projects using webpack or Create React App.

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.gs\.tsx?$/,
        use: 'goodscript-loader',
        exclude: /node_modules/
      }
    ]
  }
};
```

**Status:** 📋 Planned

## Example: Converting a React Component

### Before (TypeScript)

```tsx
// Button.tsx - Standard TypeScript
import React from 'react';

function Button(props) {  // ❌ Function declaration
  var label = props.label;  // ❌ var keyword
  
  const handleClick = () => {
    if (props.onClick) {  // ❌ Truthy check
      props.onClick();
    }
  };
  
  return <button onClick={handleClick}>{label}</button>;
}

export default Button;
```

### After (GoodScript)

```tsx
// Button.gs.tsx - GoodScript
const Button = (props: { label: string; onClick?: () => void }) => {
  const label = props.label;  // ✅ const
  
  const handleClick = () => {
    if (props.onClick !== undefined) {  // ✅ Explicit check
      props.onClick();
    }
  };
  
  return <button onClick={handleClick}>{label}</button>;
};

export { Button };  // ✅ Named export
```

**Changes Required:**
- ✅ Use arrow functions instead of `function` declarations
- ✅ Use `const`/`let` instead of `var`
- ✅ Explicit null/undefined checks instead of truthy/falsy
- ✅ Use `===`/`!==` instead of `==`/`!=`
- ✅ Named exports instead of default exports (optional but recommended)

## Type Definitions

GoodScript works with standard React type definitions:

```bash
npm install --save-dev @types/react @types/react-dom
```

No special GoodScript-specific types needed for level "clean"!

## Common Patterns

### Props with Default Values

```tsx
const Greeting = (props: { name: string; greeting?: string }) => {
  const greeting = props.greeting ?? "Hello";  // ✅ Nullish coalescing
  return <h1>{greeting}, {props.name}!</h1>;
};
```

### Conditional Rendering

```tsx
const UserProfile = (props: { user: User | null }) => {
  if (props.user === null) {  // ✅ Explicit null check
    return <div>Not logged in</div>;
  }
  
  return <div>{props.user.name}</div>;
};
```

### Lists and Keys

```tsx
const TodoList = (props: { items: string[] }) => {
  return (
    <ul>
      {props.items.map((item, index) => (
        <li key={index}>{item}</li>  // ✅ for-of in JSX expressions is fine
      ))}
    </ul>
  );
};
```

### Event Handlers

```tsx
const Form = () => {
  const [value, setValue] = useState("");
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);  // ✅ Arrow function
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(value);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input value={value} onChange={handleChange} />
      <button type="submit">Submit</button>
    </form>
  );
};
```

## Mixing GoodScript and TypeScript

You can freely mix `.gs.tsx` and `.tsx` files in the same project:

```tsx
// UserCard.gs.tsx (GoodScript - strict rules)
const UserCard = (props: { name: string }) => {
  return <div>{props.name}</div>;
};

export { UserCard };
```

```tsx
// App.tsx (Regular TypeScript - no restrictions)
import { UserCard } from './UserCard.gs';

function App() {  // Regular function declaration OK in .tsx
  return <UserCard name="Alice" />;
}

export default App;
```

**This enables incremental adoption:**
- Start with one component in `.gs.tsx`
- Gradually migrate more files
- Keep legacy code in `.tsx` until ready

## Troubleshooting

### "Cannot find module './Component.gs'"

TypeScript doesn't recognize `.gs.tsx` extensions by default. Import without extension:

```tsx
// ❌ Don't do this
import { Button } from './Button.gs.tsx';

// ✅ Do this
import { Button } from './Button.gs';
```

And ensure your bundler resolves `.gs.tsx` extensions:

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    extensions: ['.gs.tsx', '.gs.ts', '.tsx', '.ts', '.jsx', '.js']
  }
});
```

### "GS108: Function declarations not allowed"

React components must be arrow functions in GoodScript:

```tsx
// ❌ Not allowed
function MyComponent(props) {
  return <div>...</div>;
}

// ✅ Use this
const MyComponent = (props: Props) => {
  return <div>...</div>;
};
```

### "GS109: any type not allowed"

Avoid `any` - use proper types:

```tsx
// ❌ Not allowed
const Component = (props: any) => { ... };

// ✅ Use this
interface Props {
  name: string;
  age: number;
}

const Component = (props: Props) => { ... };
```

## Framework-Specific Guides

### Next.js

Next.js support requires a custom plugin (not yet available). For now, use the pre-compilation approach:

```json
// package.json
{
  "scripts": {
    "gs:compile": "gsc --out-dir .",
    "prebuild": "npm run gs:compile",
    "build": "next build",
    "predev": "npm run gs:compile",
    "dev": "next dev"
  }
}
```

### Create React App

CRA requires ejecting or using CRACO to add custom webpack loaders. Pre-compilation is recommended:

```json
{
  "scripts": {
    "gs:compile": "gsc --out-dir src",
    "prebuild": "npm run gs:compile",
    "build": "react-scripts build",
    "prestart": "npm run gs:compile",
    "start": "react-scripts start"
  }
}
```

### Remix

Similar to Next.js, use pre-compilation until a Remix-specific plugin is available.

## Future Roadmap

### Short Term
- ✅ JSX/TSX syntax support (Complete)
- ✅ Language level configuration (Complete)
- 🚧 Vite plugin for seamless integration
- 🚧 Watch mode for development

### Medium Term
- 📋 Webpack loader
- 📋 Next.js plugin
- 📋 Remix plugin
- 📋 React documentation examples
- 📋 Create GoodScript App template

### Long Term
- 📋 React DevTools integration
- 📋 ESLint plugin for GoodScript rules
- 📋 Prettier plugin for GoodScript
- 📋 VS Code snippets for React + GoodScript

## Getting Help

- **Documentation**: [GoodScript Language Guide](../LANGUAGE.md)
- **Issues**: [GitHub Issues](https://github.com/fcapolini/goodscript/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fcapolini/goodscript/discussions)

## Example Projects

Coming soon:
- Simple React app with GoodScript
- Next.js blog with GoodScript
- Todo app (GoodScript + React + TypeScript mixed)

---

**Note**: GoodScript's React support is new. Feedback and contributions welcome!
