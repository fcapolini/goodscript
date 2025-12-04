/**
 * Tests for JSX/TSX support in GoodScript
 * Tests language level "clean" (Phase 1) restrictions with JSX syntax
 */

import { describe, it, expect } from 'vitest';
import { compileSource } from './test-helpers';

describe('JSX/TSX Support', () => {
  it('should accept basic JSX syntax', () => {
    const source = `
      const Greeting = (props: { name: string }) => {
        return <h1>Hello, {props.name}!</h1>;
      };
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    // Should not have GS errors (level "clean" restrictions pass)
    const gsErrors = result.diagnostics.filter(d => d.code?.startsWith('GS'));
    expect(gsErrors).toHaveLength(0);
  });

  it('should accept JSX with arrow function components', () => {
    const source = `
      const Button = (props: { onClick: () => void; label: string }) => {
        return <button onClick={props.onClick}>{props.label}</button>;
      };
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    const gsErrors = result.diagnostics.filter(d => d.code?.startsWith('GS'));
    expect(gsErrors).toHaveLength(0);
  });

  it('should accept JSX with conditional rendering', () => {
    const source = `
      const UserCard = (props: { user: { name: string } | null }) => {
        if (props.user === null) {
          return <div>No user</div>;
        }
        return <div>{props.user.name}</div>;
      };
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    const gsErrors = result.diagnostics.filter(d => d.code?.startsWith('GS'));
    expect(gsErrors).toHaveLength(0);
  });

  it('should accept JSX with array mapping', () => {
    const source = `
      const List = (props: { items: string[] }) => {
        return (
          <ul>
            {props.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
      };
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    const gsErrors = result.diagnostics.filter(d => d.code?.startsWith('GS'));
    expect(gsErrors).toHaveLength(0);
  });

  it('should reject function declarations in JSX files', () => {
    const source = `
      function Component(props: { name: string }) {
        return <h1>{props.name}</h1>;
      }
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    const gsErrors = result.diagnostics.filter(d => d.code === 'GS108');
    expect(gsErrors.length).toBeGreaterThan(0);
  });

  it('should reject var in JSX files', () => {
    const source = `
      const Component = () => {
        var x = 5;
        return <div>{x}</div>;
      };
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    const gsErrors = result.diagnostics.filter(d => d.code === 'GS105');
    expect(gsErrors.length).toBeGreaterThan(0);
  });

  it('should reject == operator in JSX files', () => {
    const source = `
      const Component = (props: { value: number }) => {
        const isZero = props.value == 0;
        return <div>{isZero ? "zero" : "not zero"}</div>;
      };
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    const gsErrors = result.diagnostics.filter(d => d.code === 'GS106');
    expect(gsErrors.length).toBeGreaterThan(0);
  });

  it('should preserve JSX syntax in TypeScript output', () => {
    const source = `
      const Greeting = (props: { name: string }) => {
        return <h1>Hello, {props.name}!</h1>;
      };
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    
    // Check that JSX is preserved in output
    expect(result.output).toContain('<h1>');
    expect(result.output).toContain('{props.name}');
    expect(result.output).toContain('</h1>');
  });

  it('should handle nested JSX elements', () => {
    const source = `
      const Card = (props: { title: string; children: unknown }) => {
        return (
          <div className="card">
            <h2>{props.title}</h2>
            <div className="content">
              {props.children}
            </div>
          </div>
        );
      };
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    const gsErrors = result.diagnostics.filter(d => d.code?.startsWith('GS'));
    expect(gsErrors).toHaveLength(0);
    
    // Verify nested JSX is preserved
    expect(result.output).toContain('<div className="card">');
    expect(result.output).toContain('<h2>');
    expect(result.output).toContain('<div className="content">');
  });

  it('should handle JSX fragments', () => {
    const source = `
      const Fragment = () => {
        return (
          <>
            <div>First</div>
            <div>Second</div>
          </>
        );
      };
    `;
    
    const result = compileSource(source, 'test-gs.tsx');
    const gsErrors = result.diagnostics.filter(d => d.code?.startsWith('GS'));
    expect(gsErrors).toHaveLength(0);
  });
});
