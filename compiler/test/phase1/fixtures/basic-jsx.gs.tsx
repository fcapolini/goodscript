/**
 * Basic JSX fixture for GoodScript Phase 1
 * Tests that JSX syntax is compatible with Phase 1 restrictions
 * 
 * Note: This file will have TypeScript errors in the IDE because React types
 * are not installed. That's expected - the test is that GoodScript compiler
 * accepts the JSX syntax and validates Phase 1 restrictions.
 */

// Minimal JSX namespace declaration to avoid TypeScript errors
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Simple functional component
const Greeting = (props: { name: string }) => {
  return <h1>Hello, {props.name}!</h1>;
};

// Component with children
const Container = (props: { children: unknown }) => {
  return (
    <div className="container">
      {props.children}
    </div>
  );
};

// Component with conditional rendering
const UserCard = (props: { user: { name: string; email: string } | null }) => {
  if (props.user === null) {
    return <div>No user</div>;
  }
  
  return (
    <div className="user-card">
      <h2>{props.user.name}</h2>
      <p>{props.user.email}</p>
    </div>
  );
};

// Component with array mapping
const List = (props: { items: string[] }) => {
  return (
    <ul>
      {props.items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
};

// Component with event handlers (arrow functions)
const Button = (props: { onClick: () => void; label: string }) => {
  return (
    <button onClick={props.onClick}>
      {props.label}
    </button>
  );
};

// App component composing others
const App = () => {
  const user = { name: "Alice", email: "alice@example.com" };
  const items = ["First", "Second", "Third"];
  
  const handleClick = () => {
    console.log("Button clicked!");
  };
  
  return (
    <Container>
      <Greeting name="World" />
      <UserCard user={user} />
      <List items={items} />
      <Button onClick={handleClick} label="Click me" />
    </Container>
  );
};

export { Greeting, Container, UserCard, List, Button, App };
