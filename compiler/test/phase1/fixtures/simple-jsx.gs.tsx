/**
 * Minimal JSX test that's fully Phase 1 compliant
 * Uses ownership types to satisfy Phase 2
 */

declare namespace JSX {
  interface IntrinsicElements {
    div: any;
    h1: any;
    button: any;
  }
}

// Simple component with unique ownership
const Greeting = (props: Unique<{ name: string }>) => {
  return <h1>Hello, {props.name}!</h1>;
};

// Component with event handler
const Button = (props: Unique<{ onClick: () => void; label: string }>) => {
  return <button onClick={props.onClick}>{props.label}</button>;
};

// App component
const App = () => {
  const handleClick = () => {
    console.log("Clicked!");
  };
  
  return (
    <div>
      <Greeting name="World" />
      <Button onClick={handleClick} label="Click me" />
    </div>
  );
};

export { Greeting, Button, App };
