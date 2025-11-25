/**
 * Example: Using the C++ AST to generate code
 * 
 * This example demonstrates how to use the new AST-based C++ code generation
 * to convert a simple TypeScript class to C++.
 */

import { cpp, render } from '../src/cpp';

// Example: Generate a simple Calculator class

const calculatorClass = cpp.class_('Calculator', {
  fields: [
    cpp.field('result', cpp.double(), {
      initializer: cpp.numberLit(0)
    })
  ],
  
  constructors: [
    cpp.constructor_(
      [],
      [cpp.memberInit('result', cpp.numberLit(0))],
      cpp.block()
    )
  ],
  
  methods: [
    // add method
    cpp.method(
      'add',
      cpp.void(),
      [cpp.param('value', cpp.double())],
      cpp.block(
        cpp.exprStmt(
          cpp.assignOp(
            cpp.member(cpp.id('this'), 'result'),
            '+',
            cpp.id('value')
          )
        )
      )
    ),
    
    // subtract method
    cpp.method(
      'subtract',
      cpp.void(),
      [cpp.param('value', cpp.double())],
      cpp.block(
        cpp.exprStmt(
          cpp.assignOp(
            cpp.member(cpp.id('this'), 'result'),
            '-',
            cpp.id('value')
          )
        )
      )
    ),
    
    // getResult method
    cpp.method(
      'getResult',
      cpp.double(),
      [],
      cpp.block(
        cpp.return_(cpp.member(cpp.id('this'), 'result'))
      ),
      { isConst: true }
    )
  ]
});

// Create a complete translation unit
const translationUnit = cpp.translationUnit(
  [cpp.include('gs_runtime.hpp')],
  [
    cpp.namespace('gs', [
      calculatorClass,
      
      // Helper function
      cpp.function(
        'testCalculator',
        cpp.void(),
        [],
        cpp.block(
          cpp.varDecl('calc', cpp.type('Calculator')),
          cpp.exprStmt(
            cpp.call(
              cpp.member(cpp.id('calc'), 'add'),
              [cpp.numberLit(10)]
            )
          ),
          cpp.exprStmt(
            cpp.call(
              cpp.member(cpp.id('calc'), 'subtract'),
              [cpp.numberLit(3)]
            )
          ),
          cpp.exprStmt(
            cpp.call(
              cpp.member(cpp.id('gs::console'), 'log'),
              [
                cpp.call(
                  cpp.member(cpp.id('calc'), 'getResult'),
                  []
                )
              ]
            )
          )
        )
      )
    ])
  ],
  
  // Main function
  cpp.function(
    'main',
    cpp.int(),
    [],
    cpp.block(
      cpp.exprStmt(cpp.call(cpp.id('gs::testCalculator'), [])),
      cpp.return_(cpp.numberLit(0))
    )
  )
);

// Render the complete C++ code
const cppCode = render(translationUnit);

console.log('=== Generated C++ Code ===\n');
console.log(cppCode);
console.log('\n=== End of Generated Code ===');

// Example output validation
if (cppCode.includes('class Calculator')) {
  console.log('✓ Calculator class generated successfully');
}
if (cppCode.includes('void add(double value)')) {
  console.log('✓ add method generated successfully');
}
if (cppCode.includes('namespace gs {')) {
  console.log('✓ namespace wrapping generated successfully');
}
