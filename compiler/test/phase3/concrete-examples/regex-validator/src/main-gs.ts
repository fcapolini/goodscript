/**
 * RegEx Validator - Demonstrates regex pattern matching and validation
 * 
 * Real-world example showing:
 * - Email validation with regex
 * - URL parsing and validation
 * - Phone number extraction
 * - Date format validation
 * - Password strength checking
 */

class Validator {
  // Email validation
  validateEmail(email: string): boolean {
    const pattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    return pattern.test(email);
  }

  // URL validation
  validateUrl(url: string): boolean {
    const pattern = /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i;
    return pattern.test(url);
  }

  // Extract domain from email
  extractDomain(email: string): string {
    const pattern = /@([a-z0-9.-]+\.[a-z]{2,})$/i;
    const result = email.match(pattern);
    if (result !== null && result !== undefined) {
      return result[1];
    }
    return "";
  }

  // Phone number extraction (US format)
  extractPhoneNumbers(text: string): string[] {
    const pattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const matches = text.match(pattern);
    if (matches !== null && matches !== undefined) {
      return matches;
    }
    return [];
  }

  // Date validation (YYYY-MM-DD)
  validateDate(dateStr: string): boolean {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    return pattern.test(dateStr);
  }

  // Password strength check
  checkPasswordStrength(password: string): string {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    if (hasUpper && hasLower && hasDigit && hasSpecial && isLongEnough) {
      return "strong";
    } else if ((hasUpper || hasLower) && hasDigit && isLongEnough) {
      return "medium";
    } else {
      return "weak";
    }
  }

  // Replace sensitive data (credit card numbers)
  maskCreditCard(text: string): string {
    const pattern = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
    return text.replace(pattern, "****-****-****-****");
  }

  // Extract hashtags from text
  extractHashtags(text: string): string[] {
    const pattern = /#\w+/g;
    const matches = text.match(pattern);
    if (matches !== null && matches !== undefined) {
      return matches;
    }
    return [];
  }

  // Search for keyword position
  findKeyword(text: string, keyword: string): number {
    const pattern = new RegExp(keyword, "i");
    return text.search(pattern);
  }

  // Split text into sentences
  splitSentences(text: string): string[] {
    const pattern = /[.!?]+\s+/;
    return text.split(pattern);
  }
}

const main = (): void => {
  const validator = new Validator();

  // Test email validation
  console.log("=== Email Validation ===");
  console.log(validator.validateEmail("user@example.com"));  // true
  console.log(validator.validateEmail("invalid.email"));      // false
  console.log(validator.extractDomain("john.doe@company.org"));  // company.org

  // Test URL validation
  console.log("=== URL Validation ===");
  console.log(validator.validateUrl("https://example.com"));     // true
  console.log(validator.validateUrl("not-a-url"));               // false

  // Test phone number extraction
  console.log("=== Phone Numbers ===");
  const text1 = "Call me at 555-123-4567 or 555.987.6543";
  const phones = validator.extractPhoneNumbers(text1);
  console.log(phones.length);  // 2
  console.log(phones[0]);      // 555-123-4567
  console.log(phones[1]);      // 555.987.6543

  // Test date validation
  console.log("=== Date Validation ===");
  console.log(validator.validateDate("2025-11-24"));   // true
  console.log(validator.validateDate("11/24/2025"));   // false

  // Test password strength
  console.log("=== Password Strength ===");
  console.log(validator.checkPasswordStrength("weak"));              // weak
  console.log(validator.checkPasswordStrength("Medium123"));         // medium
  console.log(validator.checkPasswordStrength("Strong!123Pass"));    // strong

  // Test credit card masking
  console.log("=== Credit Card Masking ===");
  const text2 = "My card is 1234-5678-9012-3456";
  console.log(validator.maskCreditCard(text2));  // My card is ****-****-****-****

  // Test hashtag extraction
  console.log("=== Hashtags ===");
  const text3 = "Love #coding and #typescript #regex";
  const tags = validator.extractHashtags(text3);
  console.log(tags.length);  // 3
  console.log(tags[0]);      // #coding
  console.log(tags[1]);      // #typescript
  console.log(tags[2]);      // #regex

  // Test keyword search
  console.log("=== Keyword Search ===");
  const text4 = "The quick brown fox jumps";
  console.log(validator.findKeyword(text4, "BROWN"));  // 10 (case-insensitive)
  console.log(validator.findKeyword(text4, "cat"));    // -1 (not found)

  // Test sentence splitting
  console.log("=== Sentence Split ===");
  const text5 = "First sentence. Second one! Third?";
  const sentences = validator.splitSentences(text5);
  console.log(sentences.length);  // 3
  console.log(sentences[0]);      // First sentence
  console.log(sentences[1]);      // Second one
  console.log(sentences[2]);      // Third?
};

main();
