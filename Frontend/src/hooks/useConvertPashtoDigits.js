import { useEffect } from 'react';

const pashtoToEnglishMap = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

const convertPashtoToEnglish = (value) => {
  if (!value) return value;
  return value.replace(/[۰-۹]/g, (match) => pashtoToEnglishMap[match] || match);
};

export const useConvertPashtoDigits = () => {
  useEffect(() => {
    // Set LTR direction for all number inputs
    const setNumberInputsLTR = () => {
      document.querySelectorAll('input[type="number"]').forEach((input) => {
        input.setAttribute('dir', 'ltr');
        input.style.textAlign = 'right';
        input.style.direction = 'ltr';
      });
    };

    // Run on mount and when DOM changes
    setNumberInputsLTR();

    const observer = new MutationObserver(setNumberInputsLTR);
    observer.observe(document.body, { childList: true, subtree: true });

    const handleKeyDown = (e) => {
      const input = e.target;
      
      if (input.tagName === 'INPUT' && input.type === 'number') {
        const key = e.key;
        
        // Check if it's a Pashto digit
        if (pashtoToEnglishMap[key]) {
          e.preventDefault();
          
          const currentValue = input.value;
          const englishDigit = pashtoToEnglishMap[key];
          
          // Append digit at the end (fixes RTL insertion issue)
          const newValue = currentValue + englishDigit;
          
          input.value = newValue;
          
          // Trigger input event to update React state
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
          
          // Move cursor to end
          input.setSelectionRange(newValue.length, newValue.length);
        }
      }
    };

    // Also handle input event to convert Pashto digits to English
    const handleInput = (e) => {
      const input = e.target;
      
      if (input.tagName === 'INPUT' && input.type === 'number') {
        const value = input.value;
        const hasPashtoDigits = /[۰-۹]/.test(value);
        
        if (hasPashtoDigits) {
          const convertedValue = convertPashtoToEnglish(value);
          input.value = convertedValue;
          
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        }
      }
    };

    const handlePaste = (e) => {
      const input = e.target;
      
      if (input.tagName === 'INPUT' && input.type === 'number') {
        const pastedText = e.clipboardData.getData('text');
        const convertedText = convertPashtoToEnglish(pastedText);
        
        if (pastedText !== convertedText) {
          e.preventDefault();
          
          const cursorPosition = input.selectionStart;
          const currentValue = input.value;
          
          // Insert converted text at cursor position
          const newValue = 
            currentValue.slice(0, cursorPosition) + 
            convertedText + 
            currentValue.slice(cursorPosition);
          
          input.value = newValue;
          
          // Trigger input event to update React state
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
          
          // Move cursor after the pasted text
          input.setSelectionRange(
            cursorPosition + convertedText.length, 
            cursorPosition + convertedText.length
          );
        }
      }
    };

    // Handle composition events for mobile IME keyboards
    const handleCompositionEnd = (e) => {
      const input = e.target;
      
      if (input.tagName === 'INPUT' && input.type === 'number') {
        const value = input.value;
        const hasPashtoDigits = /[۰-۹]/.test(value);
        
        if (hasPashtoDigits) {
          const convertedValue = convertPashtoToEnglish(value);
          input.value = convertedValue;
          
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        }
      }
    };

    // Use capture phase to catch events before React
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('compositionend', handleCompositionEnd, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('compositionend', handleCompositionEnd, true);
      observer.disconnect();
    };
  }, []);
};

export default useConvertPashtoDigits;
