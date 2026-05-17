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
    const handleKeyDown = (e) => {
      const input = e.target;
      
      if (input.tagName === 'INPUT' && input.type === 'number') {
        const key = e.key;
        
        // Check if it's a Pashto digit
        if (pashtoToEnglishMap[key]) {
          e.preventDefault();
          
          const cursorPosition = input.selectionStart;
          const currentValue = input.value;
          const englishDigit = pashtoToEnglishMap[key];
          
          // Insert the English digit at cursor position
          const newValue = 
            currentValue.slice(0, cursorPosition) + 
            englishDigit + 
            currentValue.slice(cursorPosition);
          
          input.value = newValue;
          
          // Trigger input event to update React state
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
          
          // Move cursor after the inserted digit
          input.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
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

    // Use capture phase to catch events before React
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('paste', handlePaste, true);
    };
  }, []);
};

export default useConvertPashtoDigits;
