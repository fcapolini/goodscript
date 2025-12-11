/**
 * Index of all equivalence tests
 * 
 * Exports all test suites for easy discovery and execution
 */

// Import all test suites
import { tests as arithmeticTests } from './basic/arithmetic.test.ts';
import { tests as arraysTests } from './basic/arrays.test.ts';
import { tests as stringsTests } from './basic/strings.test.ts';
import { tests as functionsTests } from './basic/functions.test.ts';
import { tests as controlFlowTests } from './basic/control-flow.test.ts';
import { tests as classesTests } from './basic/classes.test.ts';
import { tests as exceptionsTests } from './basic/exceptions.test.ts';
import { tests as typesTests } from './basic/types.test.ts';
import { tests as templateLiteralsTests } from './basic/template-literals.test.ts';
import { tests as variablesTests } from './basic/variables.test.ts';
import { tests as operatorsTests } from './basic/operators.test.ts';

import { tests as mapTests } from './stdlib/map.test.ts';
import { tests as mathTests } from './stdlib/math.test.ts';
import { tests as dateTests } from './stdlib/date.test.ts';
import { tests as jsonTests } from './stdlib/json.test.ts';
import { tests as arrayMethodsTests } from './stdlib/array-methods.test.ts';

import { tests as emptyCollectionsTests } from './edge-cases/empty-collections.test.ts';
import { tests as numberEdgeCasesTests } from './edge-cases/number-edge-cases.test.ts';
import { tests as stringEdgeCasesTests } from './edge-cases/string-edge-cases.test.ts';
import { tests as booleanLogicTests } from './edge-cases/boolean-logic.test.ts';
import { tests as optionalChainingTests } from './edge-cases/optional-chaining.test.ts';
import { tests as nestedControlFlowTests } from './edge-cases/nested-control-flow.test.ts';

import { tests as asyncAwaitTests } from './integration/async-await.test.ts';
import { tests as recursionTests } from './integration/recursion.test.ts';
import { tests as lambdaClosuresTests } from './integration/lambda-closures.test.ts';
import { tests as functionHoistingTests } from './integration/function-hoisting.test.ts';

// New test suites
import { tests as unionTypesTests } from './basic/union-types.test.ts';
import { tests as objectLiteralsTests } from './basic/object-literals.test.ts';
import { tests as interfacesTests } from './basic/interfaces.test.ts';
import { tests as arrayAdvancedTests } from './stdlib/array-advanced.test.ts';

// Re-export for direct access
export {
  arithmeticTests,
  arraysTests,
  stringsTests,
  functionsTests,
  controlFlowTests,
  classesTests,
  exceptionsTests,
  typesTests,
  templateLiteralsTests,
  variablesTests,
  operatorsTests,
  mapTests,
  mathTests,
  dateTests,
  jsonTests,
  arrayMethodsTests,
  emptyCollectionsTests,
  numberEdgeCasesTests,
  stringEdgeCasesTests,
  booleanLogicTests,
  optionalChainingTests,
  nestedControlFlowTests,
  asyncAwaitTests,
  recursionTests,
  lambdaClosuresTests,
  functionHoistingTests,
  unionTypesTests,
  objectLiteralsTests,
  interfacesTests,
  arrayAdvancedTests
};

/**
 * Get all tests organized by category
 */
export function getAllTests() {
  return {
    basic: {
      arithmetic: arithmeticTests,
      arrays: arraysTests,
      strings: stringsTests,
      functions: functionsTests,
      controlFlow: controlFlowTests,
      classes: classesTests,
      exceptions: exceptionsTests,
      types: typesTests,
      templateLiterals: templateLiteralsTests,
      variables: variablesTests,
      operators: operatorsTests,
      unionTypes: unionTypesTests,
      objectLiterals: objectLiteralsTests,
      interfaces: interfacesTests
    },
    stdlib: {
      map: mapTests,
      math: mathTests,
      date: dateTests,
      json: jsonTests,
      arrayMethods: arrayMethodsTests,
      arrayAdvanced: arrayAdvancedTests
    },
    edgeCases: {
      emptyCollections: emptyCollectionsTests,
      numberEdgeCases: numberEdgeCasesTests,
      stringEdgeCases: stringEdgeCasesTests,
      booleanLogic: booleanLogicTests,
      optionalChaining: optionalChainingTests,
      nestedControlFlow: nestedControlFlowTests
    },
    integration: {
      asyncAwait: asyncAwaitTests,
      recursion: recursionTests,
      lambdaClosures: lambdaClosuresTests,
      functionHoisting: functionHoistingTests
    }
  };
}

/**
 * Get total test count
 */
export function getTestCount(): number {
  const all = getAllTests();
  let count = 0;
  
  for (const category of Object.values(all)) {
    for (const suite of Object.values(category)) {
      count += suite.length;
    }
  }
  
  return count;
}
